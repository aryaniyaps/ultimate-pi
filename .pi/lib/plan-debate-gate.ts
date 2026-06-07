/**
 * P0 — plan debate artifact + bus gates before approve_plan.
 */

import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { isHarnessNonInteractive } from "./ask-user/policy.js";
import { capsForDebate } from "./debate-bus-core.js";
import { isHarnessBudgetEnforceOn } from "./harness-budget-enforce.js";
import type {
	DebateEligibilityResult,
	DebateProfile,
} from "./plan-debate-eligibility.js";
import { loadPlanDebateEligibilitySnapshot } from "./plan-debate-eligibility-snapshot.js";
import {
	getPlanFocusCoverage,
	type PlanDebateFocus,
	planDebateOutcomeComplete,
} from "./plan-debate-focus.js";
import { planDebateIdForRun } from "./plan-debate-id.js";
import {
	laneArtifactPathsForConsolidatedRound,
	laneArtifactPathsForParallelProbesRound,
	laneArtifactPathsForRound,
} from "./plan-debate-lanes.js";
import { getPlanDebateRoundStatus } from "./plan-debate-round-status.js";
import {
	checkDebateWallClock,
	debateWallClockRecoveryHint,
} from "./plan-debate-wall-clock.js";
import {
	getMessengerRoundState,
	loadMessengerState,
	messengerRoundDebateReady,
} from "./plan-messenger.js";
import {
	CONSOLIDATED_REVIEW_ARTIFACT,
	effectiveMinFocusRounds,
	isConsolidatedReviewStrategy,
	isParallelProbesReviewStrategy,
	PARALLEL_PROBES_REVIEW_ARTIFACT,
	planReviewGateStrategyFromEligibility,
	reviewStrategyFromMessenger,
} from "./plan-review-gate.js";

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

async function countJsonlKinds(
	debateJsonlPath: string,
): Promise<{ rounds: number; hasConsensus: boolean }> {
	try {
		const raw = await readFile(debateJsonlPath, "utf-8");
		let rounds = 0;
		let hasConsensus = false;
		for (const line of raw.split("\n")) {
			if (!line.trim()) continue;
			const ev = JSON.parse(line) as { kind?: string };
			if (ev.kind === "round") rounds += 1;
			if (ev.kind === "consensus") hasConsensus = true;
		}
		return { rounds, hasConsensus };
	} catch {
		return { rounds: 0, hasConsensus: false };
	}
}

async function collectStrategyErrors(args: {
	runDir: string;
	coverage: any;
	reviewStrategy: any;
	dialogueOpts: { max_exchanges_per_round: number };
}): Promise<string[]> {
	const { runDir, coverage, reviewStrategy, dialogueOpts } = args;
	const errors: string[] = [];
	const consolidated = isConsolidatedReviewStrategy(reviewStrategy);
	const parallelProbes = isParallelProbesReviewStrategy(reviewStrategy);

	if (parallelProbes) {
		for (const rel of laneArtifactPathsForParallelProbesRound()) {
			if (!(await fileExists(join(runDir, rel)))) errors.push(`missing ${rel}`);
		}
		const messengerCheck = messengerRoundDebateReady(
			await getMessengerRoundState(runDir, 1),
			false,
			dialogueOpts,
		);
		if (!messengerCheck.ok) {
			for (const e of messengerCheck.errors) {
				errors.push(`parallel_probes round messenger: ${e}`);
			}
		}
		return errors;
	}

	if (consolidated) {
		if (!(await fileExists(join(runDir, CONSOLIDATED_REVIEW_ARTIFACT)))) {
			errors.push(`missing ${CONSOLIDATED_REVIEW_ARTIFACT}`);
		}
		for (const rel of laneArtifactPathsForConsolidatedRound()) {
			if (!(await fileExists(join(runDir, rel)))) errors.push(`missing ${rel}`);
		}
		const messengerCheck = messengerRoundDebateReady(
			await getMessengerRoundState(runDir, 1),
			true,
			dialogueOpts,
		);
		if (!messengerCheck.ok) {
			for (const e of messengerCheck.errors) {
				errors.push(`consolidated round messenger: ${e}`);
			}
		}
		return errors;
	}

	const roundIndices = [
		...new Set(
			Object.values(coverage.rounds_by_focus).filter(
				(v): v is number => typeof v === "number",
			),
		),
	];
	for (const r of roundIndices) {
		const focus = coverage.focus_by_round[r] ?? null;
		for (const rel of laneArtifactPathsForRound(r, focus)) {
			if (!(await fileExists(join(runDir, rel)))) errors.push(`missing ${rel}`);
		}
		const messengerCheck = messengerRoundDebateReady(
			await getMessengerRoundState(runDir, r),
			focus === "quality" || r >= 4,
			dialogueOpts,
		);
		if (!messengerCheck.ok) {
			for (const e of messengerCheck.errors) {
				errors.push(`round ${r} messenger: ${e}`);
			}
		}
	}
	return errors;
}

