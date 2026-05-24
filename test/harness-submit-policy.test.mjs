import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { allowsAgentTool } from "../.pi/lib/agents-policy.mjs";
import {
	specForSubmitTool,
} from "../.pi/lib/harness-subagent-submit-registry.ts";
import { extractLastSubmitCall } from "../.pi/lib/harness-agent-output.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = root;
const projectRoot = root;

function evaluateHarnessSubagentToolCall(toolName, toolInput, agentId) {
	const isParent = agentId === "parent-orchestrator";
	const allowed = allowsAgentTool({
		packageRoot,
		projectRoot,
		agentId,
		toolName,
		toolInput,
		isSubprocess: !isParent && Boolean(process.env.PI_HARNESS_SUBPROCESS),
		isParentOrchestrator: isParent,
	});
	return allowed ? { action: "allow" } : { action: "block" };
}

describe("submit tool policy", () => {
	test("parent session blocks submit_decomposition_brief", () => {
		const prev = process.env.PI_HARNESS_SUBPROCESS;
		delete process.env.PI_HARNESS_SUBPROCESS;
		const d = evaluateHarnessSubagentToolCall(
			"submit_decomposition_brief",
			{ document: { schema_version: "1.0.0" } },
			"parent-orchestrator",
		);
		assert.equal(d.action, "block");
		if (prev !== undefined) process.env.PI_HARNESS_SUBPROCESS = prev;
	});

	test("decompose allowed submit in subprocess", () => {
		const prevSub = process.env.PI_HARNESS_SUBPROCESS;
		process.env.PI_HARNESS_SUBPROCESS = "1";
		const d = evaluateHarnessSubagentToolCall(
			"submit_decomposition_brief",
			{ document: { schema_version: "1.0.0" } },
			"harness/planning/decompose",
		);
		assert.equal(d.action, "allow");
		if (prevSub !== undefined) process.env.PI_HARNESS_SUBPROCESS = prevSub;
		else delete process.env.PI_HARNESS_SUBPROCESS;
	});

	test("evaluator cannot call decompose submit tool", () => {
		const prevSub = process.env.PI_HARNESS_SUBPROCESS;
		process.env.PI_HARNESS_SUBPROCESS = "1";
		const d = evaluateHarnessSubagentToolCall(
			"submit_decomposition_brief",
			{ document: {} },
			"harness/reviewing/evaluator",
		);
		assert.equal(d.action, "block");
		if (prevSub !== undefined) process.env.PI_HARNESS_SUBPROCESS = prevSub;
		else delete process.env.PI_HARNESS_SUBPROCESS;
	});

	test("agents.policy.yaml grants decompose submit_decomposition_brief", () => {
		assert.ok(
			allowsAgentTool({
				packageRoot,
				projectRoot,
				agentId: "harness/planning/decompose",
				toolName: "submit_decomposition_brief",
				isSubprocess: true,
			}),
		);
		assert.ok(specForSubmitTool("submit_stack_brief"));
	});

	test("extractLastSubmitCall reads toolCall document", () => {
		const found = extractLastSubmitCall(
			[
				{
					role: "assistant",
					content: [
						{
							type: "toolCall",
							name: "submit_validation_turn",
							arguments: {
								document: {
									schema_version: "1.0.0",
									round_index: 2,
								},
							},
						},
					],
				},
			],
			"submit_validation_turn",
		);
		assert.ok(found);
		assert.equal(found.document.round_index, 2);
	});
});
