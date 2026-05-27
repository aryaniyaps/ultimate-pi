/**
 * Content-aware gates for harness_artifact_ready (existence + minimal validity).
 */

import { constants } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { validateAgainstHarnessSchema } from "./harness-schema-validate.js";
import {
	TASK_CLARIFICATION_ARTIFACT,
	validateTaskClarificationDoc,
} from "./plan-task-clarification.js";

export interface ArtifactGateResult {
	ok: boolean;
	errors: string[];
}

const ARTIFACT_SCHEMA: Record<string, string> = {
	"artifacts/decomposition.yaml": "plan-decomposition-brief.schema.json",
	"artifacts/hypothesis.yaml": "plan-hypothesis-brief.schema.json",
	"artifacts/implementation-research.yaml":
		"plan-implementation-research-brief.schema.json",
	"artifacts/stack.yaml": "plan-stack-brief.schema.json",
	"artifacts/task-clarification.yaml": "plan-task-clarification.schema.json",
	"artifacts/planning-context.yaml": "plan-planning-context.schema.json",
	"artifacts/eval-verdict.yaml": "eval-verdict.schema.json",
	"artifacts/adversary-report.yaml": "adversary-report.schema.json",
	"artifacts/sentrux-repair-plan.yaml": "sentrux-repair-plan.schema.json",
};

const PREREQUISITE_ORDER: Record<string, string[]> = {
	"artifacts/planning-context.yaml": [TASK_CLARIFICATION_ARTIFACT],
	"artifacts/hypothesis.yaml": ["artifacts/decomposition.yaml"],
	"artifacts/implementation-research.yaml": [
		"artifacts/decomposition.yaml",
		"artifacts/hypothesis.yaml",
	],
	"artifacts/stack.yaml": [
		"artifacts/decomposition.yaml",
		"artifacts/hypothesis.yaml",
	],
};

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

function artifactStatusBad(doc: Record<string, unknown>): string | null {
	const status = String(doc.status ?? "ok").toLowerCase();
	if (status === "partial" || status === "failed" || status === "error") {
		return `artifact status is "${status}"`;
	}
	return null;
}

async function validatePlanningContextArtifact(
	normalized: string,
	doc: Record<string, unknown>,
): Promise<string[]> {
	const errors: string[] = [];
	if (normalized !== "artifacts/planning-context.yaml") return errors;
	const statusErr = artifactStatusBad(doc);
	if (statusErr) errors.push(`${normalized}: ${statusErr}`);
	const coverage = doc.coverage as Record<string, unknown> | undefined;
	if (!coverage || typeof coverage !== "object") return errors;
	for (const lane of ["architecture", "structure"] as const) {
		const laneDoc = coverage[lane] as Record<string, unknown> | undefined;
		const laneStatus = String(laneDoc?.status ?? "").toLowerCase();
		if (laneStatus !== "ok" && laneStatus !== "partial") {
			errors.push(
				`${normalized}: coverage.${lane}.status must be ok or partial (got "${laneStatus || "missing"}")`,
			);
		}
	}
	return errors;
}

async function validateArtifactPrerequisites(
	runRoot: string,
	normalized: string,
	prereqs: string[],
): Promise<string[]> {
	const errors: string[] = [];
	for (const prereq of prereqs) {
		const prereqPath = join(runRoot, prereq);
		if (!(await fileExists(prereqPath))) {
			errors.push(`${normalized}: prerequisite missing (${prereq})`);
			continue;
		}
		if (prereq !== TASK_CLARIFICATION_ARTIFACT) continue;
		try {
			const raw = await readFile(prereqPath, "utf-8");
			const prereqDoc = parseYaml(raw) as Record<string, unknown>;
			const clar = validateTaskClarificationDoc(prereqDoc, {
				requireReady: true,
			});
			if (!clar.ok) {
				errors.push(
					...clar.errors.map(
						(e) => `${normalized}: prerequisite ${prereq} — ${e}`,
					),
				);
			}
		} catch {
			errors.push(
				`${normalized}: prerequisite ${prereq} invalid or unreadable`,
			);
		}
	}
	return errors;
}

export async function validateHarnessArtifactFile(
	runRoot: string,
	relPath: string,
	specsDir: string,
): Promise<ArtifactGateResult> {
	const normalized = relPath.replace(/\\/g, "/");
	const abs = join(runRoot, normalized);
	const errors: string[] = [];

	if (!(await fileExists(abs))) {
		return { ok: false, errors: [`missing file: ${normalized}`] };
	}

	const st = await stat(abs);
	if (st.size < 8) {
		errors.push(`${normalized}: file too small (${st.size} bytes)`);
	}

	let doc: Record<string, unknown> | null = null;
	try {
		const raw = await readFile(abs, "utf-8");
		if (!raw.trim()) {
			errors.push(`${normalized}: empty file`);
		} else {
			doc = parseYaml(raw) as Record<string, unknown>;
			if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
				errors.push(`${normalized}: root must be a YAML object`);
			}
		}
	} catch (e) {
		errors.push(
			`${normalized}: invalid YAML (${e instanceof Error ? e.message : String(e)})`,
		);
	}

	const schemaFile = ARTIFACT_SCHEMA[normalized];
	if (doc && schemaFile) {
		const validation = await validateAgainstHarnessSchema(
			specsDir,
			schemaFile,
			doc,
		);
		if (!validation.ok) {
			errors.push(
				`${normalized}: schema validation failed — ${validation.errors.join("; ")}`,
			);
		}
	}

	if (doc && normalized === TASK_CLARIFICATION_ARTIFACT) {
		const clar = validateTaskClarificationDoc(doc, { requireReady: true });
		if (!clar.ok) {
			errors.push(...clar.errors.map((e) => `${normalized}: ${e}`));
		}
	}

	if (doc) {
		errors.push(...(await validatePlanningContextArtifact(normalized, doc)));
	}

	const prereqs = PREREQUISITE_ORDER[normalized] ?? [];
	errors.push(
		...(await validateArtifactPrerequisites(runRoot, normalized, prereqs)),
	);

	return { ok: errors.length === 0, errors };
}

export async function validateHarnessArtifactPaths(
	runRoot: string,
	paths: string[],
	specsDir: string,
): Promise<{
	ok: boolean;
	present: string[];
	missing: string[];
	errors: string[];
}> {
	const present: string[] = [];
	const missing: string[] = [];
	const errors: string[] = [];

	for (const rel of paths) {
		const normalized = rel.replace(/\\/g, "/");
		const gate = await validateHarnessArtifactFile(
			runRoot,
			normalized,
			specsDir,
		);
		if (gate.errors.some((e) => e.startsWith("missing file"))) {
			missing.push(normalized);
			continue;
		}
		if (!gate.ok) {
			errors.push(...gate.errors);
			continue;
		}
		present.push(normalized);
	}

	return {
		ok: missing.length === 0 && errors.length === 0,
		present,
		missing,
		errors,
	};
}
