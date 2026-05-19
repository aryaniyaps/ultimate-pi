/**
 * Resolve and guard harness run directories for subagent submit tools.
 */

import { realpath } from "node:fs/promises";
import { join, resolve } from "node:path";

export function harnessRunsRoot(projectRoot: string): string {
	return join(projectRoot, ".pi", "harness", "runs");
}

export async function resolveGuardedRunDir(opts: {
	projectRoot: string;
	runId: string;
	runDirEnv?: string;
}): Promise<{ ok: true; runDir: string } | { ok: false; error: string }> {
	const { projectRoot, runId } = opts;
	if (!runId.trim()) {
		return { ok: false, error: "run_id is required" };
	}
	const expected = join(harnessRunsRoot(projectRoot), runId);
	let candidate = opts.runDirEnv?.trim()
		? resolve(projectRoot, opts.runDirEnv)
		: expected;
	try {
		candidate = await realpath(candidate);
		const expectedReal = await realpath(expected);
		if (
			candidate !== expectedReal &&
			!candidate.startsWith(`${expectedReal}/`)
		) {
			return {
				ok: false,
				error: `run_dir must stay under ${expectedReal}`,
			};
		}
		return { ok: true, runDir: candidate };
	} catch {
		return { ok: false, error: `run directory not found for run_id=${runId}` };
	}
}
