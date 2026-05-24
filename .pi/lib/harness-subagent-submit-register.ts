import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { allowsAgentTool } from "./agents-policy.mjs";
import { resolveGuardedRunDir } from "./harness-subagent-submit-path.js";
import {
	executeSubmitPipeline,
	loadSubmitDocument,
} from "./harness-subagent-submit-pipeline.js";
import { SUBMIT_TOOL_SPECS } from "./harness-subagent-submit-registry.js";

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

export function resolveHarnessSubmitRunContext(packageRoot: string): {
	projectRoot: string;
	specsDir: string;
	runId: string;
	runDirEnv?: string;
	agentId: string;
} {
	const projectRoot = process.env.HARNESS_PKG_ROOT?.trim() || packageRoot;
	const specsDir = join(projectRoot, ".pi", "harness", "specs");
	const runId = process.env.HARNESS_RUN_ID?.trim() ?? "";
	const runDirEnv = process.env.HARNESS_RUN_DIR?.trim();
	const agentId = process.env.HARNESS_AGENT_ID?.trim() ?? "";
	return { projectRoot, specsDir, runId, runDirEnv, agentId };
}

export function isSubprocessHarnessSubmit(): boolean {
	return (
		process.env.PI_HARNESS_SUBPROCESS === "1" &&
		Boolean(process.env.HARNESS_RUN_ID?.trim())
	);
}

export function registerHarnessSubagentSubmitTools(
	pi: ExtensionAPI,
	packageRoot: string,
): void {
	for (const spec of SUBMIT_TOOL_SPECS) {
		pi.registerTool({
			name: spec.toolName,
			label: spec.toolName.replace(/^submit_/, "Submit "),
			description: `Terminal harness artifact submit (${spec.toolName}). Call once with the full schema document before ending the turn.`,
			parameters: DocumentSchema,
			async execute(_id, params, _signal, _onUpdate, _ctx) {
				if (!isSubprocessHarnessSubmit()) {
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
					resolveHarnessSubmitRunContext(packageRoot);
				if (
					!allowsAgentTool({
						packageRoot,
						projectRoot,
						agentId,
						toolName: spec.toolName,
						toolInput: params as Record<string, unknown>,
						isSubprocess: true,
					})
				) {
					return {
						content: [
							{
								type: "text",
								text: `${spec.toolName} is not allowed for agent ${agentId} (agents.policy.yaml)`,
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
