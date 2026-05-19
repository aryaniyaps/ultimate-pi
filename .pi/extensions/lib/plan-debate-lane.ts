/**
 * Persist plan debate lane YAML + pi-messenger side effects from subagent output.
 */

import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	parseStructuredDocument,
	writeYamlFile,
} from "../../lib/harness-yaml.js";
import { postMessengerMessage } from "./plan-messenger.js";

export type DebateLaneKind =
	| "hypothesis-validation"
	| "validation-turn"
	| "adversary-brief"
	| "sprint-audit";

const AGENT_LANE: Record<string, DebateLaneKind> = {
	"harness/planning/hypothesis-validator": "hypothesis-validation",
	"harness/planning/plan-evaluator": "validation-turn",
	"harness/planning/plan-adversary": "adversary-brief",
	"harness/planning/sprint-contract-auditor": "sprint-audit",
};

export function debateLaneForAgent(agent: string): DebateLaneKind | null {
	const normalized = agent.replace(/^\.pi\/agents\//, "").trim();
	return AGENT_LANE[normalized] ?? null;
}

export function laneArtifactPath(
	lane: DebateLaneKind,
	roundIndex: number,
): string {
	switch (lane) {
		case "hypothesis-validation":
			return `artifacts/hypothesis-validation-r${roundIndex}.yaml`;
		case "validation-turn":
			return `artifacts/validation-turn-r${roundIndex}.yaml`;
		case "adversary-brief":
			return `artifacts/adversary-brief-r${roundIndex}.yaml`;
		case "sprint-audit":
			return `artifacts/sprint-audit-r${roundIndex}.yaml`;
	}
}

/** Apply messenger side effects when artifact YAML was already written via submit tool. */
export async function applyDebateLaneFromDoc(opts: {
	runDir: string;
	lane: DebateLaneKind;
	doc: Record<string, unknown>;
	roundIndex?: number;
}): Promise<ApplyDebateLaneResult> {
	return applyDebateLane({
		runDir: opts.runDir,
		lane: opts.lane,
		content: JSON.stringify(opts.doc),
		roundIndex: opts.roundIndex,
	});
}

export function extractClaimIds(doc: Record<string, unknown>): string[] {
	const explicit = doc.messenger_claim_ids;
	if (Array.isArray(explicit)) {
		return explicit.filter(
			(x): x is string => typeof x === "string" && x.length > 0,
		);
	}
	const checks = doc.checks;
	if (!Array.isArray(checks)) return [];
	return checks
		.map((c) => (c as { id?: string }).id)
		.filter((id): id is string => typeof id === "string" && id.length > 0);
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

export interface ApplyDebateLaneResult {
	ok: boolean;
	lane: DebateLaneKind;
	round_index: number;
	artifact_path: string;
	messenger_posted: boolean;
	errors: string[];
	next_step?: string;
}

export async function applyDebateLane(opts: {
	runDir: string;
	lane: DebateLaneKind;
	content: string;
	roundIndex?: number;
}): Promise<ApplyDebateLaneResult> {
	const errors: string[] = [];
	let doc: Record<string, unknown>;
	try {
		doc = parseStructuredDocument(opts.content, opts.lane) as Record<
			string,
			unknown
		>;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return {
			ok: false,
			lane: opts.lane,
			round_index: opts.roundIndex ?? 0,
			artifact_path: "",
			messenger_posted: false,
			errors: [msg],
		};
	}

	const roundIndex =
		typeof doc.round_index === "number"
			? doc.round_index
			: (opts.roundIndex ?? 1);
	const relPath = laneArtifactPath(opts.lane, roundIndex);
	const absPath = join(opts.runDir, relPath);
	await mkdir(dirname(absPath), { recursive: true });
	await writeYamlFile(absPath, doc);

	let messengerPosted = false;
	let nextStep: string | undefined;

	if (opts.lane === "validation-turn") {
		const claimIds = extractClaimIds(doc);
		const body =
			(typeof doc.human_summary === "string" && doc.human_summary.trim()) ||
			claimIds.map((id) => `Check ${id}`).join("; ") ||
			"Plan evaluator claims for this round.";
		if (claimIds.length === 0) {
			errors.push(
				"validation-turn has no claim ids (checks[].id or messenger_claim_ids)",
			);
		} else {
			await postMessengerMessage(opts.runDir, {
				from: "PlanEvaluatorAgent",
				kind: "claim",
				round_index: roundIndex,
				to: ["broadcast"],
				body,
				claim_ids: claimIds,
				in_reply_to: [],
				evidence_refs: [relPath],
				artifact_path: relPath,
			});
			messengerPosted = true;
			nextStep = `Spawn plan-adversary with harness_messenger_read_round({ round_index: ${roundIndex} }) transcript, then harness_debate_apply_lane for adversary output.`;
		}
	}

	if (opts.lane === "adversary-brief") {
		const turnPath = join(
			opts.runDir,
			laneArtifactPath("validation-turn", roundIndex),
		);
		let inReplyTo: string[] = [];
		if (await fileExists(turnPath)) {
			const { readFile } = await import("node:fs/promises");
			const { parse: parseYaml } = await import("yaml");
			const turn = parseYaml(await readFile(turnPath, "utf-8")) as Record<
				string,
				unknown
			>;
			inReplyTo = extractClaimIds(turn);
		}
		if (inReplyTo.length === 0) {
			errors.push(
				"no claim ids to rebut — validation-turn-rN must exist before adversary",
			);
		} else {
			const body =
				(typeof doc.human_summary === "string" && doc.human_summary.trim()) ||
				(Array.isArray(doc.failure_modes) && doc.failure_modes[0]) ||
				"Adversary rebuttal for evaluator claims.";
			await postMessengerMessage(opts.runDir, {
				from: "PlanAdversaryAgent",
				kind: "rebuttal",
				round_index: roundIndex,
				to: ["broadcast"],
				body: String(body),
				claim_ids: [],
				in_reply_to: inReplyTo,
				evidence_refs: [relPath],
				artifact_path: relPath,
			});
			messengerPosted = true;
			nextStep = `Spawn review-integrator with harness_messenger_read_round({ round_index: ${roundIndex} }) + lane artifacts, then harness_debate_submit_round.`;
		}
	}

	return {
		ok: errors.length === 0,
		lane: opts.lane,
		round_index: roundIndex,
		artifact_path: relPath,
		messenger_posted: messengerPosted,
		errors,
		next_step: nextStep,
	};
}

export function formatApplyLaneMessage(result: ApplyDebateLaneResult): string {
	if (!result.ok) {
		return `Lane ${result.lane} failed:\n- ${result.errors.join("\n- ")}`;
	}
	const parts = [
		`Wrote ${result.artifact_path}`,
		result.messenger_posted
			? "messenger updated"
			: "no messenger post for this lane",
	];
	if (result.next_step) parts.push(`Next: ${result.next_step}`);
	return parts.join("\n");
}

export const DEBATE_LANE_AGENT_ORDER: Array<{
	lane: DebateLaneKind;
	agent: string;
}> = [
	{
		lane: "hypothesis-validation",
		agent: "harness/planning/hypothesis-validator",
	},
	{ lane: "validation-turn", agent: "harness/planning/plan-evaluator" },
	{ lane: "adversary-brief", agent: "harness/planning/plan-adversary" },
];
