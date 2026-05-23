import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { evaluateHarnessSubagentToolCall } from "../.pi/extensions/lib/harness-subagent-policy.ts";
import {
	SUBMIT_TOOLS_BY_AGENT,
	specForSubmitTool,
} from "../.pi/extensions/lib/harness-subagent-submit-registry.ts";
import { extractLastSubmitCall } from "../.pi/lib/harness-agent-output.ts";

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

	test("registry maps agents to tools", () => {
		assert.ok(
			SUBMIT_TOOLS_BY_AGENT["harness/planning/decompose"]?.has(
				"submit_decomposition_brief",
			),
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
