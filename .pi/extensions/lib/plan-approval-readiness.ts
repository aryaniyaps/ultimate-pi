/**
 * Pre-approve_plan readiness checks (artifacts, scouts, phase status).
 */

import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export interface PlanApprovalReadiness {
	ok: boolean;
	errors: string[];
	warnings: string[];
}

const LEGACY_SCOUT_ARTIFACTS = [
	"artifacts/scout-graphify.yaml",
	"artifacts/scout-structure.yaml",
	"artifacts/scout-semantic.yaml",
] as const;

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

async function validateLegacyScouts(
	runDir: string,
	quick: boolean,
	errors: string[],
	warnings: string[],
): Promise<boolean> {
	let anyPresent = false;
	for (const rel of LEGACY_SCOUT_ARTIFACTS) {
		if (rel === "artifacts/scout-semantic.yaml" && quick) continue;
		const abs = join(runDir, rel);
		if (!(await fileExists(abs))) {
			const waived = await hasPhaseWaiver(runDir, `missing:${rel}`);
			if (!waived) {
				errors.push(`missing ${rel}`);
			}
			continue;
		}
		anyPresent = true;
		const doc = await readYamlObject(abs);
		const bad = artifactStatusBad(doc, rel);
		if (bad) {
			const waived = await hasPhaseWaiver(
				runDir,
				`scout:${rel}:${String(doc?.status ?? "")}`,
			);
			if (!waived) {
				errors.push(bad);
			}
		}
	}
	if (anyPresent) {
		warnings.push(
			"legacy scout YAML artifacts detected — prefer artifacts/planning-context.yaml (see ADR 0041)",
		);
	}
	return anyPresent;
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
	const hasLegacyScouts = hasPlanningContext
		? false
		: await validateLegacyScouts(runDir, quick, errors, warnings);

	if (!hasPlanningContext && !hasLegacyScouts) {
		const waived = await hasPhaseWaiver(
			runDir,
			"missing:planning-reconnaissance",
		);
		if (!waived) {
			errors.push(
				`missing ${PLANNING_CONTEXT_ARTIFACT} (or legacy scout-graphify/structure/semantic trio)`,
			);
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

	if (!(await fileExists(join(runDir, "artifacts/decomposition.yaml")))) {
		errors.push("missing artifacts/decomposition.yaml");
	}
	if (!(await fileExists(join(runDir, "artifacts/hypothesis.yaml")))) {
		errors.push("missing artifacts/hypothesis.yaml");
	}

	return { ok: errors.length === 0, errors, warnings };
}
