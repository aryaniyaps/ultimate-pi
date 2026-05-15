#!/usr/bin/env node
/**
 * meta-optimizer — read harness JSONL index and emit tuning proposals (no LLM).
 */

import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RUNS = join(ROOT, ".pi", "harness", "runs");
const OUT = join(ROOT, ".pi", "harness", "router", "proposals", "meta-optimizer-proposal.json");

async function loadIndexLines() {
	const indexPath = join(RUNS, "index.jsonl");
	try {
		const raw = await readFile(indexPath, "utf-8");
		return raw
			.trim()
			.split("\n")
			.filter(Boolean)
			.map((line) => JSON.parse(line));
	} catch {
		return [];
	}
}

async function countEventTypes(runId) {
	const eventsPath = join(RUNS, runId, "events.jsonl");
	try {
		const raw = await readFile(eventsPath, "utf-8");
		const counts = {};
		for (const line of raw.trim().split("\n").filter(Boolean)) {
			const row = JSON.parse(line);
			const t = row.type ?? "unknown";
			counts[t] = (counts[t] ?? 0) + 1;
		}
		return counts;
	} catch {
		return {};
	}
}

async function main() {
	const index = await loadIndexLines();
	const recent = index.slice(-20);
	let totalToolSpans = 0;
	let runs = 0;
	const policyHints = [];

	for (const row of recent) {
		const runId = row.run_id;
		if (!runId) continue;
		runs += 1;
		try {
			const trace = JSON.parse(
				await readFile(join(RUNS, runId, "trace.json"), "utf-8"),
			);
			totalToolSpans += trace.tool_span_count ?? trace.tool_spans?.length ?? 0;
		} catch {
			/* skip */
		}
		const events = await countEventTypes(runId);
		if ((events.tool_result ?? 0) > 50) {
			policyHints.push({
				run_id: runId,
				hint: "High tool volume; consider stricter phase caps or router to smaller model for plan phase.",
			});
		}
	}

	const avgTools = runs > 0 ? totalToolSpans / runs : 0;
	const proposal = {
		schema_version: "1.0.0",
		generated_at: new Date().toISOString(),
		source: "meta-optimizer",
		sample_runs: runs,
		avg_tool_spans_per_run: avgTools,
		router_hints: policyHints,
		recommendation:
			avgTools > 30
				? "Consider lowering execute-phase tool budget or enabling HARNESS_BUDGET_HARD_STOP."
				: "No automatic router change; metrics within nominal band.",
	};

	await import("node:fs/promises").then(({ mkdir, writeFile }) =>
		mkdir(dirname(OUT), { recursive: true }).then(() =>
			writeFile(OUT, `${JSON.stringify(proposal, null, 2)}\n`),
		),
	);

	console.log(JSON.stringify(proposal, null, 2));
	console.log(`\nWrote ${OUT}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
