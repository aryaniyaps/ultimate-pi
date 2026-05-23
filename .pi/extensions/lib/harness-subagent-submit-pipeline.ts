/**
 * Shared write pipeline for harness subagent submit tools.
 */

import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { validateAgainstHarnessSchema } from "../../lib/harness-schema-validate.js";
import { resolveGuardedRunDir } from "../../lib/harness-subagent-submit-path.js";
import { writeYamlFile } from "../../lib/harness-yaml.js";
import {
	resolveArtifactRelPath,
	type SubmitToolSpec,
} from "./harness-subagent-submit-registry.js";
import {
	type ApplyDebateLaneResult,
	applyDebateLaneFromDoc,
} from "./plan-debate-lane.js";

export interface SubmitPipelineResult {
	ok: boolean;
	artifact_path?: string;
	validation_errors?: string[];
	lane_result?: ApplyDebateLaneResult;
	human_required?: boolean;
}

export async function loadSubmitDocument(opts: {
	projectRoot: string;
	runDir: string;
	document?: Record<string, unknown>;
	source_path?: string;
}): Promise<
	| { ok: true; document: Record<string, unknown> }
	| { ok: false; validation_errors: string[] }
> {
	if (opts.document && typeof opts.document === "object") {
		return { ok: true, document: opts.document };
	}
	const rel = opts.source_path?.trim();
	if (!rel) {
		return {
			ok: false,
			validation_errors: ["submit_* requires document or source_path"],
		};
	}
	const abs = resolve(opts.runDir, rel.replace(/^\//, ""));
	if (!abs.startsWith(resolve(opts.runDir))) {
		return {
			ok: false,
			validation_errors: [
				"source_path must stay under the active run directory",
			],
		};
	}
	try {
		const raw = await readFile(abs, "utf-8");
		const { parse } = await import("yaml");
		const doc = parse(raw) as Record<string, unknown>;
		if (!doc || typeof doc !== "object") {
			return {
				ok: false,
				validation_errors: ["source_path did not parse to an object"],
			};
		}
		return { ok: true, document: doc };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return {
			ok: false,
			validation_errors: [`source_path read failed: ${msg}`],
		};
	}
}

export async function executeSubmitPipeline(opts: {
	projectRoot: string;
	specsDir: string;
	spec: SubmitToolSpec;
	agentId: string;
	document: Record<string, unknown>;
	runId: string;
	runDirEnv?: string;
}): Promise<SubmitPipelineResult> {
	const runResolved = await resolveGuardedRunDir({
		projectRoot: opts.projectRoot,
		runId: opts.runId,
		runDirEnv: opts.runDirEnv,
	});
	if (!runResolved.ok) {
		return { ok: false, validation_errors: [runResolved.error] };
	}

	const validation = await validateAgainstHarnessSchema(
		opts.specsDir,
		opts.spec.schemaFile,
		opts.document,
	);
	if (!validation.ok) {
		return { ok: false, validation_errors: validation.errors };
	}

	const relPath = resolveArtifactRelPath(opts.spec, opts.document);
	const absPath = join(runResolved.runDir, relPath);
	await mkdir(dirname(absPath), { recursive: true });
	await writeYamlFile(absPath, opts.document);

	if (opts.spec.toolName === "submit_executor_handoff") {
		const rollback = opts.document.rollback_refs;
		if (rollback && typeof rollback === "object" && !Array.isArray(rollback)) {
			const rollbackPath = join(
				runResolved.runDir,
				"artifacts",
				"executor-rollback.yaml",
			);
			await mkdir(dirname(rollbackPath), { recursive: true });
			await writeYamlFile(rollbackPath, {
				schema_version: "1.0.0",
				...(rollback as Record<string, unknown>),
			});
		}
	}

	let laneResult: ApplyDebateLaneResult | undefined;
	if (opts.spec.debateLane) {
		laneResult = await applyDebateLaneFromDoc({
			runDir: runResolved.runDir,
			lane: opts.spec.debateLane,
			doc: opts.document,
		});
		if (!laneResult.ok) {
			return {
				ok: false,
				artifact_path: relPath,
				validation_errors: laneResult.errors,
				lane_result: laneResult,
			};
		}
	}

	return {
		ok: true,
		artifact_path: relPath,
		lane_result: laneResult,
		human_required: opts.spec.humanRequired === true,
	};
}
