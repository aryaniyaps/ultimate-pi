/**
 * pi-messenger-style plan debate transport — per-agent inboxes + round threads.
 *
 * Layout under `.pi/harness/runs/<run_id>/debate-messenger/`:
 *   inbox/<AgentLabel>/<seq>-<kind>.json
 *   threads/round-<N>/transcript.jsonl
 *   state.json
 */

import { randomUUID } from "node:crypto";
import {
	appendFile,
	mkdir,
	readdir,
	readFile,
	writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import type { DebateParticipant } from "../../lib/debate-orchestrator-types.js";
import type { DebateProfile } from "./plan-debate-eligibility.js";
import type { PlanDebateFocus } from "./plan-debate-focus.js";

export type MessengerMessageKind =
	| "system"
	| "claim"
	| "rebuttal"
	| "clarification"
	| "counter"
	| "integrate"
	| "audit";

export interface MessengerMessage {
	schema_version: "1.0.0";
	id: string;
	ts: string;
	from: DebateParticipant | "system";
	to: Array<DebateParticipant | "broadcast">;
	kind: MessengerMessageKind;
	round_index: number;
	in_reply_to: string[];
	body: string;
	claim_ids: string[];
	evidence_refs: string[];
	artifact_path?: string;
}

export interface MessengerRoundState {
	round_index: number;
	evaluator_posted: boolean;
	adversary_posted: boolean;
	integrator_posted: boolean;
	claim_count: number;
	rebuttal_count: number;
	exchange_count: number;
	unresolved_claim_ids: string[];
}

export interface MessengerState {
	schema_version: "1.0.0";
	run_id: string;
	debate_id: string;
	opened_at: string;
	rounds: Record<string, MessengerRoundState>;
	debate_profile?: DebateProfile;
	required_focuses?: PlanDebateFocus[];
	/** consolidated = single Review Gate round; threaded = per-focus rounds */
	review_gate_mode?: "consolidated" | "threaded";
}

function messengerRoot(runDir: string): string {
	return join(runDir, "debate-messenger");
}

function nowIso(): string {
	return new Date().toISOString();
}

function roundKey(roundIndex: number): string {
	return String(roundIndex);
}

export async function initPlanMessenger(
	runDir: string,
	opts: {
		runId: string;
		debateId: string;
		debate_profile?: DebateProfile;
		required_focuses?: PlanDebateFocus[];
		review_gate_mode?: "consolidated" | "threaded";
	},
): Promise<string> {
	const root = messengerRoot(runDir);
	await mkdir(join(root, "inbox"), { recursive: true });
	await mkdir(join(root, "threads"), { recursive: true });
	const state: MessengerState = {
		schema_version: "1.0.0",
		run_id: opts.runId,
		debate_id: opts.debateId,
		opened_at: nowIso(),
		rounds: {},
		debate_profile: opts.debate_profile,
		required_focuses: opts.required_focuses,
		review_gate_mode: opts.review_gate_mode,
	};
	await writeFile(
		join(root, "state.json"),
		`${JSON.stringify(state, null, 2)}\n`,
		"utf-8",
	);
	return root;
}

export async function loadMessengerState(
	runDir: string,
): Promise<MessengerState | null> {
	const path = join(messengerRoot(runDir), "state.json");
	try {
		const raw = await readFile(path, "utf-8");
		return JSON.parse(raw) as MessengerState;
	} catch {
		return null;
	}
}

async function saveMessengerState(
	runDir: string,
	state: MessengerState,
): Promise<void> {
	await writeFile(
		join(messengerRoot(runDir), "state.json"),
		`${JSON.stringify(state, null, 2)}\n`,
		"utf-8",
	);
}

function defaultRoundState(roundIndex: number): MessengerRoundState {
	return {
		round_index: roundIndex,
		evaluator_posted: false,
		adversary_posted: false,
		integrator_posted: false,
		claim_count: 0,
		rebuttal_count: 0,
		exchange_count: 0,
		unresolved_claim_ids: [],
	};
}

/** Recompute exchange + unresolved claim ids from a round transcript. */
export function syncRoundStateFromTranscript(
	round: MessengerRoundState,
	messages: MessengerMessage[],
): MessengerRoundState {
	const claimed = new Set<string>();
	const resolved = new Set<string>();
	let exchange_count = 0;

	for (const m of messages) {
		if (m.from === "PlanEvaluatorAgent" && m.kind === "claim") {
			round.evaluator_posted = true;
			round.claim_count += m.claim_ids.length || 1;
			for (const id of m.claim_ids) claimed.add(id);
		}
		if (m.from === "PlanAdversaryAgent" && m.kind === "rebuttal") {
			round.adversary_posted = true;
			round.rebuttal_count += m.in_reply_to.length || 1;
			exchange_count += 1;
		}
		if (m.from === "PlanEvaluatorAgent" && m.kind === "clarification") {
			exchange_count += 1;
			for (const id of m.claim_ids) resolved.add(id);
			for (const id of m.in_reply_to) resolved.add(id);
		}
		if (m.from === "PlanAdversaryAgent" && m.kind === "counter") {
			exchange_count += 1;
			for (const id of m.claim_ids) resolved.add(id);
			for (const id of m.in_reply_to) resolved.add(id);
		}
		if (m.from === "ReviewIntegratorAgent" && m.kind === "integrate") {
			round.integrator_posted = true;
		}
	}

	round.exchange_count = exchange_count;
	round.unresolved_claim_ids = [...claimed].filter((id) => !resolved.has(id));
	return round;
}

export async function postMessengerMessage(
	runDir: string,
	msg: Omit<MessengerMessage, "schema_version" | "id" | "ts"> & {
		id?: string;
		ts?: string;
	},
): Promise<MessengerMessage> {
	const root = messengerRoot(runDir);
	const full: MessengerMessage = {
		schema_version: "1.0.0",
		id: msg.id ?? randomUUID(),
		ts: msg.ts ?? nowIso(),
		from: msg.from,
		to: msg.to,
		kind: msg.kind,
		round_index: msg.round_index,
		in_reply_to: msg.in_reply_to ?? [],
		body: msg.body,
		claim_ids: msg.claim_ids ?? [],
		evidence_refs: msg.evidence_refs ?? [],
		artifact_path: msg.artifact_path,
	};

	const inboxDir = join(root, "inbox", full.from);
	await mkdir(inboxDir, { recursive: true });
	const inboxName = `${full.round_index.toString().padStart(2, "0")}-${full.kind}-${full.id.slice(0, 8)}.json`;
	await writeFile(
		join(inboxDir, inboxName),
		`${JSON.stringify(full, null, 2)}\n`,
	);

	const threadDir = join(root, "threads", `round-${full.round_index}`);
	await mkdir(threadDir, { recursive: true });
	await appendFile(
		join(threadDir, "transcript.jsonl"),
		`${JSON.stringify(full)}\n`,
		"utf-8",
	);

	const state = (await loadMessengerState(runDir)) ?? {
		schema_version: "1.0.0",
		run_id: "",
		debate_id: "",
		opened_at: nowIso(),
		rounds: {},
	};
	const key = roundKey(full.round_index);
	const messages = await readRoundTranscript(runDir, full.round_index);
	messages.push(full);
	const round = state.rounds[key] ?? defaultRoundState(full.round_index);
	state.rounds[key] = syncRoundStateFromTranscript(round, messages);
	await saveMessengerState(runDir, state);
	return full;
}

export async function readRoundTranscript(
	runDir: string,
	roundIndex: number,
): Promise<MessengerMessage[]> {
	const path = join(
		messengerRoot(runDir),
		"threads",
		`round-${roundIndex}`,
		"transcript.jsonl",
	);
	try {
		const raw = await readFile(path, "utf-8");
		return raw
			.split("\n")
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line) as MessengerMessage);
	} catch {
		return [];
	}
}

