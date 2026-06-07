/**
 * Pre-approve_plan readiness checks (planning context, research, phase status).
 */

import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { synthesizerArtifactsComplete } from "./harness-plan-route.js";
import {
	isTaskClarificationReady,
	TASK_CLARIFICATION_ARTIFACT,
} from "./plan-task-clarification.js";

export interface PlanApprovalReadiness {
	ok: boolean;
	errors: string[];
	warnings: string[];
}

const PLANNING_CONTEXT_ARTIFACT = "artifacts/planning-context.yaml";

const PHASE35_ARTIFACTS = [
	"artifacts/implementation-research.yaml",
	"artifacts/stack.yaml",
] as const;

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

async function readYamlObject(
	path: string,
): Promise<Record<string, unknown> | null> {
	try {
		const raw = await readFile(path, "utf-8");
		const doc = parseYaml(raw) as unknown;
		return doc && typeof doc === "object" && !Array.isArray(doc)
			? (doc as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

async function hasPhaseWaiver(
	runDir: string,
	reason: string,
): Promise<boolean> {
	const path = join(runDir, "artifacts", "plan-phase-waiver.yaml");
	const doc = await readYamlObject(path);
	if (!doc) return false;
	const waived = doc.waived as unknown;
	if (!Array.isArray(waived)) return false;
	return waived.some((w) => {
		if (!w || typeof w !== "object") return false;
		const entry = w as Record<string, unknown>;
		return String(entry.reason ?? "") === reason;
	});
}

function artifactStatusBad(
	doc: Record<string, unknown> | null,
	label: string,
): string | null {
	const status = String(doc?.status ?? "ok").toLowerCase();
	if (status === "partial" || status === "failed" || status === "error") {
		return `${label}: status "${status}" without waiver`;
	}
	return null;
}

function coverageLaneStatus(
	doc: Record<string, unknown> | null,
	lane: string,
): string {
	const coverage = doc?.coverage as Record<string, unknown> | undefined;
	if (!coverage || typeof coverage !== "object") return "";
	const laneDoc = coverage[lane] as Record<string, unknown> | undefined;
	return String(laneDoc?.status ?? "").toLowerCase();
}

async function validatePlanningContext(
	runDir: string,
	quick: boolean,
	errors: string[],
): Promise<boolean> {
	const rel = PLANNING_CONTEXT_ARTIFACT;
	const abs = join(runDir, rel);
	if (!(await fileExists(abs))) {
		return false;
	}
	const doc = await readYamlObject(abs);
	const bad = artifactStatusBad(doc, rel);
	if (bad) {
		const waived = await hasPhaseWaiver(
			runDir,
			`planning-context:${String(doc?.status ?? "")}`,
		);
		if (!waived) {
			errors.push(bad);
		}
	}
	const arch = coverageLaneStatus(doc, "architecture");
	const structure = coverageLaneStatus(doc, "structure");
	if (arch !== "ok" && arch !== "partial") {
		errors.push(
			`${rel}: coverage.architecture.status must be ok or partial (got "${arch || "missing"}")`,
		);
	}
	if (structure !== "ok" && structure !== "partial") {
		errors.push(
			`${rel}: coverage.structure.status must be ok or partial (got "${structure || "missing"}")`,
		);
	}
	if (!quick) {
		const semantic = coverageLaneStatus(doc, "semantic");
		if (
			semantic &&
			semantic !== "ok" &&
			semantic !== "partial" &&
			semantic !== "skipped"
		) {
			errors.push(
				`${rel}: coverage.semantic.status must be ok, partial, or skipped (got "${semantic}")`,
			);
		}
	}
	return true;
}

export async function validatePlanApprovalReadiness(
	projectRoot: string,
	runId: string,
	opts?: { risk_level?: string; quick?: boolean },
): Promise<PlanApprovalReadiness> {
	const runDir = join(projectRoot, ".pi", "harness", "runs", runId);
	const errors: string[] = [];
	const warnings: string[] = [];
	const risk = String(opts?.risk_level ?? "med").toLowerCase();
	const quick = opts?.quick === true;

	const clarReady = await isTaskClarificationReady(runDir);
	if (!clarReady.ok) {
		const waived = await hasPhaseWaiver(runDir, "missing:task-clarification");
		if (!waived) {
			errors.push(...clarReady.errors);
		}
	}

	const statusPath = join(runDir, "artifacts", "plan-phase-status.yaml");
	const statusDoc = await readYamlObject(statusPath);
	if (statusDoc) {
		const planStatus = String(statusDoc.plan_status ?? "").toLowerCase();
		if (planStatus === "partial" || planStatus === "needs_clarification") {
			const waived = await hasPhaseWaiver(runDir, `plan_status:${planStatus}`);
			if (!waived) {
				errors.push(
					`plan phase status is "${planStatus}" — resolve gaps, set plan_status ready, or write artifacts/plan-phase-waiver.yaml`,
				);
			}
		}
	}

	const hasPlanningContext = await validatePlanningContext(
		runDir,
		quick,
		errors,
	);

	if (hasPlanningContext) {
		const ctxDoc = await readYamlObject(
			join(runDir, PLANNING_CONTEXT_ARTIFACT),
		);
		const taskRef = String(ctxDoc?.task_ref ?? "").trim();
		if (
			taskRef &&
			taskRef !== TASK_CLARIFICATION_ARTIFACT &&
			!taskRef.endsWith("task-clarification.yaml")
		) {
			warnings.push(
				`${PLANNING_CONTEXT_ARTIFACT}: task_ref should point at ${TASK_CLARIFICATION_ARTIFACT}`,
			);
		} else if (!taskRef) {
			warnings.push(
				`${PLANNING_CONTEXT_ARTIFACT}: set task_ref to ${TASK_CLARIFICATION_ARTIFACT}`,
			);
		}
	}

	if (!hasPlanningContext) {
		const waived = await hasPhaseWaiver(
			runDir,
			"missing:planning-reconnaissance",
		);
		if (!waived) {
			errors.push(`missing ${PLANNING_CONTEXT_ARTIFACT}`);
		}
	}

	for (const rel of PHASE35_ARTIFACTS) {
		const abs = join(runDir, rel);
		if (!(await fileExists(abs))) {
			if (risk === "high" || risk === "med") {
				errors.push(`missing ${rel} (Phase 3.5 required for risk ${risk})`);
			} else {
				warnings.push(`missing ${rel} (recommended for risk ${risk})`);
			}
		}
	}

	const synthComplete = await synthesizerArtifactsComplete(runDir);
	if (!synthComplete) {
		if (!(await fileExists(join(runDir, "artifacts/decomposition.yaml")))) {
			errors.push("missing artifacts/decomposition.yaml");
		}
		if (!(await fileExists(join(runDir, "artifacts/hypothesis.yaml")))) {
			errors.push("missing artifacts/hypothesis.yaml");
		}
	}

	return { ok: errors.length === 0, errors, warnings };
}