async function collectBusAndConsensusIssues(args: {
	debateId: string;
	debatesDir: string;
	caps: ReturnType<typeof capsForDebate>;
	requiredFocuses: readonly PlanDebateFocus[];
	coverage: any;
	debateProfile: string;
}): Promise<{ errors: string[]; warnings: string[] }> {
	const {
		debateId,
		debatesDir,
		caps,
		requiredFocuses,
		coverage,
		debateProfile,
	} = args;
	const errors: string[] = [];
	const warnings: string[] = [];
	const { rounds, hasConsensus } = await countJsonlKinds(
		join(debatesDir, `${debateId}.jsonl`),
	);
	if (rounds < caps.min_focus_rounds) {
		errors.push(
			`${debateId}.jsonl has ${rounds}/${caps.min_focus_rounds} minimum round events — use harness_debate_submit_round per focus`,
		);
	}
	if (!hasConsensus)
		errors.push(
			`missing consensus on ${debateId} — call harness_debate_consensus`,
		);
	if (
		!planDebateOutcomeComplete(coverage, {
			requiredFocuses,
			minRoundIndex: caps.min_focus_rounds,
		})
	) {
		errors.push(
			`debate outcome incomplete: required focuses [${requiredFocuses.join(", ")}] with last review_gate_ready true (profile=${debateProfile})`,
		);
	}
	const consensusPath = join(debatesDir, `${debateId}.consensus.json`);
	if (!(await fileExists(consensusPath))) {
		errors.push(`missing ${debateId}.consensus.json`);
	} else {
		try {
			const packet = JSON.parse(await readFile(consensusPath, "utf-8")) as {
				policy_decision?: string;
			};
			if (packet.policy_decision === "block") {
				errors.push("consensus policy_decision is block — cannot approve");
			}
		} catch {
			errors.push("invalid consensus json");
		}
	}
	if (rounds > caps.max_rounds) {
		warnings.push(
			`bus round count ${rounds} exceeds soft max_rounds ${caps.max_rounds}`,
		);
	}
	return { errors, warnings };
}

export interface PlanDebateGateResult {
	ok: boolean;
	errors: string[];
	warnings: string[];
	debateId: string;
	focus_coverage?: {
		covered: string[];
		missing: string[];
		last_review_gate_ready: boolean;
	};
	debate_profile?: string;
}

