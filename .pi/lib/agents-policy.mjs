/**
 * agents.policy.yaml loader — package + project merge (SSOT for agent tools).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { parse as parseYaml } from "yaml";

const BUILTIN_DENY_TOOLS = new Set([
	"subagent",
	"Agent",
	"get_subagent_result",
	"steer_subagent",
	"blackboard",
]);

/** Debate inspectors may only run ast-grep via bash (no repo-wide shell exploration). */
const DEBATE_SG_BASH_ALLOW = /^\s*sg\s+(-p|--pattern)\s+/;

const PLANNING_BASH_DENY_PATTERNS = [
	/\bgraphify\s+update\b/i,
	/\bgraphify\s+extract\b/i,
	/\bgraphify\s+install\b/i,
	/\bccc\s+(index|init|reset|daemon)\b/i,
	/\bccc\s+search\b.*--refresh/i,
	/\bpip\s+install\b/i,
	/\buv\s+tool\s+install\b/i,
	/\bnpm\s+install\b/i,
];

const PLANNING_ARTIFACT_JSON_WRITE = /artifacts\/[^\s'"`;]+\.json\b/i;

const MUTATING_TOOLS = new Set(["write", "edit"]);

/** Blind R1: hypothesis-validator may only read task + hypothesis brief. */
const AGENT_READ_PATH_ALLOW = {
	"harness/planning/hypothesis-validator": [
		"artifacts/task-clarification.yaml",
		"artifacts/hypothesis.yaml",
	],
};

function normalizeReadToolPath(toolInput) {
	const raw = String(
		toolInput.path ?? toolInput.file_path ?? toolInput.filePath ?? "",
	).replace(/\\/g, "/");
	if (!raw.trim()) return "";
	const idx = raw.indexOf("artifacts/");
	if (idx >= 0) return raw.slice(idx);
	return raw.replace(/^\.\//, "");
}

function deniesAgentReadPath(agentId, toolInput) {
	const allowed = AGENT_READ_PATH_ALLOW[agentId];
	if (!allowed) return false;
	const rel = normalizeReadToolPath(toolInput);
	if (!rel) return true;
	return !allowed.includes(rel);
}

const cache = new Map();

const EXTENSION_BUNDLE_MODULES = {
	executor: [
		"subagent-governance.ts",
		"harness-anchored-edit.ts",
		"harness-lens.ts",
	],
};

export function packageAgentsPolicyPath(packageRoot) {
	return join(packageRoot, ".pi", "harness", "agents.policy.yaml");
}

/** Absolute paths for subprocess `-e` loads (curated; avoids parent-only extensions). */
export function resolveExtensionBundlePaths(packageRoot, bundleName) {
	const modules = EXTENSION_BUNDLE_MODULES[bundleName];
	if (!modules) return [];
	const extDir = join(packageRoot, ".pi", "extensions");
	return modules.map((name) => join(extDir, name));
}

export function projectAgentsPolicyPath(projectRoot) {
	return join(projectRoot, ".pi", "agents.policy.yaml");
}

export function projectPoliciesDir(projectRoot) {
	return join(projectRoot, ".pi", "policies");
}

function readYamlFile(path) {
	if (!existsSync(path)) return null;
	try {
		return parseYaml(readFileSync(path, "utf8"));
	} catch {
		return null;
	}
}

function normalizeExtensionBundle(raw) {
	if (typeof raw.extension_bundle !== "string") return undefined;
	const bundle = raw.extension_bundle.trim();
	return bundle.length > 0 ? bundle : undefined;
}

function normalizeKindEntry(raw) {
	if (!raw || typeof raw !== "object") return null;
	const tools = Array.isArray(raw.tools) ? raw.tools.map(String) : [];
	return {
		tools,
		extensions: raw.extensions === false ? false : Boolean(raw.extensions),
		extensionBundle: normalizeExtensionBundle(raw),
		readOnly: raw.read_only === true,
		maxTurns:
			typeof raw.max_turns === "number" && raw.max_turns > 0
				? raw.max_turns
				: undefined,
		thinking:
			typeof raw.thinking === "string" && raw.thinking.trim()
				? raw.thinking.trim()
				: undefined,
		model:
			typeof raw.model === "string" && raw.model.trim() ? raw.model.trim() : undefined,
	};
}

function normalizeAgentEntry(raw) {
	if (!raw || typeof raw !== "object") return {};
	const toolsAdd = Array.isArray(raw.tools_add)
		? raw.tools_add.map(String)
		: Array.isArray(raw.tools)
			? raw.tools.map(String)
			: [];
	return {
		kind: typeof raw.kind === "string" ? raw.kind.trim() : undefined,
		toolsAdd,
		toolsDeny: Array.isArray(raw.tools_deny)
			? raw.tools_deny.map(String)
			: [],
		submitTool:
			typeof raw.submit_tool === "string" ? raw.submit_tool.trim() : undefined,
		extensions:
			raw.extensions === false
				? false
				: raw.extensions === true
					? true
					: undefined,
		extensionBundle: normalizeExtensionBundle(raw),
		maxTurns:
			typeof raw.max_turns === "number" && raw.max_turns > 0
				? raw.max_turns
				: undefined,
		thinking:
			typeof raw.thinking === "string" && raw.thinking.trim()
				? raw.thinking.trim()
				: undefined,
		model:
			typeof raw.model === "string" && raw.model.trim() ? raw.model.trim() : undefined,
	};
}

export function loadAgentsPolicyMerged(packageRoot, projectRoot) {
	const key = `${packageRoot}\0${projectRoot}`;
	if (cache.has(key)) return cache.get(key);

	const pkgDoc = readYamlFile(packageAgentsPolicyPath(packageRoot)) ?? {};
	const projDoc = readYamlFile(projectAgentsPolicyPath(projectRoot)) ?? {};

	const kinds = new Map();
	for (const [name, raw] of Object.entries(pkgDoc.kinds ?? {})) {
		const k = normalizeKindEntry(raw);
		if (k) kinds.set(name, k);
	}
	for (const [name, raw] of Object.entries(projDoc.kinds ?? {})) {
		const k = normalizeKindEntry(raw);
		if (k) kinds.set(name, k);
	}

	const agents = new Map();
	for (const [id, raw] of Object.entries(pkgDoc.agents ?? {})) {
		agents.set(id, normalizeAgentEntry(raw));
	}
	for (const [id, raw] of Object.entries(projDoc.agents ?? {})) {
		const prev = agents.get(id) ?? {};
		const next = normalizeAgentEntry(raw);
		agents.set(id, {
			...prev,
			...next,
			toolsAdd: [...new Set([...(prev.toolsAdd ?? []), ...(next.toolsAdd ?? [])])],
			toolsDeny: [...new Set([...(prev.toolsDeny ?? []), ...(next.toolsDeny ?? [])])],
		});
	}

	const merged = {
		schemaVersion: String(pkgDoc.apiVersion ?? projDoc.apiVersion ?? "harness.toolkit/v1"),
		kinds,
		agents,
		defaults: normalizeAgentEntry(projDoc.defaults ?? pkgDoc.defaults ?? {}),
	};
	cache.set(key, merged);
	return merged;
}

export function resolveEffectiveTools(agentId, merged) {
	const entry = merged.agents.get(agentId) ?? merged.defaults;
	const kindName = entry.kind ?? "other";
	const kind = merged.kinds.get(kindName) ?? merged.kinds.get("other") ?? {
		tools: ["read", "grep", "find", "ls"],
		extensions: false,
		readOnly: true,
	};

	const base = new Set(kind.tools);
	for (const t of entry.toolsAdd ?? []) base.add(t);
	for (const t of entry.toolsDeny ?? []) base.delete(t);
	for (const t of BUILTIN_DENY_TOOLS) base.delete(t);

	const extensionBundle =
		entry.extensionBundle ?? kind.extensionBundle ?? undefined;
	const extensionsFull =
		!extensionBundle &&
		(entry.extensions === true
			? true
			: entry.extensions === false
				? false
				: Boolean(kind.extensions));
	const extensionsOff = !extensionsFull;

	return {
		kind: kindName,
		effectiveTools: [...base],
		extensionsOff,
		extensionBundle,
		extensionsFull,
		/** Suppress Pi builtins when harness read/edit register (full extensions or subprocess bundle). */
		noBuiltinTools: extensionsFull || Boolean(extensionBundle),
		readOnly: kind.readOnly,
		maxTurns: entry.maxTurns ?? kind.maxTurns,
		thinking: entry.thinking ?? kind.thinking,
		model: entry.model ?? kind.model,
		submitTool: entry.submitTool,
	};
}

export function getAgentPolicySpec(packageRoot, projectRoot, agentId) {
	const merged = loadAgentsPolicyMerged(packageRoot, projectRoot);
	if (!merged.agents.has(agentId) && !merged.defaults?.kind) {
		return null;
	}
	return resolveEffectiveTools(agentId, merged);
}

export function getAgentKind(packageRoot, projectRoot, agentId) {
	const spec = getAgentPolicySpec(packageRoot, projectRoot, agentId);
	if (spec) return spec.kind;
	if (agentId.startsWith("harness/planning/")) return "planner";
	if (agentId === "harness/running/executor") return "executor";
	if (agentId === "harness/reviewing/evaluator") return "evaluator";
	if (agentId === "harness/reviewing/adversary") return "adversary";
	if (agentId === "harness/reviewing/tie-breaker") return "tie_breaker";
	if (agentId === "harness/meta-optimizer") return "meta";
	if (agentId === "harness/trace-librarian") return "trace";
	if (agentId === "harness/incident-recorder") return "incident";
	return "other";
}

export function isHarnessPlanningAgent(agentId) {
	return agentId.startsWith("harness/planning/");
}

export function harnessSubagentPhaseHint(packageRoot, projectRoot, agentId) {
	if (isHarnessPlanningAgent(agentId)) return "plan";
	const kind = getAgentKind(packageRoot, projectRoot, agentId);
	switch (kind) {
		case "planner":
			return "plan";
		case "executor":
			return "execute";
		case "evaluator":
			return "evaluate";
		case "adversary":
			return "adversary";
		default:
			return null;
	}
}

function isMutatingBash(command) {
	if (!command) return false;
	return /\b(rm\s+-rf|git\s+(push|commit|reset|checkout|merge|rebase)|npm\s+run|make\b|docker\s+)/i.test(
		command,
	);
}
function deniesReadOnlyBatchExecute(toolInput) {
	const commands = toolInput.commands;
	if (!Array.isArray(commands)) return false;
	for (const c of commands) {
		const cmd =
			typeof c === "string" ? c : String(c?.command ?? c?.code ?? "");
		if (cmd && isMutatingBash(cmd)) return true;
	}
	return false;
}

function deniesReadOnlyExecute(toolInput) {
	const code = String(toolInput.code ?? toolInput.command ?? "");
	return Boolean(code && isMutatingBash(code));
}

function deniesReadOnlyBash(agentId, toolInput) {
	const command = String(toolInput.command ?? "");
	if (command && isMutatingBash(command)) return true;
	if (
		isHarnessPlanningAgent(agentId) &&
		command &&
		PLANNING_ARTIFACT_JSON_WRITE.test(command)
	) {
		return true;
	}
	if (
		isHarnessPlanningAgent(agentId) &&
		command &&
		PLANNING_BASH_DENY_PATTERNS.some((p) => p.test(command))
	) {
		return true;
	}
	return false;
}

/**
 * Manifest allowlist + subprocess constraints (replaces harness-subagent-policy.ts).
 */
/**
 * Manifest allowlist + subprocess constraints (replaces harness-subagent-policy.ts).
 */
export function allowsAgentTool(input) {
	const {
		packageRoot,
		projectRoot,
		agentId,
		toolName,
		toolInput = {},
		isSubprocess = false,
		isParentOrchestrator = false,
	} = input;

	if (isParentOrchestrator) {
		if (toolName.startsWith("submit_")) return false;
		return true;
	}

	const spec = getAgentPolicySpec(packageRoot, projectRoot, agentId);
	if (!spec) return false;

	if (!spec.effectiveTools.includes(toolName)) return false;

	if (toolName.startsWith("submit_")) {
		if (!isSubprocess) return false;
		if (toolName === "submit_human_required" && agentId === "harness/running/executor") {
			return false;
		}
	}

	if (MUTATING_TOOLS.has(toolName) && spec.readOnly) return false;

	if (toolName === "read" && deniesAgentReadPath(agentId, toolInput)) {
		return false;
	}

	if (toolName === "ctx_batch_execute" && spec.readOnly) {
		if (deniesReadOnlyBatchExecute(toolInput)) return false;
	}

	if (toolName === "ctx_execute" && spec.readOnly) {
		if (deniesReadOnlyExecute(toolInput)) return false;
	}

	if (toolName === "bash" && spec.readOnly) {
		if (
			agentId === "harness/planning/plan-evaluator" ||
			agentId === "harness/planning/plan-adversary"
		) {
			const command = String(toolInput.command ?? "");
			if (!command || !DEBATE_SG_BASH_ALLOW.test(command)) return false;
		} else if (deniesReadOnlyBash(agentId, toolInput)) {
			return false;
		}
	}

	return true;
}

export function applyAgentPolicyToConfig(agent, packageRoot, projectRoot) {
	const spec = getAgentPolicySpec(packageRoot, projectRoot, agent.name);
	if (!spec) return agent;
	return {
		...agent,
		tools: spec.effectiveTools.length > 0 ? spec.effectiveTools : undefined,
		extensionsOff: spec.extensionsOff,
		extensionBundle: spec.extensionBundle,
		extensionsFull: spec.extensionsFull,
		noBuiltinTools: spec.noBuiltinTools,
		maxTurns: spec.maxTurns ?? agent.maxTurns,
		thinking: spec.thinking ?? agent.thinking,
		model: spec.model ?? agent.model,
	};
}

export function findProjectRootFromAgentsDir(projectAgentsDir) {
	if (!projectAgentsDir) return process.cwd();
	const piDir = dirname(projectAgentsDir);
	if (piDir.endsWith("/.pi") || piDir.endsWith("\\.pi")) {
		return dirname(piDir);
	}
	return process.cwd();
}

export function isAgtGovernanceActive(projectRoot) {
	if (existsSync(projectAgentsPolicyPath(projectRoot))) return true;
	const polDir = projectPoliciesDir(projectRoot);
	if (!existsSync(polDir)) return false;
	try {
		return readdirSync(polDir).some((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
	} catch {
		return false;
	}
}
