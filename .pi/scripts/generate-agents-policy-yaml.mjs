#!/usr/bin/env node
/**
 * Generate .pi/harness/agents.policy.yaml from harness agent .md frontmatter + submit registry.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { walkAgentsDir } from "../lib/harness-agent-discovery.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AGENTS_DIR = join(ROOT, ".pi", "agents");
const OUT = join(ROOT, ".pi", "harness", "agents.policy.yaml");

const SUBMIT_BY_AGENT = {
	"harness/planning/planning-context": ["submit_planning_context"],
	"harness/planning/decompose": ["submit_decomposition_brief", "submit_human_required"],
	"harness/planning/hypothesis": ["submit_hypothesis_brief"],
	"harness/planning/hypothesis-validator": ["submit_hypothesis_validation"],
	"harness/planning/plan-evaluator": ["submit_validation_turn"],
	"harness/planning/plan-adversary": ["submit_adversary_brief"],
	"harness/planning/sprint-contract-auditor": ["submit_sprint_audit"],
	"harness/planning/review-integrator": ["submit_review_round_draft"],
	"harness/planning/implementation-researcher": ["submit_implementation_research"],
	"harness/planning/stack-researcher": ["submit_stack_brief"],
	"harness/planning/execution-plan-author": ["submit_execution_plan_brief"],
	"harness/running/executor": ["submit_executor_handoff"],
	"harness/reviewing/evaluator": ["submit_eval_verdict"],
	"harness/reviewing/adversary": ["submit_adversary_report"],
	"harness/reviewing/tie-breaker": ["submit_human_required"],
	"harness/trace-librarian": ["submit_human_required"],
	"harness/incident-recorder": ["submit_human_required"],
	"harness/sentrux-steward": ["submit_sentrux_manifest_proposal"],
};

function parseFrontmatter(content) {
	const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!m) return {};
	return parseYaml(m[1]) ?? {};
}

function kindFor(id) {
	if (id.startsWith("harness/planning/")) return "planner";
	if (id === "harness/running/executor") return "executor";
	if (id === "harness/reviewing/evaluator") return "evaluator";
	if (id === "harness/reviewing/adversary") return "adversary";
	if (id === "harness/reviewing/tie-breaker") return "tie_breaker";
	if (id === "harness/trace-librarian") return "trace";
	if (id === "harness/incident-recorder") return "incident";
	if (id === "harness/sentrux-steward" || id === "harness/sentrux-bootstrap")
		return "planner";
	return "other";
}

const KIND_BASE = {
	planner: ["read", "grep", "find", "ls"],
	executor: ["read", "write", "edit", "bash", "grep", "find", "ls"],
	evaluator: ["read", "grep", "find", "ls"],
	adversary: ["read", "grep", "find", "ls"],
	tie_breaker: ["read", "grep", "find", "ls"],
	trace: ["read", "grep", "find", "ls"],
	incident: ["read", "grep", "find", "ls"],
	other: ["read", "grep", "find", "ls"],
};

function csvTools(fm) {
	const raw = fm.tools;
	if (!raw) return [];
	return String(raw)
		.split(",")
		.map((t) => t.trim())
		.filter(Boolean);
}

async function main() {
	const files = new Map();
	walkAgentsDir(AGENTS_DIR, "package", files);

	const kinds = {
		planner: { tools: KIND_BASE.planner, extensions: false, read_only: true },
		executor: { tools: KIND_BASE.executor, extensions: true, read_only: false },
		evaluator: { tools: KIND_BASE.evaluator, extensions: false, read_only: true },
		adversary: { tools: KIND_BASE.adversary, extensions: false, read_only: true },
		tie_breaker: {
			tools: KIND_BASE.tie_breaker,
			extensions: false,
			read_only: true,
		},
		trace: { tools: KIND_BASE.trace, extensions: false, read_only: true },
		incident: { tools: KIND_BASE.incident, extensions: false, read_only: true },
		other: { tools: KIND_BASE.other, extensions: false, read_only: true },
	};

	const agents = {};

	for (const [id, file] of files) {
		if (!id.startsWith("harness/")) continue;
		const fm = parseFrontmatter(file.content);
		const kind = kindFor(id);
		const base = new Set(KIND_BASE[kind] ?? KIND_BASE.other);
		const fromFm = csvTools(fm);
		const submit = SUBMIT_BY_AGENT[id] ?? [];
		const toolsAdd = [...new Set([...fromFm, ...submit])].filter(
			(t) => !base.has(t),
		);
		const entry = { kind };
		if (toolsAdd.length > 0) entry.tools_add = toolsAdd;
		if (fm.extensions === false) entry.extensions = false;
		if (fm.extensions === true) entry.extensions = true;
		if (typeof fm.max_turns === "number") entry.max_turns = fm.max_turns;
		if (typeof fm.thinking === "string") entry.thinking = fm.thinking;
		if (submit.length === 1) entry.submit_tool = submit[0];
		agents[id] = entry;
	}

	// plan-synthesizer: parent-only, minimal policy for spawn if ever used
	agents["harness/planning/plan-synthesizer"] = {
		kind: "planner",
		tools_add: [
			"submit_decomposition_brief",
			"submit_hypothesis_brief",
			"submit_execution_plan_brief",
		],
		extensions: false,
	};

	const doc = {
		apiVersion: "harness.toolkit/v1",
		kinds,
		agents,
	};

	const yaml = [
		"# Generated/maintained SSOT for harness agent tools (see ADR 0049).",
		"# Regenerate hints: node .pi/scripts/generate-agents-policy-yaml.mjs",
		"",
	];
	const { stringify } = await import("yaml");
	yaml.push(stringify(doc));
	await writeFile(OUT, yaml.join("\n"), "utf8");
	console.log(`Wrote ${OUT} (${Object.keys(agents).length} harness agents)`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
