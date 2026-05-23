/**
 * Harness subagent spawn topology rules (no vendor imports — testable in isolation).
 */

import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import type { HarnessPhase } from "../../lib/harness-run-context.js";

export interface SpawnTopologyResult {
	ok: boolean;
	message?: string;
}

const DECOMPOSE_AGENT = "harness/planning/decompose";
const HYPOTHESIS_AGENT = "harness/planning/hypothesis";

const DEBATE_LANE_AGENTS = new Set([
	"harness/planning/hypothesis-validator",
	"harness/planning/plan-evaluator",
	"harness/planning/plan-adversary",
	"harness/planning/sprint-contract-auditor",
	"harness/planning/review-integrator",
]);

const PLANNING_CONTEXT_AGENT = "harness/planning/planning-context";

const PARALLEL_RESEARCH_AGENTS = new Set([
	"harness/planning/implementation-researcher",
	"harness/planning/stack-researcher",
]);

function countInSet(names: string[], allowed: Set<string>): number {
	return names.filter((n) => allowed.has(n)).length;
}

function isReconnaissanceAgent(name: string): boolean {
	return name === PLANNING_CONTEXT_AGENT;
}

async function decompositionReady(
	projectRoot: string,
	runId: string,
): Promise<boolean> {
	const path = join(
		projectRoot,
		".pi",
		"harness",
		"runs",
		runId,
		"artifacts",
		"decomposition.yaml",
	);
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

export async function validateHarnessSpawnTopology(
	names: string[],
	phase: HarnessPhase,
	opts?: {
		parallelTaskCount?: number;
		projectRoot?: string;
		runId?: string | null;
	},
): Promise<SpawnTopologyResult> {
	const taskCount =
		opts?.parallelTaskCount ?? (names.length > 1 ? names.length : 1);

	if (taskCount > 1) {
		const hasDecompose = names.includes(DECOMPOSE_AGENT);
		const hasHypothesis = names.includes(HYPOTHESIS_AGENT);
		if (hasDecompose && hasHypothesis) {
			return {
				ok: false,
				message:
					"Cannot spawn decompose and hypothesis in the same parallel batch. " +
					"Gate artifacts/decomposition.yaml, then spawn hypothesis sequentially.",
			};
		}

		const debateCount = countInSet(names, DEBATE_LANE_AGENTS);
		const debateNames = names.filter((n) => DEBATE_LANE_AGENTS.has(n));
		const parallelProbePair =
			debateCount === 2 &&
			debateNames.includes("harness/planning/plan-evaluator") &&
			debateNames.includes("harness/planning/plan-adversary");
		if (debateCount > 1 && !parallelProbePair) {
			return {
				ok: false,
				message: `Review Gate: spawn one debate lane agent per subagent call (got ${debateCount}: ${debateNames.join(", ")}). Exception: plan-evaluator ∥ plan-adversary for parallel_probes.`,
			};
		}

		const planningContext = names.filter(
			(n) => n === PLANNING_CONTEXT_AGENT,
		).length;
		const research = countInSet(names, PARALLEL_RESEARCH_AGENTS);
		const recon = planningContext;

		if (planningContext > 1) {
			return {
				ok: false,
				message: "At most one planning-context subagent per parallel batch.",
			};
		}

		const otherHarness = names.filter(
			(n) =>
				n.startsWith("harness/") &&
				!isReconnaissanceAgent(n) &&
				!PARALLEL_RESEARCH_AGENTS.has(n) &&
				!DEBATE_LANE_AGENTS.has(n) &&
				n !== DECOMPOSE_AGENT &&
				n !== HYPOTHESIS_AGENT,
		);
		if (
			(recon > 0 && (research > 0 || otherHarness.length > 0)) ||
			(research > 0 && otherHarness.length > 0)
		) {
			return {
				ok: false,
				message:
					"Parallel batches may include only one independent group: " +
					"research (≤2 lanes), optional single planning-context, " +
					"or a single sequential lane agent.",
			};
		}
		if (research > 2) {
			return {
				ok: false,
				message:
					"At most 2 research lanes (implementation-researcher, stack-researcher) per parallel batch.",
			};
		}
	}

	if (names.includes(HYPOTHESIS_AGENT) && opts?.projectRoot && opts?.runId) {
		const ready = await decompositionReady(opts.projectRoot, opts.runId);
		if (!ready) {
			return {
				ok: false,
				message:
					"Cannot spawn hypothesis before artifacts/decomposition.yaml exists. " +
					"Complete decompose and harness_artifact_ready on decomposition first.",
			};
		}
	}

	if (phase === "plan") {
		const mutating = names.filter((n) => n.startsWith("harness/running/"));
		if (mutating.length > 0) {
			return {
				ok: false,
				message: `Plan phase: cannot spawn mutating subagents (${mutating.join(", ")}).`,
			};
		}
	}

	return { ok: true };
}
