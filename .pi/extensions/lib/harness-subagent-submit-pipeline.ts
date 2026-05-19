/**
 * Shared write pipeline for harness subagent submit tools.
 */

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
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