export async function validatePlanDebateGate(
	projectRoot: string,
	runId: string,
	eligibility?: DebateEligibilityResult,
): Promise<PlanDebateGateResult> {
	const errors: string[] = [];
	const warnings: string[] = [];
	const debateId = planDebateIdForRun(runId);
	const runDir = join(projectRoot, ".pi", "harness", "runs", runId);
	const debatesDir = join(projectRoot, ".pi", "harness", "debates");
	const messenger = await loadMessengerState(runDir);
	const debateProfile = messenger?.debate_profile ?? "standard";

	if (process.env.HARNESS_QA_SMOKE === "1" && isHarnessNonInteractive()) {
		const consensusPath = join(debatesDir, `${debateId}.consensus.json`);
		if (await fileExists(consensusPath)) {
			try {
				const packet = JSON.parse(await readFile(consensusPath, "utf-8")) as {
					headless_bypass?: boolean;
					policy_decision?: string;
				};
				if (
					packet.headless_bypass === true &&
					packet.policy_decision !== "block"
				) {
					const coverage = await getPlanFocusCoverage(runDir);
					return {
						ok: true,
						errors: [],
						warnings: ["QA smoke: headless debate bypass consensus accepted"],
						debateId,
						focus_coverage: {
							covered: coverage.covered,
							missing: coverage.missing,
							last_review_gate_ready: coverage.last_review_gate_ready,
						},
						debate_profile: debateProfile,
					};
				}
			} catch {
				// fall through to full gate
			}
		}
	}

	const requiredFocuses: readonly PlanDebateFocus[] =
		messenger?.required_focuses && messenger.required_focuses.length > 0
			? messenger.required_focuses
			: (["spec", "wbs", "schedule", "quality"] as const);
	const caps = capsForDebate(debateId, debateProfile);
	const eligibilitySnapshot =
		eligibility ?? (await loadPlanDebateEligibilitySnapshot(runDir));
	const reviewStrategy = eligibilitySnapshot
		? planReviewGateStrategyFromEligibility(eligibilitySnapshot)
		: messenger
			? reviewStrategyFromMessenger(
					messenger,
					debateProfile as DebateProfile,
					requiredFocuses,
					caps,
				)
			: {
					mode: "threaded" as const,
					profile: debateProfile as DebateProfile,
					required_focuses: [...requiredFocuses],
					min_focus_rounds: caps.min_focus_rounds,
					max_rounds: caps.max_rounds,
					max_exchanges_per_round: caps.max_exchanges_per_round,
					round_token_cap: caps.round_token_cap,
					debate_global_cap: caps.debate_global_cap,
					rationale: [],
				};
	const effectiveCaps = {
		...caps,
		min_focus_rounds: effectiveMinFocusRounds(reviewStrategy),
	};
	const _consolidated = isConsolidatedReviewStrategy(reviewStrategy);
	const _parallelProbes = isParallelProbesReviewStrategy(reviewStrategy);
	const coverage = await getPlanFocusCoverage(runDir, { requiredFocuses });
	const dialogueOpts = {
		max_exchanges_per_round: caps.max_exchanges_per_round,
	};

	for (const focus of coverage.missing) {
		errors.push(`focus not covered in submitted rounds: ${focus}`);
	}
	if (!coverage.last_review_gate_ready) {
		errors.push("last submitted review round has review_gate_ready !== true");
	}

	errors.push(
		...(await collectStrategyErrors({
			runDir,
			coverage,
			reviewStrategy,
			dialogueOpts,
		})),
	);

	if (
		isHarnessBudgetEnforceOn() &&
		coverage.last_round_index > caps.max_rounds
	) {
		errors.push(
			`round_count ${coverage.last_round_index} exceeds max_rounds ${caps.max_rounds}`,
		);
	} else if (
		!isHarnessBudgetEnforceOn() &&
		coverage.last_round_index > caps.max_rounds
	) {
		warnings.push(
			`round_count ${coverage.last_round_index} exceeds advisory max_rounds ${caps.max_rounds} (budget enforce off)`,
		);
	}

	if (!messenger) {
		errors.push(
			"debate-messenger/state.json missing — call harness_debate_open",
		);
	} else if (messenger.debate_id !== debateId) {
		errors.push(`messenger debate_id ${messenger.debate_id} !== ${debateId}`);
	} else {
		const wall = checkDebateWallClock({
			opened_at: messenger.opened_at,
			debate_profile: debateProfile as DebateEligibilityResult["profile"],
		});
		if (wall.exceeded) {
			const hint = debateWallClockRecoveryHint(wall);
			if (wall.non_interactive) {
				warnings.push(
					`debate wall-clock exceeded (${Math.round(wall.elapsed_ms / 1000)}s > ${Math.round(wall.limit_ms / 1000)}s) — ${hint}`,
				);
			} else {
				errors.push(
					`debate wall-clock exceeded (${Math.round(wall.elapsed_ms / 1000)}s) — ${hint}`,
				);
			}
		}
	}

	const busChecks = await collectBusAndConsensusIssues({
		debateId,
		debatesDir,
		caps: effectiveCaps,
		requiredFocuses,
		coverage,
		debateProfile,
	});
	errors.push(...busChecks.errors);
	warnings.push(...busChecks.warnings);

	return {
		ok: errors.length === 0,
		errors,
		warnings,
		debateId,
		focus_coverage: {
			covered: coverage.covered,
			missing: coverage.missing,
			last_review_gate_ready: coverage.last_review_gate_ready,
		},
		debate_profile: debateProfile,
	};
}

