/**
 * Strip provider-specific fields from LLM request payloads before HTTP send.
 *
 * Strict OpenAI-compatible gateways return 400 when assistant history includes
 * a top-level `reasoning` key (Cursor/thinking transcripts). Pi builds clean
 * chat params; this is a safety net for any extra fields that slip through.
 */

import type {
	BeforeProviderRequestEvent,
	ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

const CHAT_MESSAGE_EXTRA_KEYS = [
	"reasoning",
	"reasoning_text",
	"chain_of_thought",
	"chainOfThought",
	"thinking",
	"thought",
] as const;

function stripExtraChatFields(message: unknown): unknown {
	if (
		message === null ||
		typeof message !== "object" ||
		Array.isArray(message)
	) {
		return message;
	}
	const m = message as Record<string, unknown>;
	if (typeof m.role !== "string") {
		return message;
	}
	let touched = false;
	const next = { ...m };
	for (const k of CHAT_MESSAGE_EXTRA_KEYS) {
		if (k in next) {
			delete next[k];
			touched = true;
		}
	}
	return touched ? next : message;
}

function sanitizePayload(payload: unknown): unknown {
	if (payload === null || typeof payload !== "object") {
		return payload;
	}
	const body = payload as Record<string, unknown>;
	const rawMessages = body.messages;
	if (Array.isArray(rawMessages)) {
		const messages = rawMessages.map(stripExtraChatFields);
		if (messages.some((m, i) => m !== rawMessages[i])) {
			return { ...body, messages };
		}
	}

	return payload;
}

export default function providerPayloadSanitize(pi: ExtensionAPI) {
	pi.on("before_provider_request", (event: BeforeProviderRequestEvent) => {
		return sanitizePayload(event.payload);
	});
}
