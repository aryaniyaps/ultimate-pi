#!/usr/bin/env node
/**
 * Synthesize Pro-shaped sentrux-diagnostics.json from sentrux-report.json (+ optional git churn).
 *
 * Usage:
 *   node harness-sentrux-diagnostics.mjs --report <sentrux-report.json> [--out <DIR>] [--churn]
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	inferBottleneck,
	parseComplexFunctionEntries,
	parseGodFileEntries,
	sha256,
} from "../lib/harness-sentrux-parse.mjs";
import { loadGitChurn } from "./harness-git-churn.mjs";

function usage() {
	console.error(`Usage: harness-sentrux-diagnostics.mjs --report <path> [--out <dir>] [--churn] [--root <path>]`);
	process.exit(2);
}

function summarizeViolations(violations) {
	const byRule = new Map();
	for (const v of violations) {
		const cur = byRule.get(v.rule) || {
			rule: v.rule,
			count: 0,
			severity: v.severity,
			sample_files: [],
		};
		cur.count += 1;
		for (const f of v.files) {
			if (cur.sample_files.length < 5 && !cur.sample_files.includes(f)) {
				cur.sample_files.push(f);
			}
		}
		byRule.set(v.rule, cur);
	}
	return [...byRule.values()].sort((a, b) => b.count - a.count);
}

function ccPriority(cc) {
	if (cc >= 60) return "critical";
	if (cc >= 45) return "high";
	if (cc >= 35) return "medium";
	return "low";
}

function buildRootCauses(violations, gate, bottleneck) {
	const causes = [];
	for (const v of violations) {
		if (v.rule === "layer_direction" || v.rule === "boundary") {
			causes.push(
				`Layer/boundary violations: ${v.message} (${v.files.length} location(s))`,
			);
		} else if (v.rule === "max_cc") {
			causes.push(`High cyclomatic complexity: ${v.message}`);
		} else {
			causes.push(`${v.rule}: ${v.message}`);
		}
	}
	for (const r of gate.degraded_reasons || []) {
		if (!causes.some((c) => c.includes(r))) causes.push(r);
	}
	if (causes.length === 0) {
		causes.push(
			bottleneck === "equality"
				? "Structural equality debt (complexity / size)"
				: "Structural modularity debt (coupling / boundaries)",
		);
	}
	return [...new Set(causes)];
}

function scoreHotspots(complexFns, churnMap, violations) {
	const scores = new Map();
	const add = (path, delta, reason) => {
		const cur = scores.get(path) || { path, score: 0, reasons: [] };
		cur.score += delta;
		if (reason && !cur.reasons.includes(reason)) cur.reasons.push(reason);
		scores.set(path, cur);
	};

	for (const fn of complexFns) {
		add(fn.file, fn.cc / 10, `complex:${fn.func}`);
	}
	for (const v of violations) {
		for (const f of v.files) {
			const path = f.split(":")[0] || f;
			add(path, v.severity === "error" ? 5 : 2, `rule:${v.rule}`);
		}
	}
	if (churnMap) {
		for (const [path, churn] of Object.entries(churnMap)) {
			if (churn > 0) add(path, Math.min(churn / 5, 15), "git-churn");
		}
	}

	return [...scores.values()]
		.sort((a, b) => b.score - a.score)
		.slice(0, 20)
		.map((h) => ({
			path: h.path,
			score: Math.round(h.score * 10) / 10,
			churn_14d: churnMap?.[h.path] ?? null,
			reason: h.reasons.slice(0, 3).join("; "),
		}));
}

export function synthesizeDiagnostics(report, options = {}) {
	const violations = report.check?.violations ?? [];
	const gate = report.gate ?? { status: "unknown", degraded_reasons: [] };
	const { bottleneck, bottleneck_inferred } = inferBottleneck(violations, gate);
	const root_causes = buildRootCauses(violations, gate, bottleneck);

	const complex_functions = parseComplexFunctionEntries(violations).map((fn) => ({
		...fn,
		priority: ccPriority(fn.cc),
	}));

	const god_files = parseGodFileEntries(violations).map((g) => ({
		...g,
		reason: "no_god_files rule violation",
	}));

	const cycles = [];
	for (const v of violations) {
		if (v.rule === "max_cycles") {
			cycles.push({
				members: v.files,
				reason: v.message,
			});
		}
	}

	const churnMap = options.churnMap ?? null;
	const hotspots = scoreHotspots(complex_functions, churnMap, violations);

	const graphify_refs = [];
	if (options.graphifyReportPath) {
		graphify_refs.push({
			path: options.graphifyReportPath,
			summary: "GRAPH_REPORT.md god nodes and communities for repair targeting",
		});
	}

	return {
		schema_version: "1.0.0",
		synthesized_at: new Date().toISOString(),
		project_root: report.project_root,
		report_sha256: sha256(JSON.stringify(report)),
		quality_signal: report.check?.quality_signal ?? null,
		gate_status: gate.status === "degraded" ? "degraded" : gate.status === "pass" ? "pass" : "unknown",
		bottleneck,
		bottleneck_inferred,
		root_causes,
		diagnostics: {
			god_files,
			hotspots,
			complex_functions,
			cycles,
			violations_summary: summarizeViolations(violations),
			gate_degraded_reasons: gate.degraded_reasons ?? [],
		},
		graphify_refs: graphify_refs.length ? graphify_refs : undefined,
	};
}

async function main() {
	const args = process.argv.slice(2);
	let reportPath = "";
	let outDir = "";
	let useChurn = false;
	let projectRoot = "";

	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === "--report") reportPath = args[++i] || "";
		else if (a === "--out") outDir = args[++i] || "";
		else if (a === "--churn") useChurn = true;
		else if (a === "--root") projectRoot = args[++i] || "";
		else if (a === "--help" || a === "-h") usage();
	}

	if (!reportPath) usage();
	const report = JSON.parse(await readFile(reportPath, "utf-8"));
	const root = projectRoot || report.project_root;

	let churnMap = null;
	if (useChurn && root) {
		try {
			churnMap = await loadGitChurn(root, { days: 14 });
		} catch {
			churnMap = null;
		}
	}

	const graphifyReportPath = root
		? join(root, "graphify-out", "GRAPH_REPORT.md")
		: undefined;

	const diagnostics = synthesizeDiagnostics(report, {
		churnMap,
		graphifyReportPath,
	});

	const json = `${JSON.stringify(diagnostics, null, 2)}\n`;
	const targetDir =
		outDir || join(dirname(reportPath), ".");
	const outPath = outDir
		? join(outDir, "artifacts", "sentrux-diagnostics.json")
		: join(dirname(reportPath), "sentrux-diagnostics.json");

	if (outDir) {
		await mkdir(join(outDir, "artifacts"), { recursive: true });
	}
	await writeFile(outPath, json);
	if (!outDir) process.stdout.write(json);
}

import { pathToFileURL } from "node:url";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
