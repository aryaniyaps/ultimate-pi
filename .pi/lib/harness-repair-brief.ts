/**
 * Build repair-brief.yaml from on-disk review artifacts (path-first, ADR 0043/0044).
 */

import { join } from "node:path";
import { harnessRunsRoot } from "./harness-run-context.js";
import { readYamlFile } from "./harness-yaml.js";

const REPAIR_BRIEF_SCHEMA = "1.0.0";

function asRecord(v: unknown): Record<string, unknown> | null {
	return v && typeof v === "object" && !Array.isArray(v)
		? (v as Record<string, unknown>)
		: null;
}

function stringList(v: unknown): string[] {
	if (!Array.isArray(v)) return [];
	return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
}

async function readArtifactYaml(
	runRoot: string,
	rel: string,
	label: string,
): Promise<Record<string, unknown> | null> {
	const trimmed = rel.replace(/\\/g, "/").replace(/^\.\//, "");
	try {
		return asRecord(await readYamlFile(join(runRoot, trimmed), label));
	} catch {
		return null;
	}
}

export interface SynthesizeRepairBriefInput {
	runId: string;
	projectRoot: string;
	steerAttempt: number;
	reviewOutcomePath?: string;
	evalVerdictPath?: string;
	adversaryReportPath?: string;
	planPacketPath?: string;
}

export async function synthesizeRepairBrief(
	input: SynthesizeRepairBriefInput,
): Promise<Record<string, unknown>> {
	const runRoot = join(harnessRunsRoot(input.projectRoot), input.runId);
	const review = await readArtifactYaml(
		runRoot,
		input.reviewOutcomePath ?? "artifacts/review-outcome.yaml",
		"review-outcome",
	);
	const evalDoc = await readArtifactYaml(
		runRoot,
		input.evalVerdictPath ?? "artifacts/eval-verdict.yaml",
		"eval-verdict",
	);
	const adversary = await readArtifactYaml(
		runRoot,
		input.adversaryReportPath ?? "artifacts/adversary-report.yaml",
		"adversary-report",
	);
	const planRel =
		input.planPacketPath?.replace(/\\/g, "/") ?? "plan-packet.yaml";
	const plan = await readArtifactYaml(runRoot, planRel, "plan-packet");

	const remediation =
		(typeof review?.remediation_class === "string" &&
			review.remediation_class) ||
		"implementation_gap";

	const sourceArtifacts: Record<string, string> = {
		"review-outcome":
			input.reviewOutcomePath ?? "artifacts/review-outcome.yaml",
	};
	if (evalDoc) {
		sourceArtifacts["eval-verdict"] =
			input.evalVerdictPath ?? "artifacts/eval-verdict.yaml";
	}
	if (adversary) {
		sourceArtifacts["adversary-report"] =
			input.adversaryReportPath ?? "artifacts/adversary-report.yaml";
	}
	if (plan) {
		sourceArtifacts["plan-packet"] = planRel;
	}

	const failedIds = [
		...stringList(review?.failed_acceptance_check_ids),
		...stringList(evalDoc?.failed_acceptance_check_ids),
		...stringList(evalDoc?.failed_checks),
	];
	const uniqueFailed = [...new Set(failedIds)];

	const fixDirectives: string[] = [];
	for (const key of [
		"fix_directives",
		"repair_directives",
		"recommendations",
		"required_fixes",
	]) {
		fixDirectives.push(...stringList(review?.[key]));
		fixDirectives.push(...stringList(adversary?.[key]));
		fixDirectives.push(...stringList(evalDoc?.[key]));
	}
	if (typeof adversary?.summary === "string" && adversary.summary.trim()) {
		fixDirectives.push(adversary.summary.trim());
	}
	if (typeof evalDoc?.summary === "string" && evalDoc.summary.trim()) {
		fixDirectives.push(evalDoc.summary.trim());
	}
	const uniqueFixes = [...new Set(fixDirectives)];
	if (uniqueFixes.length === 0) {
		uniqueFixes.push(
			"Address failures documented in review-outcome and eval-verdict; re-run acceptance checks.",
		);
	}

	const execPlan = asRecord(plan?.execution_plan);
	const priorityLakeIds = stringList(execPlan?.critical_path_lake_ids);
	if (priorityLakeIds.length === 0) {
		const lakes = Array.isArray(execPlan?.lakes) ? execPlan.lakes : [];
		for (const lake of lakes) {
			const l = asRecord(lake);
			if (l && typeof l.id === "string") priorityLakeIds.push(l.id);
		}
	}

	const brief: Record<string, unknown> = {
		schema_version: REPAIR_BRIEF_SCHEMA,
		run_id: input.runId,
		steer_attempt: input.steerAttempt,
		remediation_class: remediation,
		source_artifacts: sourceArtifacts,
		fix_directives: uniqueFixes,
	};
	if (uniqueFailed.length > 0) {
		brief.failed_acceptance_check_ids = uniqueFailed;
	}
	if (priorityLakeIds.length > 0) {
		brief.priority_lake_ids = [...new Set(priorityLakeIds)];
	}
	return brief;
}
