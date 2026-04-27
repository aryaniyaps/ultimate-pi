import { access, readFile, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { AssistantMessage, Context as AIContext, Model } from "@mariozechner/pi-ai";
import type { AutoCommitConfig } from "../lib/auto-commit-core";
import { AutoCommitPaneComponent, createAutoCommitPane } from "./auto-commit-pane";

const require = createRequire(__filename);
const {
	DEFAULT_CONFIG,
	deepClone,
	deriveSummary,
	mergeConfig,
	parseChangedPaths,
	resolveCoAuthorTrailer,
	validateMergedConfig,
} = require("../lib/auto-commit-core.ts") as typeof import("../lib/auto-commit-core");

type GitResult = {
	code: number;
	stdout: string;
	stderr: string;
	killed?: boolean;
};

type RuntimeState = {
	config: AutoCommitConfig;
	configLoaded: boolean;
	configError?: string;
	coAuthorTrailer?: string;
	blockedReason?: string;
	commitInFlight: boolean;
	lastCommitAttemptAt: number;
	sessionAutoCommitCount: number;
	idleTimer?: ReturnType<typeof setTimeout>;
	pane?: AutoCommitPaneComponent | null;
};

type AiCommitPlan = {
	type: string;
	scope: string;
	summary: string;
	details: string[];
	branchSlug: string;
};

async function readJson(path: string): Promise<any> {
	const raw = await readFile(path, "utf8");
	return JSON.parse(raw);
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

function isProtectedBranch(branch: string, patterns: string[]): boolean {
	for (const pattern of patterns) {
		if (pattern.endsWith("/*")) {
			const prefix = pattern.slice(0, -1);
			if (branch.startsWith(prefix)) return true;
			continue;
		}
		if (branch === pattern) return true;
	}
	return false;
}

function sanitizeBranchPart(value: string): string {
	return value.replace(/[^a-zA-Z0-9._/-]+/g, "-").replace(/-+/g, "-").replace(/^[-/]+|[-/]+$/g, "");
}

function renderTemplate(template: string, vars: Record<string, string>): string {
	return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => vars[k] ?? "");
}

async function runGit(pi: ExtensionAPI, cwd: string, args: string[], timeout?: number): Promise<GitResult> {
	const result = await pi.exec("git", args, { cwd, timeout });
	return {
		code: result.code,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
		killed: result.killed,
	};
}

const ANSI = {
	reset: "\u001b[0m",
	red: "\u001b[31m",
	yellow: "\u001b[33m",
	green: "\u001b[32m",
	cyan: "\u001b[36m",
	gray: "\u001b[90m",
} as const;

function colorizeStatus(text: string): string {
	if (text.startsWith("blocked(")) return `${ANSI.red}${text}${ANSI.reset}`;
	if (text.startsWith("warning(")) return `${ANSI.yellow}${text}${ANSI.reset}`;
	if (text.startsWith("committed(") || text.startsWith("pushed(")) return `${ANSI.green}${text}${ANSI.reset}`;
	if (text.startsWith("checking(")) return `${ANSI.cyan}${text}${ANSI.reset}`;
	if (text.startsWith("dry-run(")) return `${ANSI.yellow}${text}${ANSI.reset}`;
	if (text.startsWith("disabled(") || text === "idle") return `${ANSI.gray}${text}${ANSI.reset}`;
	return text;
}

function setStatus(ctx: ExtensionContext, text: string | undefined, state?: RuntimeState) {
	if (!ctx.hasUI) return;
	ctx.ui.setStatus("auto-commit", text ? colorizeStatus(text) : undefined);
	if (state?.pane) {
		state.pane.updateState({
			status: text ?? "idle",
			commitInFlight: state.commitInFlight,
			enabled: state.config.enabled,
			dryRun: state.config.dryRun,
			aiEnabled: state.config.ai.enabled,
			sessionCommits: state.sessionAutoCommitCount,
			blockedReason: state.blockedReason,
			configError: state.configError,
			lastBranch: undefined, // updated separately on commit success
		});
	}
}

async function loadAndValidateConfig(ctx: ExtensionContext): Promise<{ config: AutoCommitConfig; sourceNotes: string[] }> {
	const globalPath = join(homedir(), ".pi", "agent", "auto-commit.json");
	const projectPath = join(ctx.cwd, ".pi", "auto-commit.json");
	const notes: string[] = [];

	let globalCfg: any = {};
	let projectCfg: any = {};

	if (await pathExists(globalPath)) {
		try {
			globalCfg = await readJson(globalPath);
			notes.push(`global:${globalPath}`);
		} catch (error: any) {
			throw new Error(`Malformed global config (${globalPath}): ${error.message}`);
		}
	}

	if (await pathExists(projectPath)) {
		try {
			projectCfg = await readJson(projectPath);
			notes.push(`project:${projectPath}`);
		} catch (error: any) {
			throw new Error(`Malformed project config (${projectPath}): ${error.message}`);
		}
	}

	const config = mergeConfig(globalCfg, projectCfg);
	return { config, sourceNotes: notes };
}

async function isGitOperationInProgress(pi: ExtensionAPI, cwd: string): Promise<boolean> {
	const markers = ["MERGE_HEAD", "REBASE_HEAD", "CHERRY_PICK_HEAD", "BISECT_LOG"];
	for (const marker of markers) {
		const markerPathResult = await runGit(pi, cwd, ["rev-parse", "--git-path", marker]);
		if (markerPathResult.code !== 0) continue;
		if (await pathExists(markerPathResult.stdout.trim())) return true;
	}
	return false;
}

async function resolveCurrentBranch(pi: ExtensionAPI, cwd: string): Promise<string> {
	const branch = await runGit(pi, cwd, ["branch", "--show-current"]);
	return branch.stdout.trim();
}

function toSlug(value: string): string {
	return sanitizeBranchPart(value.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-"));
}

function summarizePathsForBranch(paths: string[]): string {
	const summary = deriveSummary(paths, 2).replace(/^update\s+/i, "");
	const slug = toSlug(summary.replace(/[\/]/g, "-"));
	return slug.length > 0 ? slug : "workspace-update";
}

const GIT_RESERVED_NAMES = new Set([
	"HEAD", "FETCH_HEAD", "ORIG_HEAD", "MERGE_HEAD",
	"REBASE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD",
	"BISECT_LOG", "BISECT_NAMES", "BISECT_TERMS",
	"AUTOMERGE_MSG", "COMMIT_EDITMSG", "TAG_EDITMSG",
	"MERGE_MSG", "SQUASH_MSG",
]);

const MAX_BRANCH_LENGTH = 100;

function isGitReservedName(name: string): boolean {
	const lower = name.toLowerCase();
	for (const reserved of GIT_RESERVED_NAMES) {
		if (lower === reserved.toLowerCase()) return true;
	}
	if (lower.endsWith(".lock")) return true;
	if (lower.includes("..")) return true;
	if (lower.startsWith(".") || lower.endsWith(".")) return true;
	return false;
}

function validateBranchName(name: string): boolean {
	if (!name || name.length === 0) return false;
	if (name.length > MAX_BRANCH_LENGTH) return false;
	if (isGitReservedName(name)) return false;
	if (/[\s~\^:?*\\||]/.test(name)) return false;
	if (name.includes("//")) return false;
	if (/[\x00-\x1f\x7f]/.test(name)) return false;
	if (name.endsWith("/")) return false;
	return true;
}

async function branchExistsRemotely(pi: ExtensionAPI, cwd: string, branchName: string): Promise<boolean> {
	const remotes = await runGit(pi, cwd, ["remote"]);
	if (remotes.code !== 0) return false;
	const remoteNames = remotes.stdout.trim().split("\n").filter((r) => r.trim().length > 0);
	for (const remote of remoteNames) {
		const check = await runGit(pi, cwd, ["show-ref", "--verify", `refs/remotes/${remote}/${branchName}`]);
		if (check.code === 0 && check.stdout.trim().length > 0) return true;
	}
	return false;
}

async function createUniqueBranch(pi: ExtensionAPI, cwd: string, baseName: string): Promise<string | undefined> {
	const base = sanitizeBranchPart(baseName);
	if (!base) return undefined;
	if (!validateBranchName(base)) return undefined;

	for (let i = 1; i <= 20; i += 1) {
		const candidate = i === 1 ? base : `${base}-${i}`;
		if (!validateBranchName(candidate)) continue;
		if (await branchExistsRemotely(pi, cwd, candidate)) continue;
		const sw = await runGit(pi, cwd, ["switch", "-c", candidate]);
		if (sw.code === 0) return candidate;

		const output = `${sw.stdout}\n${sw.stderr}`.toLowerCase();
		const collision = output.includes("already exists") || output.includes("a branch named") || output.includes("not a commit");
		if (!collision) return undefined;
	}

	const emergency = sanitizeBranchPart(`${base}-${Date.now()}`);
	if (!validateBranchName(emergency)) return undefined;
	const sw = await runGit(pi, cwd, ["switch", "-c", emergency]);
	if (sw.code !== 0) return undefined;
	return emergency;
}

async function ensureTargetBranch(
	pi: ExtensionAPI,
	cwd: string,
	config: AutoCommitConfig,
	paths: string[],
	aiPlan?: AiCommitPlan,
): Promise<string | undefined> {
	const current = await resolveCurrentBranch(pi, cwd);
	const smartSlug = toSlug(aiPlan?.branchSlug || "") || summarizePathsForBranch(paths);

	if (current.length > 0) {
		if (config.branch.strategy === "auto-feature-branch" && isProtectedBranch(current, config.branch.protected)) {
			return createUniqueBranch(pi, cwd, `pi/${current}/${smartSlug}`);
		}
		return current;
	}

	const shortSha = (await runGit(pi, cwd, ["rev-parse", "--short", "HEAD"]))?.stdout.trim() || "nohead";
	return createUniqueBranch(pi, cwd, `pi/${smartSlug}-${shortSha}`);
}

async function resolvePushRemote(pi: ExtensionAPI, cwd: string, branch: string): Promise<string> {
	const branchPushRemote = await runGit(pi, cwd, ["config", "--get", `branch.${branch}.pushRemote`]);
	if (branchPushRemote.code === 0 && branchPushRemote.stdout.trim().length > 0) return branchPushRemote.stdout.trim();

	const remotePushDefault = await runGit(pi, cwd, ["config", "--get", "remote.pushDefault"]);
	if (remotePushDefault.code === 0 && remotePushDefault.stdout.trim().length > 0) return remotePushDefault.stdout.trim();

	const branchRemote = await runGit(pi, cwd, ["config", "--get", `branch.${branch}.remote`]);
	if (branchRemote.code === 0 && branchRemote.stdout.trim().length > 0) return branchRemote.stdout.trim();

	return "origin";
}

async function hasUpstream(pi: ExtensionAPI, cwd: string): Promise<boolean> {
	const upstream = await runGit(pi, cwd, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
	return upstream.code === 0;
}

function readAssistantText(message: AssistantMessage): string {
	return message.content
		.filter((part): part is { type: "text"; text: string } => part.type === "text")
		.map((part) => part.text)
		.join("\n")
		.trim();
}

function stripMarkdownFences(raw: string): string {
	let text = raw;
	text = text.replace(/^```(?:json|JSON)?\s*\n?/gm, "");
	text = text.replace(/\n?```$/gm, "");
	return text.trim();
}

function parseFirstJsonObject(raw: string): any | undefined {
	const stripped = stripMarkdownFences(raw);
	const start = stripped.indexOf("{");
	const end = stripped.lastIndexOf("}");
	if (start < 0 || end <= start) return undefined;
	try {
		return JSON.parse(stripped.slice(start, end + 1));
	} catch {
		return undefined;
	}
}

function sanitizeCommitLine(value: string, fallback: string): string {
	const cleaned = value.replace(/[\r\n]+/g, " ").trim();
	return cleaned.length > 0 ? cleaned : fallback;
}

function normalizeAiPlan(raw: any, config: AutoCommitConfig, paths: string[]): AiCommitPlan | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const summaryFallback = deriveSummary(paths, config.message.maxSummaryPaths);

	let type = sanitizeCommitLine(String(raw.type ?? ""), config.message.typeDefault);
	if (!VALID_COMMIT_TYPES.has(type)) type = config.message.typeDefault;

	const scope = sanitizeCommitLine(String(raw.scope ?? ""), config.message.scopeDefault);
	const summary = sanitizeCommitLine(String(raw.summary ?? ""), summaryFallback);

	const details = Array.isArray(raw.details)
		? raw.details
				.map((d: unknown) => sanitizeCommitLine(String(d ?? ""), ""))
				.filter((d: string) => d.length > 0)
				.slice(0, 6)
		: [];

	const rawBranch = String(raw.branch ?? raw.branchSlug ?? "").trim();
	const branchSlug = (() => {
		if (!rawBranch) return summarizePathsForBranch(paths);
		const slug = toSlug(rawBranch);
		if (slug.length < 2) return summarizePathsForBranch(paths);
		if (isGitReservedName(slug)) return summarizePathsForBranch(paths);
		return slug;
	})();

	return {
		type,
		scope,
		summary,
		details,
		branchSlug,
	};
}

async function fetchRecentCommits(pi: ExtensionAPI, cwd: string, count: number): Promise<string> {
	const log = await runGit(pi, cwd, ["log", "--no-color", "--oneline", `-n${count}`]);
	if (log.code !== 0 || log.stdout.trim().length === 0) return "<no commits yet>";
	return log.stdout.trim();
}

const VALID_COMMIT_TYPES = new Set([
	"feat", "fix", "refactor", "docs", "style", "test", "chore",
	"perf", "ci", "build", "revert", "improvement",
]);

function deriveCommitType(paths: string[], diffStat: string): string {
	const allPaths = paths.map((p) => p.toLowerCase()).join(" ");
	const statLower = diffStat.toLowerCase();
	if (allPaths.includes("test") || statLower.includes("_test.") || statLower.includes("test_")) return "test";
	if (allPaths.includes(".md") && !allPaths.includes(".ts")) return "docs";
	if (allPaths.includes(".yml") || allPaths.includes(".yaml") || allPaths.includes("ci")) return "ci";
	if (statLower.includes("rename") || statLower.includes("move")) return "refactor";
	if (allPaths.includes("package.json") || allPaths.includes("tsconfig")) return "build";
	return "";
}

async function buildAiCommitPlan(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	config: AutoCommitConfig,
	paths: string[],
): Promise<AiCommitPlan | undefined> {
	if (!config.ai.enabled || !ctx.model) return undefined;

	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(ctx.model as Model<any>);
	if (!auth.ok) return undefined;

	const diffStat = await runGit(pi, ctx.cwd, ["diff", "--no-color", "--stat"]);
	const diffPatch = await runGit(pi, ctx.cwd, ["diff", "--no-color"]);
	if (diffPatch.code !== 0) return undefined;

	const cappedPatch = diffPatch.stdout.slice(0, config.ai.maxDiffChars);
	const projectName = ctx.cwd.split("/").pop() || "project";
	const recentCommits = await fetchRecentCommits(pi, ctx.cwd, 8);
	const guessedType = deriveCommitType(paths, diffStat.stdout);

	const promptLines = [
		`You create git commit metadata for the "${projectName}" project.`,
		"",
		"Return strict JSON only. No markdown fences. No commentary. No explanation. Just the JSON object.",
		"",
		"Schema:",
		'{"type":"<conventional-commit-type>","scope":"<scope>","summary":"<imperative-summary-max-72-chars>","details":["<bullet>","<bullet>"],"branch":"<descriptive-kebab-slug>"}',
		"",
		"Rules:",
		"- type must be one of: feat, fix, refactor, docs, style, test, chore, perf, ci, build, revert, improvement",
		"- scope: single word representing the primary area of change (e.g. auth, ui, api, config)",
		"- summary: specific imperative mood, max 72 chars, describe what the change DOES not what files changed",
		"- details: 2-6 concise bullets explaining what changed and WHY, not just listing files",
		"- branch: a descriptive kebab-case name reflecting the PURPOSE of the change, not just file names. Examples: add-user-auth, fix-memory-leak, refactor-config-loader, not: update-src-index-ts",
		"- branch must NOT include type prefix (no feat/ or fix/), just the descriptive slug",
	];

	if (recentCommits !== "<no commits yet>") {
		promptLines.push("", "Recent commits for style reference:", recentCommits);
	}
	if (guessedType) {
		promptLines.push("", `Hint: the diff suggests type "${guessedType}" but you must judge independently.`);
	}

	promptLines.push(
		"",
		`Changed paths (${paths.length}): ${paths.join(", ")}`,
		diffStat.stdout.trim().length > 0 ? `Diffstat:\n${diffStat.stdout.trim()}` : "Diffstat: <none>",
		`Patch (truncated):\n${cappedPatch}`,
	);

	const prompt = promptLines.join("\n");

	try {
		const { completeSimple } = await import("@mariozechner/pi-ai");
		const aiContext: AIContext = {
			messages: [{ role: "user", content: prompt, timestamp: Date.now() }],
		};
		const response = await completeSimple(ctx.model as Model<any>, aiContext, {
			apiKey: auth.apiKey,
			headers: auth.headers,
			timeoutMs: config.ai.timeoutMs,
			maxTokens: 900,
			reasoning: "minimal",
		});
		const rawText = readAssistantText(response);
		const parsed = parseFirstJsonObject(rawText);
		return normalizeAiPlan(parsed, config, paths);
	} catch {
		return undefined;
	}
}

async function buildAiCommitPlanWithRetry(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	config: AutoCommitConfig,
	paths: string[],
): Promise<AiCommitPlan | undefined> {
	let lastError: unknown = undefined;
	for (let attempt = 0; attempt <= config.ai.retries; attempt += 1) {
		if (attempt > 0) {
			await new Promise<void>((resolve) => setTimeout(resolve, config.ai.retryDelayMs * attempt));
		}
		const plan = await buildAiCommitPlan(pi, ctx, config, paths);
		if (plan) return plan;
	}
	return undefined;
}

function buildCommitMessage(config: AutoCommitConfig, paths: string[], trailer: string, aiPlan?: AiCommitPlan): string {
	const summary = aiPlan?.summary || deriveSummary(paths, config.message.maxSummaryPaths);
	const body = (aiPlan?.details ?? []).map((line) => `- ${line}`).join("\n");
	const vars = {
		type: aiPlan?.type || config.message.typeDefault,
		scope: aiPlan?.scope || config.message.scopeDefault,
		summary,
		changedFiles: String(paths.length),
		timestamp: new Date().toISOString(),
		body,
	};
	let message = renderTemplate(config.message.template, vars).trim();
	if (body.length > 0) {
		message = `${message}\n\n${body}`;
	}
	if (!message.includes("Co-authored-by:")) {
		message = `${message}\n\n${trailer}`;
	}
	return message;
}

async function runGuardCommands(
	pi: ExtensionAPI,
	cwd: string,
	commands: string[],
	timeoutMs: number,
): Promise<{ ok: boolean; timedOut: boolean; details?: string }> {
	for (const command of commands) {
		const guard = await pi.exec("bash", ["-lc", command], { cwd, timeout: timeoutMs });
		if (guard.killed) {
			return { ok: false, timedOut: true, details: `guard timeout: ${command}` };
		}
		if (guard.code !== 0) {
			return {
				ok: false,
				timedOut: false,
				details: `guard failed: ${command}\n${(guard.stderr || guard.stdout || "").trim().slice(0, 500)}`,
			};
		}
	}
	return { ok: true, timedOut: false };
}

async function evaluateAndMaybeCommit(reason: string, pi: ExtensionAPI, ctx: ExtensionContext, state: RuntimeState) {
	if (!state.configLoaded || state.commitInFlight) return;
	if (state.blockedReason) {
		setStatus(ctx, `disabled(${state.blockedReason})`, state);
		return;
	}

	const now = Date.now();
	if (now - state.lastCommitAttemptAt < state.config.trigger.cooldownMs) return;
	state.lastCommitAttemptAt = now;

	state.commitInFlight = true;
	setStatus(ctx, `checking(${reason})`, state);
	try {
		if (!state.config.enabled) {
			setStatus(ctx, "disabled(config)", state);
			return;
		}

		const inside = await runGit(pi, ctx.cwd, ["rev-parse", "--is-inside-work-tree"]);
		if (inside.code !== 0 || inside.stdout.trim() !== "true") {
			setStatus(ctx, "blocked(not-git-repo)", state);
			return;
		}

		if (await isGitOperationInProgress(pi, ctx.cwd)) {
			setStatus(ctx, "blocked(git-op-in-progress)", state);
			return;
		}

		const statusArgs = ["status", "--porcelain"];
		if (state.config.submodules.ignore) statusArgs.push("--ignore-submodules=all");
		const status = await runGit(pi, ctx.cwd, statusArgs);
		if (status.code !== 0) {
			setStatus(ctx, "blocked(status-failed)", state);
			return;
		}

		const paths = parseChangedPaths(status.stdout);
		if (paths.length === 0) {
			setStatus(ctx, "idle", state);
			return;
		}
		if (paths.length < state.config.trigger.minChangedFiles) {
			setStatus(ctx, "blocked(threshold)", state);
			return;
		}

		if (!state.config.dryRun) {
			const requiredGuard = await runGuardCommands(pi, ctx.cwd, state.config.guards.required, state.config.guards.timeoutMs);
			if (!requiredGuard.ok) {
				if (requiredGuard.timedOut && state.config.guards.onTimeout === "skipGuardsCommit") {
					setStatus(ctx, "warning(guard-timeout-skip)", state);
				} else {
					setStatus(ctx, `blocked(${requiredGuard.details ?? "guard"})`, state);
					return;
				}
			}

			const optionalGuard = await runGuardCommands(pi, ctx.cwd, state.config.guards.optional, state.config.guards.timeoutMs);
			if (!optionalGuard.ok) {
				setStatus(ctx, `blocked(${optionalGuard.details ?? "optional-guard"})`, state);
				return;
			}
		}

		if (state.config.dryRun) {
			setStatus(ctx, `dry-run(would-commit:${paths.length})`, state);
			if (ctx.hasUI) ctx.ui.notify(`[auto-commit] dry-run: would commit ${paths.length} file(s)`, "info");
			return;
		}

		const aiPlan = await buildAiCommitPlanWithRetry(pi, ctx, state.config, paths);
		const branch = await ensureTargetBranch(pi, ctx.cwd, state.config, paths, aiPlan);
		if (!branch) {
			setStatus(ctx, "blocked(branch)", state);
			return;
		}

		const add = await runGit(pi, ctx.cwd, ["add", "-A"]);
		if (add.code !== 0) {
			setStatus(ctx, "blocked(git-add)", state);
			return;
		}

		if (!state.coAuthorTrailer) {
			setStatus(ctx, "blocked(co-author)", state);
			return;
		}
		const message = buildCommitMessage(state.config, paths, state.coAuthorTrailer, aiPlan);
		const tempPath = join(tmpdir(), `PI_AUTOCOMMIT_${Date.now()}.msg`);
		await writeFile(tempPath, message, "utf8");
		const commit = await runGit(pi, ctx.cwd, ["commit", "-F", tempPath]);
		await unlink(tempPath).catch(() => { });
		if (commit.code !== 0) {
			if (commit.stderr.includes("nothing to commit") || commit.stdout.includes("nothing to commit")) {
				setStatus(ctx, "idle", state);
				return;
			}
			setStatus(ctx, "blocked(git-commit)", state);
			return;
		}

		state.sessionAutoCommitCount += 1;
		setStatus(ctx, `committed(${branch})`, state);
		state.pane?.updateState({ lastBranch: branch, sessionCommits: state.sessionAutoCommitCount });
		if (ctx.hasUI) ctx.ui.notify(`[auto-commit] committed on ${branch}`, "info");

		if (!state.config.autoPush) return;
		const remote = await resolvePushRemote(pi, ctx.cwd, branch);
		if (!state.config.push.allowedRemotes.includes(remote)) {
			setStatus(ctx, `blocked(remote-not-allowed:${remote})`, state);
			if (ctx.hasUI) ctx.ui.notify(`[auto-commit] push blocked: remote ${remote} not allowed`, "warning");
			return;
		}

		const upstreamExists = await hasUpstream(pi, ctx.cwd);
		const pushArgs = upstreamExists ? ["push", remote, branch] : ["push", "-u", remote, branch];
		let push = await runGit(pi, ctx.cwd, pushArgs, state.config.push.timeoutMs);
		if (push.code !== 0 && (push.stderr + push.stdout).includes("non-fast-forward")) {
			const fetch = await runGit(pi, ctx.cwd, ["fetch", remote, branch], state.config.push.timeoutMs);
			if (fetch.code === 0) {
				const rebase = await runGit(pi, ctx.cwd, ["rebase", `${remote}/${branch}`], state.config.push.timeoutMs);
				if (rebase.code === 0) {
					push = await runGit(pi, ctx.cwd, ["push", "-u", remote, branch], state.config.push.timeoutMs);
				} else {
					await runGit(pi, ctx.cwd, ["rebase", "--abort"], 5_000);
					setStatus(ctx, "blocked(rebase-conflict)", state);
					if (ctx.hasUI) ctx.ui.notify("[auto-commit] push conflict needs manual resolution", "warning");
					return;
				}
			}
		}
		if (push.code !== 0) {
			if ((push.stderr + push.stdout).includes("non-fast-forward")) {
				setStatus(ctx, "blocked(non-fast-forward)", state);
				return;
			}
			setStatus(ctx, "blocked(push-failed)", state);
			return;
		}

		setStatus(ctx, `pushed(${remote}/${branch})`, state);
		state.pane?.updateState({ lastBranch: `${remote}/${branch}` });
		if (ctx.hasUI) ctx.ui.notify(`[auto-commit] pushed to ${remote}/${branch}`, "info");
	} catch (error: any) {
		setStatus(ctx, "blocked(error)", state);
		if (ctx.hasUI) ctx.ui.notify(`[auto-commit] error: ${error?.message ?? String(error)}`, "error");
	} finally {
		state.commitInFlight = false;
	}
}

export default function (pi: ExtensionAPI) {
	const state: RuntimeState = {
		config: deepClone(DEFAULT_CONFIG),
		configLoaded: false,
		commitInFlight: false,
		lastCommitAttemptAt: 0,
		sessionAutoCommitCount: 0,
	};

	function clearIdleTimer() {
		if (!state.idleTimer) return;
		clearTimeout(state.idleTimer);
		state.idleTimer = undefined;
	}

	function scheduleIdle(ctx: ExtensionContext) {
		clearIdleTimer();
		state.idleTimer = setTimeout(() => {
			void evaluateAndMaybeCommit("idle", pi, ctx, state);
		}, state.config.trigger.idleMs);
	}

	pi.on("session_start", async (_event, ctx) => {
		clearIdleTimer();
		state.sessionAutoCommitCount = 0;
		state.blockedReason = undefined;

		// Set up the right-side overlay pane
		if (ctx.hasUI) {
			try {
				ctx.ui.setWidget("auto-commit-pane", (tui, theme) => {
					const handle = createAutoCommitPane(tui, theme);
					state.pane = handle.component;
					state.pane.updateState({ status: "idle", enabled: false, dryRun: true, aiEnabled: true, commitInFlight: false, sessionCommits: 0 });
					return handle;
				}, { placement: "aboveEditor" });
			} catch {
				// overlay may not be supported in all modes; degrade gracefully
			}
		}

		try {
			const loaded = await loadAndValidateConfig(ctx);
			state.config = loaded.config;
			state.configLoaded = true;
			state.coAuthorTrailer = resolveCoAuthorTrailer(state.config);
			const issues = validateMergedConfig(state.config);
			if (issues.length > 0) {
				state.blockedReason = "invalid-config";
				setStatus(ctx, "disabled(invalid-config)", state);
				if (ctx.hasUI) ctx.ui.notify(`[auto-commit] disabled: ${issues.join("; ")}`, "error");
				return;
			}
			if (state.config.coAuthor.enforce && !state.coAuthorTrailer) {
				state.blockedReason = "co-author-resolution-failed";
				setStatus(ctx, "disabled(co-author-resolution-failed)", state);
				if (ctx.hasUI) ctx.ui.notify("[auto-commit] disabled: co-author trailer cannot be resolved", "error");
				return;
			}
			setStatus(ctx, state.config.enabled ? "idle" : "disabled(config)", state);
			if (ctx.hasUI && loaded.sourceNotes.length > 0) {
				ctx.ui.notify(`[auto-commit] config loaded (${loaded.sourceNotes.join(", ")})`, "info");
			}
		} catch (error: any) {
			state.configLoaded = true;
			state.blockedReason = "config-error";
			state.configError = error?.message ?? String(error);
			setStatus(ctx, "disabled(config-error)", state);
			if (ctx.hasUI) ctx.ui.notify(`[auto-commit] disabled: ${state.configError}`, "error");
		}
	});

	pi.on("turn_end", async (_event, ctx) => {
		if (!state.configLoaded) return;
		if (state.config.trigger.mode === "turn_end" || state.config.trigger.mode === "hybrid") {
			await evaluateAndMaybeCommit("turn_end", pi, ctx, state);
		}
		if (state.config.trigger.mode === "idle" || state.config.trigger.mode === "hybrid") {
			scheduleIdle(ctx);
		}
	});

	pi.on("session_shutdown", async (event: any, ctx) => {
		clearIdleTimer();
		// Clean up the pane overlay
		if (state.pane) {
			state.pane = null;
		}
		if (ctx.hasUI) {
			ctx.ui.setWidget("auto-commit-pane", undefined);
		}
		if (!state.configLoaded || !state.config.fallbackOnShutdown) return;
		if (event?.reason !== "quit") return;
		if (state.sessionAutoCommitCount > 0) return;
		if (state.config.trigger.mode !== "shutdown" && state.config.trigger.mode !== "hybrid") return;
		await evaluateAndMaybeCommit("shutdown", pi, ctx, state);
	});

	pi.registerCommand("auto-commit-status", {
		description: "Show auto-commit orchestrator runtime state",
		handler: async (_args, ctx) => {
			const summary = {
				enabled: state.config.enabled,
				dryRun: state.config.dryRun,
				autoPush: state.config.autoPush,
				aiEnabled: state.config.ai.enabled,
				mode: state.config.trigger.mode,
				blockedReason: state.blockedReason,
				commitInFlight: state.commitInFlight,
				sessionAutoCommitCount: state.sessionAutoCommitCount,
				coAuthorTrailer: state.coAuthorTrailer,
			};
			if (ctx.hasUI) ctx.ui.notify(`[auto-commit] ${JSON.stringify(summary)}`, "info");
		},
	});

	pi.registerCommand("auto-commit-validate-config", {
		description: "Validate merged auto-commit config and report issues",
		handler: async (_args, ctx) => {
			try {
				const loaded = await loadAndValidateConfig(ctx);
				const issues = validateMergedConfig(loaded.config);
				if (issues.length === 0) {
					if (ctx.hasUI) ctx.ui.notify("[auto-commit] config valid", "info");
					return;
				}
				if (ctx.hasUI) ctx.ui.notify(`[auto-commit] config invalid: ${issues.join("; ")}`, "error");
			} catch (error: any) {
				if (ctx.hasUI) ctx.ui.notify(`[auto-commit] config parse error: ${error?.message ?? String(error)}`, "error");
			}
		},
	});
}
