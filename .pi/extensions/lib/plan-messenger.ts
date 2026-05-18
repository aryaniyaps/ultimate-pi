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

export type MessengerMessageKind =
	| "system"
	| "claim"
	| "rebuttal"
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
}

export interface MessengerState {
	schema_version: "1.0.0";
	run_id: string;
	debate_id: string;
	opened_at: string;
	rounds: Record<string, MessengerRoundState>;
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
	opts: { runId: string; debateId: string },
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
	};
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
	const round = state.rounds[key] ?? defaultRoundState(full.round_index);
	if (full.from === "PlanEvaluatorAgent" && full.kind === "claim") {
		round.evaluator_posted = true;
		round.claim_count += full.claim_ids.length || 1;
	}
	if (full.from === "PlanAdversaryAgent" && full.kind === "rebuttal") {
		round.adversary_posted = true;
		round.rebuttal_count += full.in_reply_to.length || 1;
	}
	if (full.from === "ReviewIntegratorAgent" && full.kind === "integrate") {
		round.integrator_posted = true;
	}
	state.rounds[key] = round;
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
	return state.rounds[roundKey(roundIndex)] ?? null;
}

export function messengerRoundDebateReady(
	round: MessengerRoundState | null,
	requireSprintAudit: boolean,
): { ok: boolean; errors: string[] } {
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
	if (!round.integrator_posted) {
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
