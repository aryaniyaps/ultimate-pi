import { access, readFile, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { AutoCommitConfig } from "../lib/auto-commit-core";

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

function setStatus(ctx: ExtensionContext, text: string | undefined) {
	if (!ctx.hasUI) return;
	ctx.ui.setStatus("auto-commit", text);
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

async function ensureTargetBranch(pi: ExtensionAPI, cwd: string, config: AutoCommitConfig): Promise<string | undefined> {
	const current = await resolveCurrentBranch(pi, cwd);
	if (current.length > 0) {
		if (config.branch.strategy === "auto-feature-branch" && isProtectedBranch(current, config.branch.protected)) {
			const next = sanitizeBranchPart(`pi/${current}/${Date.now()}`);
			const sw = await runGit(pi, cwd, ["switch", "-c", next]);
			if (sw.code !== 0) return undefined;
			return next;
		}
		return current;
	}

	const shortSha = (await runGit(pi, cwd, ["rev-parse", "--short", "HEAD"]))?.stdout.trim() || "nohead";
	const created = sanitizeBranchPart(`pi/${Date.now()}-${shortSha}`);
	const sw = await runGit(pi, cwd, ["switch", "-c", created]);
	if (sw.code !== 0) return undefined;
	return created;
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

function buildCommitMessage(config: AutoCommitConfig, paths: string[], trailer: string): string {
	const summary = deriveSummary(paths, config.message.maxSummaryPaths);
	const vars = {
		type: config.message.typeDefault,
		scope: config.message.scopeDefault,
		summary,
		changedFiles: String(paths.length),
		timestamp: new Date().toISOString(),
		body: "",
	};
	let message = renderTemplate(config.message.template, vars).trim();
	if (!message.includes("\n")) {
		message = `${message}\n\n${trailer}`;
	} else if (!message.includes("Co-authored-by:")) {
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
		setStatus(ctx, `disabled(${state.blockedReason})`);
		return;
	}

	const now = Date.now();
	if (now - state.lastCommitAttemptAt < state.config.trigger.cooldownMs) return;
	state.lastCommitAttemptAt = now;

	state.commitInFlight = true;
	setStatus(ctx, `checking(${reason})`);
	try {
		if (!state.config.enabled) {
			setStatus(ctx, "disabled(config)");
			return;
		}

		const inside = await runGit(pi, ctx.cwd, ["rev-parse", "--is-inside-work-tree"]);
		if (inside.code !== 0 || inside.stdout.trim() !== "true") {
			setStatus(ctx, "blocked(not-git-repo)");
			return;
		}

		if (await isGitOperationInProgress(pi, ctx.cwd)) {
			setStatus(ctx, "blocked(git-op-in-progress)");
			return;
		}

		const statusArgs = ["status", "--porcelain"];
		if (state.config.submodules.ignore) statusArgs.push("--ignore-submodules=all");
		const status = await runGit(pi, ctx.cwd, statusArgs);
		if (status.code !== 0) {
			setStatus(ctx, "blocked(status-failed)");
			return;
		}

		const paths = parseChangedPaths(status.stdout);
		if (paths.length === 0) {
			setStatus(ctx, "idle");
			return;
		}
		if (paths.length < state.config.trigger.minChangedFiles) {
			setStatus(ctx, "blocked(threshold)");
			return;
		}

		if (!state.config.dryRun) {
			const requiredGuard = await runGuardCommands(pi, ctx.cwd, state.config.guards.required, state.config.guards.timeoutMs);
			if (!requiredGuard.ok) {
				if (requiredGuard.timedOut && state.config.guards.onTimeout === "skipGuardsCommit") {
					setStatus(ctx, "warning(guard-timeout-skip)");
				} else {
					setStatus(ctx, `blocked(${requiredGuard.details ?? "guard"})`);
					return;
				}
			}

			const optionalGuard = await runGuardCommands(pi, ctx.cwd, state.config.guards.optional, state.config.guards.timeoutMs);
			if (!optionalGuard.ok) {
				setStatus(ctx, `blocked(${optionalGuard.details ?? "optional-guard"})`);
				return;
			}
		}

		if (state.config.dryRun) {
			setStatus(ctx, `dry-run(would-commit:${paths.length})`);
			if (ctx.hasUI) ctx.ui.notify(`[auto-commit] dry-run: would commit ${paths.length} file(s)`, "info");
			return;
		}

		const branch = await ensureTargetBranch(pi, ctx.cwd, state.config);
		if (!branch) {
			setStatus(ctx, "blocked(branch)");
			return;
		}

		const add = await runGit(pi, ctx.cwd, ["add", "-A"]);
		if (add.code !== 0) {
			setStatus(ctx, "blocked(git-add)");
			return;
		}

		if (!state.coAuthorTrailer) {
			setStatus(ctx, "blocked(co-author)");
			return;
		}
		const message = buildCommitMessage(state.config, paths, state.coAuthorTrailer);
		const tempPath = join(tmpdir(), `PI_AUTOCOMMIT_${Date.now()}.msg`);
		await writeFile(tempPath, message, "utf8");
		const commit = await runGit(pi, ctx.cwd, ["commit", "-F", tempPath]);
		await unlink(tempPath).catch(() => { });
		if (commit.code !== 0) {
			if (commit.stderr.includes("nothing to commit") || commit.stdout.includes("nothing to commit")) {
				setStatus(ctx, "idle");
				return;
			}
			setStatus(ctx, "blocked(git-commit)");
			return;
		}

		state.sessionAutoCommitCount += 1;
		setStatus(ctx, `committed(${branch})`);
		if (ctx.hasUI) ctx.ui.notify(`[auto-commit] committed on ${branch}`, "info");

		if (!state.config.autoPush) return;
		const remote = await resolvePushRemote(pi, ctx.cwd, branch);
		if (!state.config.push.allowedRemotes.includes(remote)) {
			setStatus(ctx, `blocked(remote-not-allowed:${remote})`);
			if (ctx.hasUI) ctx.ui.notify(`[auto-commit] push blocked: remote ${remote} not allowed`, "warning");
			return;
		}

		const upstreamExists = await hasUpstream(pi, ctx.cwd);
		const pushArgs = upstreamExists ? ["push", remote, branch] : ["push", "-u", remote, branch];
		const push = await runGit(pi, ctx.cwd, pushArgs, state.config.push.timeoutMs);
		if (push.code !== 0) {
			if ((push.stderr + push.stdout).includes("non-fast-forward")) {
				setStatus(ctx, "blocked(non-fast-forward)");
				return;
			}
			setStatus(ctx, "blocked(push-failed)");
			return;
		}

		setStatus(ctx, `pushed(${remote}/${branch})`);
		if (ctx.hasUI) ctx.ui.notify(`[auto-commit] pushed to ${remote}/${branch}`, "info");
	} catch (error: any) {
		setStatus(ctx, "blocked(error)");
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
		try {
			const loaded = await loadAndValidateConfig(ctx);
			state.config = loaded.config;
			state.configLoaded = true;
			state.coAuthorTrailer = resolveCoAuthorTrailer(state.config);
			const issues = validateMergedConfig(state.config);
			if (issues.length > 0) {
				state.blockedReason = "invalid-config";
				setStatus(ctx, "disabled(invalid-config)");
				if (ctx.hasUI) ctx.ui.notify(`[auto-commit] disabled: ${issues.join("; ")}`, "error");
				return;
			}
			if (state.config.coAuthor.enforce && !state.coAuthorTrailer) {
				state.blockedReason = "co-author-resolution-failed";
				setStatus(ctx, "disabled(co-author-resolution-failed)");
				if (ctx.hasUI) ctx.ui.notify("[auto-commit] disabled: co-author trailer cannot be resolved", "error");
				return;
			}
			setStatus(ctx, state.config.enabled ? "idle" : "disabled(config)");
			if (ctx.hasUI && loaded.sourceNotes.length > 0) {
				ctx.ui.notify(`[auto-commit] config loaded (${loaded.sourceNotes.join(", ")})`, "info");
			}
		} catch (error: any) {
			state.configLoaded = true;
			state.blockedReason = "config-error";
			state.configError = error?.message ?? String(error);
			setStatus(ctx, "disabled(config-error)");
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
