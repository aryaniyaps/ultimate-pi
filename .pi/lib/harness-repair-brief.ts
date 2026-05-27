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
	const sentruxRepair = await readArtifactYaml(
		runRoot,
		"artifacts/sentrux-repair-plan.yaml",
		"sentrux-repair-plan",
	);

	const remediation =
		(typeof review?.remediation_class === "string" &&
			review.remediation_class) ||
		"implementation_gap";

	const sourceArtifacts = buildSourceArtifacts(input, planRel, {
		evalDoc,
		adversary,
		plan,
		sentruxRepair,
	});

	const failedIds = [
		...stringList(review?.failed_acceptance_check_ids),
		...stringList(evalDoc?.failed_acceptance_check_ids),
		...stringList(evalDoc?.failed_checks),
	];
	const uniqueFailed = [...new Set(failedIds)];

	const fixDirectives: string[] = sentruxFixDirectives(sentruxRepair);
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

	const priorityLakeIds = collectPriorityLakeIds(plan);

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

function buildSourceArtifacts(
	input: SynthesizeRepairBriefInput,
	planRel: string,
	docs: {
		evalDoc: Record<string, unknown> | null;
		adversary: Record<string, unknown> | null;
		plan: Record<string, unknown> | null;
		sentruxRepair: Record<string, unknown> | null;
	},
): Record<string, string> {
	const sourceArtifacts: Record<string, string> = {
		"review-outcome":
			input.reviewOutcomePath ?? "artifacts/review-outcome.yaml",
	};
	if (docs.evalDoc)
		sourceArtifacts["eval-verdict"] =
			input.evalVerdictPath ?? "artifacts/eval-verdict.yaml";
	if (docs.adversary)
		sourceArtifacts["adversary-report"] =
			input.adversaryReportPath ?? "artifacts/adversary-report.yaml";
	if (docs.plan) sourceArtifacts["plan-packet"] = planRel;
	if (docs.sentruxRepair)
		sourceArtifacts["sentrux-repair-plan"] =
			"artifacts/sentrux-repair-plan.yaml";
	return sourceArtifacts;
}

function sentruxFixDirectives(
	sentruxRepair: Record<string, unknown> | null,
): string[] {
	if (!sentruxRepair) return [];
	const out: string[] = [];
	const actions = Array.isArray(sentruxRepair.actions)
		? sentruxRepair.actions
		: [];
	for (const raw of actions) {
		const action = asRecord(raw);
		if (!action) continue;
		const id = typeof action.id === "string" ? action.id : "action";
		const target = typeof action.target === "string" ? action.target : "";
		const instruction =
			typeof action.instruction === "string" ? action.instruction : "";
		if (instruction)
			out.push(`[sentrux:${id}] ${target}: ${instruction}`.trim());
	}
	if (
		typeof sentruxRepair.summary === "string" &&
		sentruxRepair.summary.trim()
	) {
		out.unshift(`[sentrux] ${sentruxRepair.summary.trim()}`);
	}
	for (const v of stringList(sentruxRepair.verification)) {
		out.push(`[sentrux:verify] ${v}`);
	}
	return out;
}

function collectPriorityLakeIds(
	plan: Record<string, unknown> | null,
): string[] {
	const execPlan = asRecord(plan?.execution_plan);
	const ids = stringList(execPlan?.critical_path_lake_ids);
	if (ids.length > 0) return ids;
	const lakes = Array.isArray(execPlan?.lakes) ? execPlan.lakes : [];
	for (const lake of lakes) {
		const record = asRecord(lake);
		if (record && typeof record.id === "string") ids.push(record.id);
	}
	return ids;
}
