/**
 * Orchestrator blackboard tool (list/read/query/wait/delete).
 */

import { defineTool, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type { Blackboard } from "./blackboard.js";
import type { BlackboardQuery } from "./types-blackboard.js";

function textResult(text: string) {
	return {
		content: [{ type: "text" as const, text }],
		details: {},
	};
}

export function registerBlackboardTool(
	pi: ExtensionAPI,
	blackboard: Blackboard,
): void {
	pi.registerTool(
		defineTool({
			name: "blackboard",
			label: "Blackboard",
			description:
				"Shared knowledge store for harness orchestration. Actions: list, read, query, wait, delete. " +
				"Use namespaced keys (e.g. scout:findings). Spawn context injection is capped at ~8k chars.",
			parameters: Type.Object({
				action: Type.Union([
					Type.Literal("list"),
					Type.Literal("read"),
					Type.Literal("query"),
					Type.Literal("wait"),
					Type.Literal("delete"),
				]),
				key: Type.Optional(Type.String()),
				pattern: Type.Optional(Type.String()),
				agent_id: Type.Optional(Type.String()),
				agent_name: Type.Optional(Type.String()),
				category: Type.Optional(Type.String()),
				timeout_ms: Type.Optional(
					Type.Number({ description: "For wait action (default 30000)." }),
				),
			}),
			execute: async (_id, params) => {
				const action = params.action as string;

				if (action === "list") {
					return textResult(blackboard.serialize());
				}

				if (action === "read") {
					const key = params.key as string | undefined;
					if (!key) return textResult("read requires key.");
					const entry = blackboard.get(key);
					if (!entry) {
						return textResult(`No entry for key "${key}".`);
					}
					return textResult(JSON.stringify(entry, null, 2));
				}

				if (action === "query") {
					const q: BlackboardQuery = {};
					if (params.pattern) q.pattern = params.pattern as string;
					if (params.agent_id) q.agentId = params.agent_id as string;
					if (params.agent_name) q.agentName = params.agent_name as string;
					if (params.category) q.category = params.category as string;
					if (params.key) q.keys = [params.key as string];
					return textResult(JSON.stringify(blackboard.toJSON(q), null, 2));
				}

				if (action === "delete") {
					const key = params.key as string | undefined;
					if (!key) return textResult("delete requires key.");
					const removed = blackboard.delete(key);
					return textResult(
						removed ? `Deleted "${key}".` : `Key "${key}" not found.`,
					);
				}

				if (action === "wait") {
					const pattern = (params.pattern ?? params.key) as string | undefined;
					if (!pattern) {
						return textResult("wait requires pattern or key.");
					}
					const timeoutMs = (params.timeout_ms as number) ?? 30_000;
					const start = Date.now();
					while (Date.now() - start < timeoutMs) {
						const matches = blackboard.query({ pattern });
						if (matches.length > 0) {
							return textResult(
								JSON.stringify(blackboard.toJSON({ pattern }), null, 2),
							);
						}
						await new Promise((r) => setTimeout(r, 200));
					}
					return textResult(`Timeout waiting for pattern "${pattern}".`);
				}

				return textResult("Unknown action.");
			},
		}),
	);
}

export function buildBlackboardContextInjection(
	blackboard: Blackboard,
	spec?: { agentId?: string; keys?: string[]; agentName?: string },
): string | undefined {
	if (!spec) return undefined;
	const q: BlackboardQuery = {};
	if (spec.agentId) q.agentId = spec.agentId;
	if (spec.agentName) q.agentName = spec.agentName;
	if (spec.keys?.length) q.keys = spec.keys;
	const serialized = blackboard.serialize(q);
	if (serialized === "(blackboard is empty)") return undefined;
	return serialized;
}
