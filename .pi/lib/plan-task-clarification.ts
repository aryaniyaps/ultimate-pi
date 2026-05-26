/**
 * Task clarification artifact (Phase 0) — readiness, hashing, write-order guards.
 */

import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export const TASK_CLARIFICATION_ARTIFACT = "artifacts/task-clarification.yaml";

/** Plan artifacts blocked until task clarification is ready. */
export const PLAN_ARTIFACTS_REQUIRING_CLARIFICATION = new Set([
	"artifacts/planning-context.yaml",
	"artifacts/decomposition.yaml",
	"artifacts/hypothesis.yaml",
	"artifacts/implementation-research.yaml",
	"artifacts/stack.yaml",
	"artifacts/plan-phase-status.yaml",
	"artifacts/plan-phase-waiver.yaml",
	"artifacts/execution-plan-draft.yaml",
	"artifacts/sentrux-manifest-proposal.yaml",
	"artifacts/ls-lint-manifest-proposal.yaml",
	"research-brief.yaml",
	"plan-packet.yaml",
]);

export function isPlanArtifactRequiringClarification(relPath: string): boolean {
	const normalized = relPath.replace(/\\/g, "/");
	if (PLAN_ARTIFACTS_REQUIRING_CLARIFICATION.has(normalized)) {
		return true;
	}
	if (
		/^artifacts\/review-round(-r\d+|-consolidated)?\.yaml$/i.test(normalized)
	) {
		return true;
	}
	if (
		/^artifacts\/(adversary|evaluator|sprint-audit|validation)-.*\.yaml$/i.test(
			normalized,
		)
	) {
		return true;
	}
	return false;
}

export function computeTaskInputHash(input: {
	sourceTask: string;
	riskLevel?: string;
	quick?: boolean;
}): string {
	const payload = [
		input.sourceTask.trim(),
		String(input.riskLevel ?? "").toLowerCase(),
		input.quick ? "quick" : "",
	].join("\n");
	return createHash("sha256")
		.update(payload, "utf8")
		.digest("hex")
		.slice(0, 16);
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

export async function readTaskClarificationDoc(
	runDir: string,
): Promise<Record<string, unknown> | null> {
	const path = join(runDir, TASK_CLARIFICATION_ARTIFACT);
	if (!(await fileExists(path))) return null;
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

export interface TaskClarificationReadiness {
	ok: boolean;
	errors: string[];
}

export function validateTaskClarificationDoc(
	doc: Record<string, unknown> | null,
	opts?: { requireReady?: boolean },
): TaskClarificationReadiness {
	const errors: string[] = [];
	if (!doc) {
		errors.push(`missing ${TASK_CLARIFICATION_ARTIFACT}`);
		return { ok: false, errors };
	}
	const status = String(doc.status ?? "").toLowerCase();
	const requireReady = opts?.requireReady !== false;
	if (requireReady && status !== "ready") {
		errors.push(
			`${TASK_CLARIFICATION_ARTIFACT}: status must be ready (got "${status || "missing"}")`,
		);
	}
	const clarified = String(doc.clarified_task ?? "").trim();
	if (requireReady && clarified.length < 8) {
		errors.push(
			`${TASK_CLARIFICATION_ARTIFACT}: clarified_task too short or missing`,
		);
	}
	const unresolved = doc.unresolved_questions;
	if (requireReady) {
		if (!Array.isArray(unresolved)) {
			errors.push(
				`${TASK_CLARIFICATION_ARTIFACT}: unresolved_questions must be an array`,
			);
		} else if (unresolved.length > 0) {
			errors.push(
				`${TASK_CLARIFICATION_ARTIFACT}: unresolved_questions must be empty before ready (${unresolved.length} remaining)`,
			);
		}
	}
	return { ok: errors.length === 0, errors };
}

export async function isTaskClarificationReady(
	runDir: string,
): Promise<TaskClarificationReadiness> {
	const doc = await readTaskClarificationDoc(runDir);
	return validateTaskClarificationDoc(doc, { requireReady: true });
}

export async function assertTaskClarificationReadyForPlanWrite(
	runDir: string,
	relPath: string,
): Promise<{ ok: boolean; message?: string }> {
	const normalized = relPath.replace(/\\/g, "/");
	if (normalized === TASK_CLARIFICATION_ARTIFACT) {
		return { ok: true };
	}
	if (!isPlanArtifactRequiringClarification(normalized)) {
		return { ok: true };
	}
	const readiness = await isTaskClarificationReady(runDir);
	if (!readiness.ok) {
		return {
			ok: false,
			message: `Blocked: ${normalized} requires ${TASK_CLARIFICATION_ARTIFACT} with status ready. ${readiness.errors.join("; ")}`,
		};
	}
	return { ok: true };
}
