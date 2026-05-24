#!/usr/bin/env node
/**
 * validate-plan-dag — deterministic ExecutionPlan DAG checks (YAML packet in).
 */

import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readYamlFile, writeYamlFile } from "../lib/harness-yaml.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const MINIMUMS = {
	low: { phases: 2, work_items: 2, acceptance_checks: 3, risks: 0 },
	med: { phases: 3, work_items: 4, acceptance_checks: 5, risks: 3 },
	high: { phases: 4, work_items: 6, acceptance_checks: 8, risks: 3 },
};

function fail(msg) {
	console.error(`validate-plan-dag: FAIL: ${msg}`);
	process.exit(1);
}

function ok(msg) {
	console.log(`  ✓ ${msg}`);
}

function topoSort(workItems) {
	const ids = new Set(workItems.map((w) => w.work_item_id));
	const adj = new Map();
	for (const w of workItems) {
		adj.set(w.work_item_id, (w.depends_on ?? []).filter((d) => ids.has(d)));
	}
	const visited = new Set();
	const stack = new Set();
	const order = [];
	const cycles = [];

	function dfs(n, path) {
		if (stack.has(n)) {
			cycles.push([...path, n]);
			return;
		}
		if (visited.has(n)) return;
		visited.add(n);
		stack.add(n);
		for (const d of adj.get(n) ?? []) dfs(d, [...path, n]);
		stack.delete(n);
		order.push(n);
	}

	for (const id of ids) dfs(id, []);
	order.reverse();
	return { order, cycles };
}

function computeCriticalPath(workItems) {
	const ids = new Set(workItems.map((w) => w.work_item_id));
	const len = new Map();
	for (const w of workItems) len.set(w.work_item_id, 0);
	let changed = true;
	while (changed) {
		changed = false;
		for (const w of workItems) {
			const deps = (w.depends_on ?? []).filter((d) => ids.has(d));
			const base = deps.length === 0 ? 0 : Math.max(...deps.map((d) => len.get(d) ?? 0)) + 1;
			if (base > (len.get(w.work_item_id) ?? 0)) {
				len.set(w.work_item_id, base);
				changed = true;
			}
		}
	}
	const maxLen = Math.max(0, ...len.values());
	const end = workItems.filter((w) => len.get(w.work_item_id) === maxLen).map((w) => w.work_item_id);
	// Backtrack one longest path
	const path = [];
	let cur = end[0];
	if (!cur) return [];
	const byId = new Map(workItems.map((w) => [w.work_item_id, w]));
	while (cur) {
		path.unshift(cur);
		const w = byId.get(cur);
		const deps = (w?.depends_on ?? []).filter((d) => ids.has(d));
		if (deps.length === 0) break;
		cur = deps.reduce((a, b) => ((len.get(a) ?? 0) >= (len.get(b) ?? 0) ? a : b));
	}
	return path;
}

function validateMinimumShape(packet, ep, phases, workItems) {
	const errors = [];
	const risk = packet.risk_level ?? "med";
	const min = MINIMUMS[risk] ?? MINIMUMS.med;
	const ac = packet.acceptance_checks ?? [];
	if (phases.length < min.phases) errors.push(`need >= ${min.phases} phases for risk ${risk}`);
	if (workItems.length < min.work_items) errors.push(`need >= ${min.work_items} work_items for risk ${risk}`);
	if (ac.length < min.acceptance_checks) errors.push(`need >= ${min.acceptance_checks} acceptance_checks`);
	if ((ep.risk_register ?? []).length < min.risks) errors.push(`need >= ${min.risks} risks for risk ${risk}`);
	return errors;
}

function validatePhaseAndWorkItemLinks(phases, workItems) {
	const errors = [];
	const phaseIds = new Set(phases.map((p) => p.phase_id));
	const wiIds = new Set(workItems.map((w) => w.work_item_id));
	for (const p of phases) {
		if (!p.exit_criteria?.length) errors.push(`phase ${p.phase_id} missing exit_criteria`);
		if (!p.work_item_ids?.length) errors.push(`phase ${p.phase_id} has no work items`);
		for (const wid of p.work_item_ids ?? []) {
			if (!wiIds.has(wid)) errors.push(`phase ${p.phase_id} references missing ${wid}`);
		}
	}
	for (const w of workItems) {
		if (!phaseIds.has(w.phase_id)) errors.push(`work_item ${w.work_item_id} unknown phase_id`);
		for (const d of w.depends_on ?? []) {
			if (!wiIds.has(d)) errors.push(`work_item ${w.work_item_id} depends_on missing ${d}`);
		}
		if (!w.non_code && (!w.files || w.files.length === 0)) {
			errors.push(`work_item ${w.work_item_id} needs files[] or non_code: true`);
		}
	}
	return errors;
}

