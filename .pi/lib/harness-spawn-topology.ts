/**
 * Harness subagent spawn topology rules (no vendor imports — testable in isolation).
 */

import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import type { HarnessPhase } from "./harness-run-context.js";
import { isTaskClarificationReady } from "./plan-task-clarification.js";

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

const CLARIFICATION_GATED_AGENTS = new Set([
	PLANNING_CONTEXT_AGENT,
	DECOMPOSE_AGENT,
	HYPOTHESIS_AGENT,
	...PARALLEL_RESEARCH_AGENTS,
	...DEBATE_LANE_AGENTS,
	"harness/planning/plan-synthesizer",
	"harness/planning/execution-plan-author",
	"harness/sentrux-steward",
	"harness/ls-lint-steward",
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
function validateParallelBatch(
	names: string[],
	taskCount: number,
): string | null {
	if (taskCount <= 1) return null;
	const hasDecompose = names.includes(DECOMPOSE_AGENT);
	const hasHypothesis = names.includes(HYPOTHESIS_AGENT);
	if (hasDecompose && hasHypothesis) {
		return (
			"Cannot spawn decompose and hypothesis in the same parallel batch. " +
			"Gate artifacts/decomposition.yaml, then spawn hypothesis sequentially."
		);
	}

	const debateCount = countInSet(names, DEBATE_LANE_AGENTS);
	const debateNames = names.filter((n) => DEBATE_LANE_AGENTS.has(n));
	const parallelProbePair =
		debateCount === 2 &&
		debateNames.includes("harness/planning/plan-evaluator") &&
		debateNames.includes("harness/planning/plan-adversary");
	if (debateCount > 1 && !parallelProbePair) {
		return `Review Gate: spawn one debate lane agent per subagent call (got ${debateCount}: ${debateNames.join(", ")}). Exception: plan-evaluator ∥ plan-adversary for parallel_probes.`;
	}

	const planningContext = names.filter(
		(n) => n === PLANNING_CONTEXT_AGENT,
	).length;
	const research = countInSet(names, PARALLEL_RESEARCH_AGENTS);
	const recon = planningContext;
	if (planningContext > 1) {
		return "At most one planning-context subagent per parallel batch.";
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
		return (
			"Parallel batches may include only one independent group: " +
			"research (≤2 lanes), optional single planning-context, " +
			"or a single sequential lane agent."
		);
	}
	if (research > 2) {
		return "At most 2 research lanes (implementation-researcher, stack-researcher) per parallel batch.";
	}
	return null;
}

async function validateClarificationGate(
	names: string[],
	phase: HarnessPhase,
	opts?: { projectRoot?: string; runId?: string | null },
): Promise<string | null> {
	if (!(phase === "plan" && opts?.projectRoot && opts?.runId)) return null;
	const needsClar = names.some((n) => CLARIFICATION_GATED_AGENTS.has(n));
	if (!needsClar) return null;
	const runDir = join(opts.projectRoot, ".pi", "harness", "runs", opts.runId);
	const clar = await isTaskClarificationReady(runDir);
	if (clar.ok) return null;
	return (
		"Cannot spawn planning subagents before task clarification is ready. " +
		`Complete Phase 0 and harness_artifact_ready on artifacts/task-clarification.yaml. ${clar.errors.join("; ")}`
	);
}

async function validateHypothesisDependency(
	names: string[],
	opts?: { projectRoot?: string; runId?: string | null },
): Promise<string | null> {
	if (!(names.includes(HYPOTHESIS_AGENT) && opts?.projectRoot && opts?.runId)) {
		return null;
	}
	const ready = await decompositionReady(opts.projectRoot, opts.runId);
	if (ready) return null;
	return (
		"Cannot spawn hypothesis before artifacts/decomposition.yaml exists. " +
		"Complete decompose and harness_artifact_ready on decomposition first."
	);
}

function validatePlanPhaseMutations(
	names: string[],
	phase: HarnessPhase,
): string | null {
	if (phase !== "plan") return null;
	const mutating = names.filter((n) => n.startsWith("harness/running/"));
	if (mutating.length === 0) return null;
	return `Plan phase: cannot spawn mutating subagents (${mutating.join(", ")}).`;
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

	const parallelError = validateParallelBatch(names, taskCount);
	if (parallelError) return { ok: false, message: parallelError };

	const clarError = await validateClarificationGate(names, phase, opts);
	if (clarError) return { ok: false, message: clarError };

	const hypothesisError = await validateHypothesisDependency(names, opts);
	if (hypothesisError) return { ok: false, message: hypothesisError };

	const mutationError = validatePlanPhaseMutations(names, phase);
	if (mutationError) return { ok: false, message: mutationError };

	return { ok: true };
}
