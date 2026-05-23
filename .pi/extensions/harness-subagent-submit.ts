/**
 * Subprocess-only harness submit tools — validate + write artifacts under run_dir.
 * Loaded via `pi --no-extensions -e harness-subagent-submit.ts` for harness agents.
 */

import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { resolveGuardedRunDir } from "../lib/harness-subagent-submit-path.js";
import { claimHarnessGovernanceLoad } from "./lib/extension-load-guard.js";
import { getHarnessPackageRoot } from "./lib/harness-paths.js";
import { evaluateHarnessSubagentToolCall } from "./lib/harness-subagent-policy.js";
import {
	executeSubmitPipeline,
	loadSubmitDocument,
} from "./lib/harness-subagent-submit-pipeline.js";
import { SUBMIT_TOOL_SPECS } from "./lib/harness-subagent-submit-registry.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

const DocumentSchema = Type.Object(
	{
		document: Type.Optional(
			Type.Record(Type.String(), Type.Unknown(), {
				description:
					"Artifact fields (deprecated when source_path is set; ADR 0043)",
			}),
		),
		source_path: Type.Optional(
			Type.String({
				description:
					"Relative path under run dir, e.g. artifacts/.draft/decomposition.yaml",
			}),
		),
	},
	{ additionalProperties: false },
);

function resolveRunContext(): {
	projectRoot: string;
	specsDir: string;
	runId: string;
	runDirEnv?: string;
	agentId: string;
} {
	const projectRoot = process.env.HARNESS_PKG_ROOT ?? process.cwd();
	const specsDir = join(projectRoot, ".pi", "harness", "specs");
	const runId = process.env.HARNESS_RUN_ID?.trim() ?? "";
	const runDirEnv = process.env.HARNESS_RUN_DIR?.trim();
	const agentId = process.env.HARNESS_AGENT_ID?.trim() ?? "";
	return { projectRoot, specsDir, runId, runDirEnv, agentId };
}

function isSubprocessHarness(): boolean {
	return (
		process.env.PI_HARNESS_SUBPROCESS === "1" &&
		Boolean(process.env.HARNESS_RUN_ID?.trim())
	);
}

export default function harnessSubagentSubmit(pi: ExtensionAPI) {
	if (!claimHarnessGovernanceLoad("harness-subagent-submit", MODULE_URL))
		return;
	// Option A: only load submit tools in subprocess (`-e` bundle), not parent discovery.
	if (process.env.PI_HARNESS_SUBPROCESS !== "1") {
		return;
	}

	const _packageRoot = getHarnessPackageRoot(MODULE_URL);

	pi.on("tool_call", async (event) => {
		if (!event.toolName.startsWith("submit_")) return undefined;
		const subprocessOk = isSubprocessHarness();
		if (!subprocessOk) {
			return {
				block: true,
				reason:
					"harness-subagent-submit: submit_* tools are only available in harness subagent subprocesses.",
			};
		}
		const { agentId } = resolveRunContext();
		if (!agentId) {
			return {
				block: true,
				reason:
					"harness-subagent-submit: HARNESS_AGENT_ID is required for submit tools.",
			};
		}
		const decision = evaluateHarnessSubagentToolCall(
			event.toolName,
			event.input as Record<string, unknown>,
			agentId,
		);
		if (decision.action === "block") {
			return { block: true, reason: decision.reason };
		}
		return undefined;
	});

	for (const spec of SUBMIT_TOOL_SPECS) {
		pi.registerTool({
			name: spec.toolName,
			label: spec.toolName.replace(/^submit_/, "Submit "),
			description: `Terminal harness artifact submit for ${spec.agents.join(", ")}. Call once with the full schema document before ending the turn.`,
			parameters: DocumentSchema,
			async execute(_id, params, _signal, _onUpdate, _ctx) {
				if (!isSubprocessHarness()) {
					return {
						content: [
							{
								type: "text",
								text: "submit tools require PI_HARNESS_SUBPROCESS and HARNESS_RUN_ID",
							},
						],
						details: {},
						isError: true,
					};
				}
				const { projectRoot, specsDir, runId, runDirEnv, agentId } =
					resolveRunContext();
				if (!spec.agents.includes(agentId)) {
					return {
						content: [
							{
								type: "text",
								text: `${spec.toolName} is not allowed for agent ${agentId}`,
							},
						],
						details: { agentId, tool: spec.toolName },
						isError: true,
					};
				}
				const runResolved = await resolveGuardedRunDir({
					projectRoot,
					runId,
					runDirEnv,
				});
				if (!runResolved.ok) {
					return {
						content: [{ type: "text", text: runResolved.error }],
						details: {},
						isError: true,
					};
				}
				const loaded = await loadSubmitDocument({
					projectRoot,
					runDir: runResolved.runDir,
					document: (params as { document?: Record<string, unknown> }).document,
					source_path: (params as { source_path?: string }).source_path,
				});
				if (!loaded.ok) {
					return {
						content: [
							{
								type: "text",
								text: `Validation failed:\n${loaded.validation_errors.join("\n")}`,
							},
						],
						isError: true,
						details: loaded,
					};
				}
				const result = await executeSubmitPipeline({
					projectRoot,
					specsDir,
					spec,
					agentId,
					document: loaded.document,
					runId,
					runDirEnv,
				});
				if (!result.ok) {
					return {
						content: [
							{
								type: "text",
								text: `Validation failed:\n${(result.validation_errors ?? []).join("\n")}`,
							},
						],
						isError: true,
						details: result,
					};
				}
				const lines = [`ok: wrote ${result.artifact_path}`];
				if (result.lane_result?.messenger_posted) {
					lines.push("messenger updated");
				}
				if (result.human_required) {
					lines.push("human_required: parent must call ask_user");
				}
				return {
					content: [{ type: "text", text: lines.join("\n") }],
					details: result as unknown,
				};
			},
		});
	}
}

/** Absolute path to the subprocess submit extension (Option A). */
export function harnessSubagentSubmitExtensionPath(
	packageRoot: string,
): string {
	return join(packageRoot, ".pi", "extensions", "harness-subagent-submit.ts");
}
