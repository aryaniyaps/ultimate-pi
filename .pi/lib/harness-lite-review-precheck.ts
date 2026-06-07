/**
 * Disk-backed lite-review guards (split from subagent precheck for testability).
 */

import {
	readAdversaryReportFromRun,
	readBenchmarkLogFromRun,
	readReviewOutcomeFromRun,
} from "./harness-run-context.js";

export interface LiteReviewPrecheckOptions {
	projectRoot?: string;
	runId?: string | null;
	lastOutcome?: string | null;
}

export async function priorBlockMergeFromDisk(
	opts?: LiteReviewPrecheckOptions,
): Promise<boolean> {
	const outcome = String(opts?.lastOutcome ?? "").toLowerCase();
	if (outcome.includes("block_merge") || outcome.includes("block")) {
		return true;
	}
	const runId = opts?.runId;
	const projectRoot = opts?.projectRoot;
	if (!runId || !projectRoot) return false;

	const adversary = await readAdversaryReportFromRun(runId, projectRoot);
	if (adversary?.block_merge === true) return true;

	const review = await readReviewOutcomeFromRun(runId, projectRoot);
	if (
		review?.adversary_status === "block_merge" ||
		(review?.remediation_class === "implementation_gap" &&
			review?.eval_status?.toLowerCase() === "pass")
	) {
		return true;
	}

	const benchmark = await readBenchmarkLogFromRun(runId, projectRoot);
	if (benchmark?.adversary_repro === "fail") return true;

	return false;
}

/** Lite review may skip adversary only when repro pack passed and no prior block_merge. */
export async function liteReviewMaySkipAdversary(
	opts?: LiteReviewPrecheckOptions,
): Promise<boolean> {
	if (await priorBlockMergeFromDisk(opts)) return false;
	const runId = opts?.runId;
	const projectRoot = opts?.projectRoot;
	if (!runId || !projectRoot) return false;
	const benchmark = await readBenchmarkLogFromRun(runId, projectRoot);
	return benchmark?.adversary_repro === "pass";
}