export function formatTranscriptForSpawn(
	messages: MessengerMessage[],
	maxChars = 12000,
): string {
	const lines = messages.map((m) => {
		const reply =
			m.in_reply_to.length > 0 ? ` (re: ${m.in_reply_to.join(", ")})` : "";
		const claims = m.claim_ids.length > 0 ? ` [${m.claim_ids.join(", ")}]` : "";
		return `[${m.from}/${m.kind}${claims}${reply}] ${m.body}`;
	});
	let text = lines.join("\n\n");
	if (text.length > maxChars) {
		text = `${text.slice(0, maxChars)}\n\n…(transcript truncated)`;
	}
	return text || "(empty thread — post evaluator claims before adversary)";
}

export async function getMessengerRoundState(
	runDir: string,
	roundIndex: number,
): Promise<MessengerRoundState | null> {
	const state = await loadMessengerState(runDir);
	if (!state) return null;
	const round = state.rounds[roundKey(roundIndex)];
	if (!round) return null;
	const transcript = await readRoundTranscript(runDir, roundIndex);
	return syncRoundStateFromTranscript({ ...round }, transcript);
}

export interface MessengerDialogueOptions {
	max_exchanges_per_round?: number;
}

/** Evaluator + adversary dialogue settled; safe to spawn integrator. */
export function messengerRoundDialogueReady(
	round: MessengerRoundState | null,
	opts: MessengerDialogueOptions = {},
): { ok: boolean; errors: string[] } {
	const maxExchanges = opts.max_exchanges_per_round ?? 3;
	const errors: string[] = [];
	if (!round) {
		errors.push("no messenger activity for this round");
		return { ok: false, errors };
	}
	if (!round.evaluator_posted) {
		errors.push("PlanEvaluatorAgent has not posted claims to the thread");
	}
	if (!round.adversary_posted) {
		errors.push("PlanAdversaryAgent has not posted rebuttals to the thread");
	}
	if (round.claim_count < 1) {
		errors.push("round thread has no claim_ids");
	}
	if (round.rebuttal_count < 1) {
		errors.push("adversary must rebut at least one claim (in_reply_to)");
	}
	const dialogueSettled =
		round.unresolved_claim_ids.length === 0 ||
		round.exchange_count >= maxExchanges;
	if (!dialogueSettled) {
		errors.push(
			`unresolved claims remain (${round.unresolved_claim_ids.join(", ")}) and exchange_count ${round.exchange_count} < ${maxExchanges}`,
		);
	}
	return { ok: errors.length === 0, errors };
}

/** Full round ready for harness_debate_submit_round (includes integrator). */
export function messengerRoundDebateReady(
	round: MessengerRoundState | null,
	_requireSprintAudit: boolean,
	opts: MessengerDialogueOptions = {},
): { ok: boolean; errors: string[] } {
	const dialogue = messengerRoundDialogueReady(round, opts);
	const errors = [...dialogue.errors];
	if (!round?.integrator_posted) {
		errors.push(
			"ReviewIntegratorAgent must post integrate message before bus submit",
		);
	}
	return { ok: errors.length === 0, errors };
}

export async function listInboxAgents(runDir: string): Promise<string[]> {
	const inbox = join(messengerRoot(runDir), "inbox");
	try {
		const entries = await readdir(inbox, { withFileTypes: true });
		return entries.filter((e) => e.isDirectory()).map((e) => e.name);
	} catch {
		return [];
	}
}