function isReachable(workItems, from, to, seen = new Set()) {
	if (from === to) return true;
	if (seen.has(from)) return false;
	seen.add(from);
	const w = workItems.find((x) => x.work_item_id === from);
	for (const d of w?.depends_on ?? []) {
		if (isReachable(workItems, d, to, seen)) return true;
	}
	return false;
}

function findFileConflicts(phases, workItems) {
	const conflicts = [];
	const phaseIndex = new Map(phases.map((p, i) => [p.phase_id, i]));
	for (let i = 0; i < workItems.length; i++) {
		for (let j = i + 1; j < workItems.length; j++) {
			const a = workItems[i];
			const b = workItems[j];
			const filesA = new Set(a.files ?? []);
			const overlap = (b.files ?? []).filter((f) => filesA.has(f));
			if (overlap.length === 0) continue;
			const ordered =
				isReachable(workItems, a.work_item_id, b.work_item_id) ||
				isReachable(workItems, b.work_item_id, a.work_item_id);
			const samePhase = (phaseIndex.get(a.phase_id) ?? 0) === (phaseIndex.get(b.phase_id) ?? 0);
			if (!ordered && samePhase) {
				conflicts.push(
					`file overlap ${overlap.join(",")} between ${a.work_item_id} and ${b.work_item_id} without dependency`,
				);
			}
		}
	}
	return conflicts;
}

function validateCriticalPath(ep, workItems) {
	const computedCp = computeCriticalPath(workItems);
	const authorCp = ep.schedule_metadata?.critical_path_work_item_ids ?? [];
	const same =
		authorCp.length === computedCp.length &&
		authorCp.every((id, i) => id === computedCp[i]);
	if (computedCp.length < 3 || !authorCp.length || same) return [];
	return [`critical_path mismatch author=${authorCp.join("→")} computed=${computedCp.join("→")}`];
}

function validateAcceptanceCheckLinks(packet, workItems) {
	const errors = [];
	const ac = packet.acceptance_checks ?? [];
	const acIds = new Set(ac.map((c) => (typeof c === "string" ? c : c.id)).filter(Boolean));
	for (const w of workItems) {
		for (const acid of w.acceptance_check_ids ?? []) {
			if (!acIds.has(acid)) errors.push(`${w.work_item_id} references orphan ${acid}`);
		}
	}
	for (const acid of acIds) {
		const used = workItems.some((w) => (w.acceptance_check_ids ?? []).includes(acid));
		if (!used) errors.push(`orphan acceptance check ${acid}`);
	}
	return errors;
}

export function validateExecutionPlan(packet, projectRoot = ROOT) {
	const ep = packet.execution_plan;
	if (!ep) return { status: "fail", errors: ["execution_plan required"], report: null };
	const phases = ep.phases ?? [];
	const workItems = ep.work_items ?? [];
	const { order, cycles } = topoSort(workItems);
	const errors = [
		...validateMinimumShape(packet, ep, phases, workItems),
		...validatePhaseAndWorkItemLinks(phases, workItems),
		...(cycles.length ? [`cycle detected: ${JSON.stringify(cycles[0])}`] : []),
		...validateCriticalPath(ep, workItems),
		...validateAcceptanceCheckLinks(packet, workItems),
	];
	const conflicts = findFileConflicts(phases, workItems);
	const status = errors.length === 0 && conflicts.length === 0 ? "pass" : "fail";
	const report = { status, topological_order: order, cycles, conflicts: [...conflicts, ...errors] };
	return { status, errors: [...errors, ...conflicts], report };
}

async function main() {
	const args = process.argv.slice(2);
	let packetPath = null;
	let writeBack = false;
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--packet" && args[i + 1]) packetPath = args[++i];
		else if (args[i] === "--write") writeBack = true;
	}

	if (!packetPath) {
		console.error("Usage: validate-plan-dag.mjs --packet <plan-packet.yaml> [--write]");
		process.exit(2);
	}

	const abs = resolve(packetPath);
	try {
		await access(abs, constants.R_OK);
	} catch {
		fail(`cannot read ${abs}`);
	}

	const packet = await readYamlFile(abs);
	const { status, errors, report } = validateExecutionPlan(packet, dirname(abs));

	if (writeBack && report && packet.execution_plan) {
		packet.execution_plan.dag_validation = {
			status: report.status,
			topological_order: report.topological_order,
			cycles: report.cycles,
			conflicts: report.conflicts,
		};
		await writeYamlFile(abs, packet);
	}

	if (status !== "pass") {
		for (const e of errors) console.error(`  - ${e}`);
		fail("validation failed");
	}
	ok(`DAG validation pass (${report.topological_order.length} work items)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	main();
}
