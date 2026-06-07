/**
 * Harness auto-compact at 50% context usage (VCC-backed).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { claimExtensionLoad } from "../lib/extension-load-guard.js";
import {
	type CompactGateState,
	createCompactGateState,
	evaluateAutoCompactGate,
	onCompactCancel,
	onSessionCompact,
} from "../lib/harness-auto-compact-policy.js";
import { captureHarnessEvent } from "../lib/harness-debate-core-deps.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

const gateBySession = new Map<string, CompactGateState>();

function gateForSession(sessionId: string): CompactGateState {
	let state = gateBySession.get(sessionId);
	if (!state) {
		state = createCompactGateState();
		gateBySession.set(sessionId, state);
	}
	return state;
}

export default function harnessAutoCompact(pi: ExtensionAPI): void {
	if (!claimExtensionLoad("harness-auto-compact", MODULE_URL)) return;

	pi.on("tool_execution_start", (event, ctx) => {
		if (event.toolName !== "subagent") return;
		const sessionId = ctx?.sessionManager?.getSessionId?.();
		if (!sessionId) return;
		gateForSession(sessionId).subagentSpawnPending = true;
	});

	pi.on("tool_execution_end", (event, ctx) => {
		if (event.toolName !== "subagent") return;
		const sessionId = ctx?.sessionManager?.getSessionId?.();
		if (!sessionId) return;
		gateForSession(sessionId).subagentSpawnPending = false;
	});

	pi.on("session_compact", (_event, ctx) => {
		const sessionId = ctx?.sessionManager?.getSessionId?.();
		if (!sessionId) return;
		onSessionCompact(gateForSession(sessionId));
	});

	pi.on("agent_end", async (_message, ctx) => {
		const sessionId = ctx.sessionManager.getSessionId();
		const state = gateForSession(sessionId);
		if (state.cooldownTurns > 0) {
			state.cooldownTurns -= 1;
		}
		const usage = ctx.getContextUsage();
		if (!usage) return;
		const isSubagent = process.env.PI_HARNESS_SUBPROCESS === "1";
		const decision = evaluateAutoCompactGate(
			{
				percent: usage.percent ?? 0,
				tokens: usage.tokens ?? undefined,
				contextWindow: usage.contextWindow ?? undefined,
			},
			state,
			{ isSubagent },
		);
		if (!decision.shouldCompact) return;
		state.inFlight = true;
		try {
			await ctx.compact({
				onComplete: (result) => {
					const cancelled =
						(result as { cancel?: boolean } | undefined)?.cancel === true;
					if (cancelled) {
						onCompactCancel(state);
					}
					captureHarnessEvent(sessionId, "harness_auto_compact", {
						percent: usage.percent ?? 0,
						tokens_before: usage.tokens ?? undefined,
						context_window: usage.contextWindow ?? undefined,
						compactor: "ultimate-pi-vcc",
						cancelled,
					});
				},
			});
		} catch {
			state.inFlight = false;
		}
	});
}
