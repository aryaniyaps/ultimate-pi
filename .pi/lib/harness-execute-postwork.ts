/**
 * Deterministic execute-phase post-work (Sentrux capture) — parent extension, not LLM.
 */

import { join } from "node:path";
import { safeSpawnAsync } from "./harness-lens/clients/safe-spawn.js";
import { getHarnessPackageRoot } from "./harness-paths.js";

const DEFAULT_TIMEOUT_MS = 120_000;

export interface ExecutePostWorkResult {
	sentrux_report_ok: boolean;
	sentrux_diagnostics_ok: boolean;
	notes: string[];
}

function parseTimeoutMs(): number {
	const raw = process.env.HARNESS_SENTRUX_TIMEOUT_MS?.trim();
	if (!raw) return DEFAULT_TIMEOUT_MS;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export function executePostWorkEnabled(): boolean {
	return process.env.HARNESS_EXECUTE_POSTWORK !== "0";
}

/** Run Sentrux report + diagnostics after executor subprocess completes. */
export async function runExecutePostWork(args: {
	projectRoot: string;
	runId: string;
	packageRoot?: string;
	moduleUrl?: string;
}): Promise<ExecutePostWorkResult> {
	const notes: string[] = [];
	const packageRoot =
		args.packageRoot ??
		(args.moduleUrl ? getHarnessPackageRoot(args.moduleUrl) : process.cwd());
	const runDir = join(args.projectRoot, ".pi", "harness", "runs", args.runId);
	const timeout = parseTimeoutMs();
	const scripts = join(packageRoot, ".pi", "scripts");

	const report = await safeSpawnAsync(
		"node",
		[
			join(scripts, "harness-sentrux-report.mjs"),
			"--out",
			runDir,
			"--root",
			args.projectRoot,
			"--run-id",
			args.runId,
			"--signal",
		],
		{ cwd: args.projectRoot, timeout },
	);

	const notInstalled =
		report.status === 127 ||
		/not installed/i.test(report.stderr) ||
		/not installed/i.test(report.stdout);
	if (notInstalled) {
		notes.push("sentrux: not_installed");
		return {
			sentrux_report_ok: false,
			sentrux_diagnostics_ok: false,
			notes,
		};
	}

	const reportOk = report.status === 0;
	if (!reportOk) {
		notes.push(`sentrux-report: exit ${report.status ?? "null"}`);
	}

	const reportPath = join(runDir, "artifacts", "sentrux-report.json");
	const diag = await safeSpawnAsync(
		"node",
		[
			join(scripts, "harness-sentrux-diagnostics.mjs"),
			"--report",
			reportPath,
			"--out",
			runDir,
			"--churn",
		],
		{ cwd: args.projectRoot, timeout },
	);
	const diagOk = diag.status === 0;
	if (!diagOk) {
		notes.push(`sentrux-diagnostics: exit ${diag.status ?? "null"}`);
	}

	return {
		sentrux_report_ok: reportOk,
		sentrux_diagnostics_ok: diagOk,
		notes,
	};
}

export function formatExecutorHandoffBrief(
	handoff: {
		execution_status?: string;
	} | null,
): string {
	if (!handoff?.execution_status) {
		return "Executor subprocess finished; handoff artifact not yet on disk — check handoff/executor-summary.yaml.";
	}
	return `Executor handoff: execution_status=${handoff.execution_status}. Artifacts under run_dir/handoff and run_dir/artifacts. Parent: do not re-run executor; run post-work is extension-handled. Next: /harness-review unless blocked.`;
}
