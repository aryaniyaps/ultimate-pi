#!/usr/bin/env node
/**
 * Single-scan Sentrux check + gate capture → sentrux-report.json (+ optional sentrux-signal.yaml).
 *
 * Usage:
 *   node harness-sentrux-report.mjs --out <DIR> [--root <PROJECT_ROOT>] [--run-id <ID>] [--signal]
 *   node harness-sentrux-report.mjs --parse-only --check-file <path> [--gate-file <path>]
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import {
	takeRootArg,
	resolveSentruxProjectRoot,
} from "../lib/harness-sentrux-root.mjs";
import {
	PARSER_VERSION,
	filterSentruxOutputLines,
	parseCheckOutput,
	parseGateOutput,
	sha256,
	normalizeUpstreamCheckJson,
} from "../lib/harness-sentrux-parse.mjs";
import { stringify as stringifyYaml } from "yaml";

function usage() {
	console.error(`Usage:
  harness-sentrux-report.mjs --out <DIR> [--root <PROJECT_ROOT>] [--run-id <ID>] [--signal]
  harness-sentrux-report.mjs --parse-only --check-file <path> [--gate-file <path>] [--out <DIR>]`);
	process.exit(2);
}

function parseSentruxTimeoutMs() {
	const raw = process.env.HARNESS_SENTRUX_TIMEOUT_MS;
	if (raw?.trim()) {
		const parsed = Number.parseInt(raw, 10);
		if (Number.isFinite(parsed) && parsed > 0) return parsed;
	}
	return 300_000;
}

function runSentrux(args, projectRoot) {
	const timeoutMs = parseSentruxTimeoutMs();
	return new Promise((resolve, reject) => {
		const child = spawn("sentrux", args, {
			cwd: projectRoot,
			env: process.env,
		});
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill("SIGTERM");
		}, timeoutMs);
		child.stdout?.on("data", (c) => {
			stdout += c.toString();
		});
		child.stderr?.on("data", (c) => {
			stderr += c.toString();
		});
		child.on("error", (err) => {
			clearTimeout(timer);
			if (err?.code === "ENOENT") {
				reject(
					Object.assign(new Error("sentrux not installed"), { code: 127 }),
				);
				return;
			}
			reject(err);
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({
				code: timedOut ? 124 : (code ?? 1),
				stdout,
				stderr,
				timedOut,
			});
		});
	});
}

async function tryUpstreamJson(projectRoot) {
	try {
		const { code, stdout } = await runSentrux(
			["check", "--format", "json", projectRoot],
			projectRoot,
		);
		if (code !== 0 && code !== 1) return null;
		const trimmed = stdout.trim();
		if (!trimmed.startsWith("{")) return null;
		const json = JSON.parse(trimmed);
		return normalizeUpstreamCheckJson(json);
	} catch {
		return null;
	}
}

async function getSentruxVersion() {
	try {
		const { stdout } = await runSentrux(["--version"], process.cwd());
		const line = stdout.trim().split(/\r?\n/)[0] || "";
		return line || null;
	} catch {
		return null;
	}
}

function buildSignal(runId, report) {
	const check = report.check;
	const gate = report.gate;
	const summaryParts = [];
	if (check.quality_signal != null) {
		summaryParts.push(`quality=${check.quality_signal}`);
	}
	if (gate.quality_before != null && gate.quality_after != null) {
		summaryParts.push(`gate ${gate.quality_before}->${gate.quality_after}`);
	}
	if (gate.degraded_reasons?.length) {
		summaryParts.push(gate.degraded_reasons.join("; "));
	}
	return {
		schema_version: "1.1.0",
		run_id: runId || "unknown",
		check_pass: check.check_pass,
		gate_status:
			gate.status === "timeout"
				? "timeout"
				: gate.status === "degraded"
					? "degraded"
					: gate.status === "pass"
						? "pass"
						: "skipped",
		quality_signal_summary: summaryParts.join(" | ") || undefined,
		recorded_at: report.captured_at,
		phase: "review",
		quality_signal: check.quality_signal ?? undefined,
		violation_count: check.violations?.length ?? 0,
		report_path: "artifacts/sentrux-report.json",
		diagnostics_path: "artifacts/sentrux-diagnostics.json",
		degraded_reasons:
			gate.degraded_reasons?.length > 0
				? gate.degraded_reasons
				: undefined,
	};
}

async function captureReport(projectRoot) {
	const captured_at = new Date().toISOString();
	const upstream = await tryUpstreamJson(projectRoot);
	const upstream_json_available = upstream != null;

	const checkRun = await runSentrux(["check", projectRoot], projectRoot);
	const gateRun = await runSentrux(["gate", projectRoot], projectRoot);
	const timedOut = Boolean(checkRun.timedOut || gateRun.timedOut);

	const checkFiltered = filterSentruxOutputLines(
		`${checkRun.stdout}\n${checkRun.stderr}`,
	).join("\n");
	const gateFiltered = filterSentruxOutputLines(
		`${gateRun.stdout}\n${gateRun.stderr}`,
	).join("\n");

	let check = parseCheckOutput(checkFiltered);
	const gate = parseGateOutput(gateFiltered);

	if (upstream) {
		check = {
			...check,
			check_pass: upstream.check_pass,
			quality_signal: upstream.quality_signal ?? check.quality_signal,
			rules_checked: upstream.rules_checked ?? check.rules_checked,
			violations:
				upstream.violations?.length > 0
					? upstream.violations
					: check.violations,
			upstream: true,
		};
	}

	check.stdout_sha256 = sha256(checkFiltered);
	gate.stdout_sha256 = sha256(gateFiltered);

	if (checkRun.code === 127) throw Object.assign(new Error("sentrux not installed"), { code: 127 });

	if (timedOut) {
		check.check_pass = false;
		gate.status = "timeout";
		gate.degraded_reasons = [
			...(gate.degraded_reasons ?? []),
			`sentrux CLI exceeded HARNESS_SENTRUX_TIMEOUT_MS (${parseSentruxTimeoutMs()}ms)`,
		];
	}

	return {
		schema_version: "1.0.0",
		captured_at,
		project_root: projectRoot,
		parser_version: PARSER_VERSION,
		sentrux_cli_version: await getSentruxVersion(),
		upstream_json_available,
		check,
		gate,
		exit_codes: { check: checkRun.code, gate: gateRun.code },
		timed_out: timedOut || undefined,
	};
}

async function main() {
	const raw = process.argv.slice(2);
	const { args, explicitRoot } = takeRootArg(raw);

	let outDir = "";
	let runId = "";
	let parseOnly = false;
	let writeSignal = false;
	let checkFile = "";
	let gateFile = "";

	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === "--out") outDir = args[++i] || "";
		else if (a === "--run-id") runId = args[++i] || "";
		else if (a === "--parse-only") parseOnly = true;
		else if (a === "--signal") writeSignal = true;
		else if (a === "--check-file") checkFile = args[++i] || "";
		else if (a === "--gate-file") gateFile = args[++i] || "";
		else if (a === "--help" || a === "-h") usage();
	}

	if (parseOnly) {
		if (!checkFile) usage();
		const checkText = await readFile(checkFile, "utf-8");
		const gateText = gateFile ? await readFile(gateFile, "utf-8") : "";
		const report = {
			schema_version: "1.0.0",
			captured_at: new Date().toISOString(),
			project_root: explicitRoot || process.cwd(),
			parser_version: PARSER_VERSION,
			upstream_json_available: false,
			check: {
				...parseCheckOutput(checkText),
				stdout_sha256: sha256(checkText),
			},
			gate: {
				...parseGateOutput(gateText),
				stdout_sha256: sha256(gateText),
			},
		};
		const json = `${JSON.stringify(report, null, 2)}\n`;
		if (outDir) {
			const artifactsDir = join(outDir, "artifacts");
			await mkdir(artifactsDir, { recursive: true });
			await writeFile(join(artifactsDir, "sentrux-report.json"), json);
		} else {
			process.stdout.write(json);
		}
		return;
	}

	if (!outDir) usage();
	const projectRoot = await resolveSentruxProjectRoot(explicitRoot);
	const report = await captureReport(projectRoot);

	const artifactsDir = join(outDir, "artifacts");
	await mkdir(artifactsDir, { recursive: true });
	const reportPath = join(artifactsDir, "sentrux-report.json");
	await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

	if (writeSignal) {
		const signal = buildSignal(runId, report);
		await writeFile(
			join(artifactsDir, "sentrux-signal.yaml"),
			stringifyYaml(signal),
		);
	}

	const exitCode = report.check.check_pass && report.gate.status !== "degraded" ? 0 : 1;
	process.exit(exitCode);
}

main().catch((err) => {
	if (err?.code === 127) {
		console.error("harness-sentrux-report: sentrux not installed");
		process.exit(127);
	}
	console.error(err);
	process.exit(1);
});
