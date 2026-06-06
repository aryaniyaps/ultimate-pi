/**
 * Detect repeated duplicate-spawn blocks (stall loops).
 */

import { stat } from "node:fs/promises";
import { join } from "node:path";
import { captureHarnessEvent } from "./harness-posthog.js";
import type { HarnessPhase } from "./harness-run-context.js";

const STALL_THRESHOLD = 3;

type StallKey = string;

const counters = new Map<StallKey, number>();

function stallKey(agent: string, artifactHash: string): StallKey {
	return `${agent}::${artifactHash}`;
}

async function artifactMtimeFingerprint(
	projectRoot: string,
	runId: string,
	artifactRel: string,
): Promise<string> {
	const path = join(projectRoot, ".pi", "harness", "runs", runId, artifactRel);
	try {
		const st = await stat(path);
		return `${artifactRel}:${st.mtimeMs}`;
	} catch {
		return `${artifactRel}:missing`;
	}
}

export function resetHarnessSpawnStallCounters(): void {
	counters.clear();
}

export function resetStallCounterForAgent(agent: string): void {
	for (const key of [...counters.keys()]) {
		if (key.startsWith(`${agent}::`)) counters.delete(key);
	}
}

/** Parse agent name from duplicate-spawn topology message. */
export function parseAgentFromDuplicateSpawnMessage(
	message: string,
): string | null {
	const m = /^Duplicate spawn blocked: ([^\s]+) already produced/.exec(message);
	return m?.[1] ?? null;
}

/** Parse artifact rel from duplicate-spawn topology message. */
export function parseArtifactFromDuplicateSpawnMessage(
	message: string,
): string | null {
	const m = /valid (artifacts\/[^\s.]+\.yaml)/.exec(message);
	return m?.[1] ?? null;
}

/**
 * Record a duplicate-spawn block; emit harness_observation stall when threshold hit.
 */
export async function recordDuplicateSpawnBlock(args: {
	message: string;
	projectRoot: string;
	runId: string | null;
	phase: HarnessPhase;
	sessionId: string;
}): Promise<{ stall: boolean; count: number }> {
	if (process.env.HARNESS_FORCE_RESPAWN === "1") {
		return { stall: false, count: 0 };
	}

	const agent = parseAgentFromDuplicateSpawnMessage(args.message);
	const artifactRel = parseArtifactFromDuplicateSpawnMessage(args.message);
	if (!agent || !artifactRel || !args.runId) {
		return { stall: false, count: 0 };
	}

	const hash = await artifactMtimeFingerprint(
		args.projectRoot,
		args.runId,
		artifactRel,
	);
	const key = stallKey(agent, hash);
	const next = (counters.get(key) ?? 0) + 1;
	counters.set(key, next);

	if (next < STALL_THRESHOLD) {
		return { stall: false, count: next };
	}

	captureHarnessEvent(args.sessionId, "harness_observation", {
		harness_run_id: args.runId,
		run_id: args.runId,
		harness_phase: args.phase,
		kind: "stall",
		agent_id: agent,
		artifact_path: artifactRel,
		artifact_hash: hash,
		duplicate_block_count: next,
		reason: "duplicate_spawn_loop",
	});

	return { stall: true, count: next };
}