export function isReviewRoundArtifactPath(relPath: string): boolean {
	const norm = relPath.replace(/\\/g, "/");
	return (
		/^artifacts\/review-round-r\d+\.yaml$/i.test(norm) ||
		norm === CONSOLIDATED_REVIEW_ARTIFACT ||
		norm === PARALLEL_PROBES_REVIEW_ARTIFACT
	);
}

function roundIndexForFocus(
	focus: PlanDebateFocus,
	required: readonly PlanDebateFocus[],
): number {
	const idx = required.indexOf(focus);
	return idx >= 0 ? idx + 1 : 1;
}

/** Actionable recovery steps when approve_plan is blocked by the debate gate. */
export async function buildPlanDebateGateRecovery(
	projectRoot: string,
	runId: string,
	gate: PlanDebateGateResult,
): Promise<string> {
	const runDir = join(projectRoot, ".pi", "harness", "runs", runId);
	const messenger = await loadMessengerState(runDir);
	const required: readonly PlanDebateFocus[] =
		messenger?.required_focuses && messenger.required_focuses.length > 0
			? messenger.required_focuses
			: (["spec", "wbs", "schedule", "quality"] as const);
	const profile =
		messenger?.debate_profile ?? gate.debate_profile ?? "standard";
	const mode = messenger?.review_gate_mode ?? "threaded";
	const coverage = gate.focus_coverage;

	const lines: string[] = [
		"Review Gate must finish before approve_plan.",
		"",
		"Blocking checks:",
		...gate.errors.map((e) => `- ${e}`),
		"",
		`Debate profile: ${profile}, mode: ${mode}, required focuses: ${required.join(", ")}`,
		"",
	];

	const needsConsensus = gate.errors.some(
		(e) => e.includes("consensus") || e.includes(".consensus.json"),
	);
	const needsRounds = gate.errors.some(
		(e) =>
			e.includes("review_gate_ready") ||
			e.includes("focus not covered") ||
			e.includes("missing artifacts/") ||
			e.includes("round events"),
	);

	if (needsRounds) {
		const nextFocus: PlanDebateFocus =
			(coverage?.missing[0] as PlanDebateFocus | undefined) ??
			required[0] ??
			"spec";
		const roundIndex =
			mode === "consolidated" ? 1 : roundIndexForFocus(nextFocus, required);
		const status = await getPlanDebateRoundStatus(runDir, roundIndex, runId, {
			debate_round_focus: mode === "consolidated" ? "all" : nextFocus,
		});
		lines.push(
			`Next round: ${roundIndex} (focus: ${mode === "consolidated" ? "all" : nextFocus})`,
		);
		if (status.missing.length > 0) {
			lines.push("Missing lane artifacts:");
			for (const m of status.missing) {
				lines.push(`- ${m}`);
			}
		}
		if (status.next_tool) {
			lines.push(`Next tool: ${status.next_tool}`);
		}
		lines.push(
			"Workflow: complete lane subagents (one per batch) → review-integrator → harness_debate_submit_round → harness_debate_focus_coverage.",
		);
	}

	if (needsConsensus) {
		lines.push(
			"When all required focuses are covered and the last round has review_gate_ready: true, call harness_debate_consensus, then approve_plan again.",
		);
	}

	if (gate.warnings.length > 0) {
		lines.push("", "Warnings:", ...gate.warnings.map((w) => `- ${w}`));
	}

	return lines.join("\n");
}
