/**
 * Deterministic plan auto-approve when gates pass (HARNESS_PLAN_AUTO_APPROVE).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { isHarnessNonInteractive } from "./ask-user/policy.js";
import type { PlanApprovalReadiness } from "./plan-approval-readiness.js";
import { loadPlanDebateEligibilitySnapshot } from "./plan-debate-eligibility-snapshot.js";
import type { PlanDebateGateResult } from "./plan-debate-gate.js";
import { readTaskClarificationDoc } from "./plan-task-clarification.js";

function missingPlanningContextReadinessError(error: string): boolean {
	return (
		error.includes("planning-context.yaml") ||
		error.includes("missing artifacts/planning-context.yaml") ||
		error.includes("missing:planning-reconnaissance")
	);
}

function missingPhase35ReadinessError(error: string): boolean {
	return (
		error.includes("implementation-research.yaml") ||
		error.includes("stack.yaml") ||
		error.includes("Phase 3.5")
	);
}

export const PLAN_APPROVAL_AUDIT_ARTIFACT =
	"artifacts/plan-approval-audit.yaml";

export function isHarnessPlanAutoApproveForce(): boolean {
	return (
		process.env.HARNESS_PLAN_AUTO_APPROVE?.trim().toLowerCase() === "force"
	);
}

export function isHarnessPlanAutoApproveEnabled(): boolean {
	const raw = process.env.HARNESS_PLAN_AUTO_APPROVE?.trim().toLowerCase();
	if (!raw || raw === "0" || raw === "false" || raw === "off") return false;
	if (raw === "force") return true;
	return raw === "1" || raw === "true" || raw === "on";
}

export interface AutoApprovePolicyInput {
	projectRoot: string;
	runId: string;
	riskLevel: string;
	readiness: PlanApprovalReadiness;
	debateGate: PlanDebateGateResult;
	dagPass?: boolean;
}

export interface AutoApprovePolicyResult {
	allowed: boolean;
	reasons: string[];
}

export async function canAutoApprovePlan(
	input: AutoApprovePolicyInput,
): Promise<AutoApprovePolicyResult> {
	const reasons: string[] = [];
	if (!isHarnessPlanAutoApproveEnabled()) {
		return { allowed: false, reasons: ["HARNESS_PLAN_AUTO_APPROVE not set"] };
	}
	if (!isHarnessPlanAutoApproveForce() && !isHarnessNonInteractive()) {
		reasons.push(
			"interactive session — set HARNESS_NON_INTERACTIVE=1 or HARNESS_PLAN_AUTO_APPROVE=force",
		);
	}
	const risk = String(input.riskLevel ?? "med").toLowerCase();
	const qaSmoke =
		process.env.HARNESS_QA_SMOKE === "1" && isHarnessNonInteractive();
	if (risk === "high" && !qaSmoke)
		reasons.push("high risk requires human approval");
	if (!input.readiness.ok) {
		for (const err of input.readiness.errors) {
			if (
				qaSmoke &&
				risk === "low" &&
				(missingPlanningContextReadinessError(err) ||
					missingPhase35ReadinessError(err))
			) {
				continue;
			}
			reasons.push(`readiness: ${err}`);
		}
	}
	if (!input.debateGate.ok) {
		reasons.push(...input.debateGate.errors.map((e) => `debate: ${e}`));
	}
	if (input.debateGate.warnings.some((w) => /block/i.test(w))) {
		reasons.push("debate gate warnings include blocker");
	}
	const runDir = join(input.projectRoot, ".pi", "harness", "runs", input.runId);
	const eligibility = await loadPlanDebateEligibilitySnapshot(runDir);
	if (eligibility?.human_required) {
		reasons.push("eligibility human_required=true");
	}
	const clar = await readTaskClarificationDoc(runDir);
	if (clar?.needs_clarification === true) {
		reasons.push("task-clarification needs_clarification");
	}
	if (input.dagPass === false) {
		reasons.push("DAG validation not passed");
	}
	return { allowed: reasons.length === 0, reasons };
}

export async function writePlanApprovalAudit(
	runDir: string,
	doc: Record<string, unknown>,
): Promise<void> {
	const abs = join(runDir, PLAN_APPROVAL_AUDIT_ARTIFACT);
	await mkdir(join(runDir, "artifacts"), { recursive: true });
	await writeFile(abs, stringifyYaml(doc), "utf-8");
}

export interface AutoApproveOutcome {
	approved: boolean;
	reasons: string[];
}

/** Returns whether auto-approve was applied (caller skips dialog when true). */
export async function tryAutoApprovePlan(
	input: AutoApprovePolicyInput,
): Promise<AutoApproveOutcome> {
	const policy = await canAutoApprovePlan(input);
	const runDir = join(input.projectRoot, ".pi", "harness", "runs", input.runId);
	await writePlanApprovalAudit(runDir, {
		schema_version: "1.0.0",
		source: policy.allowed ? "auto" : "blocked",
		captured_at: new Date().toISOString(),
		allowed: policy.allowed,
		reasons: policy.reasons,
		risk_level: input.riskLevel,
	});
	return { approved: policy.allowed, reasons: policy.reasons };
}
