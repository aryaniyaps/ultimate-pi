import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
	formatPlanHumanGateBlock,
	hasTaskClarificationAskUserSincePlanCommand,
	resolvePlanHumanGateStatus,
	validateTaskClarificationHumanGate,
} from "../.pi/lib/plan-human-gates.ts";
import { validateHarnessSpawnTopology } from "../.pi/lib/harness-spawn-topology.ts";

const readyDoc = {
	status: "ready",
	clarified_task: "Implement harness plan gates with user approval",
	unresolved_questions: [],
};

test("validateTaskClarificationHumanGate blocks ready without ask_user", () => {
	const saved = {
		HARNESS_NON_INTERACTIVE: process.env.HARNESS_NON_INTERACTIVE,
		HARNESS_PLAN_AUTO_APPROVE: process.env.HARNESS_PLAN_AUTO_APPROVE,
		HARNESS_PLAN_NONINTERACTIVE: process.env.HARNESS_PLAN_NONINTERACTIVE,
	};
	delete process.env.HARNESS_NON_INTERACTIVE;
	delete process.env.HARNESS_PLAN_AUTO_APPROVE;
	delete process.env.HARNESS_PLAN_NONINTERACTIVE;
	try {
		const gate = validateTaskClarificationHumanGate([], readyDoc);
		assert.equal(gate.ok, false);
		assert.ok(gate.errors[0]?.includes("ask_user"));
	} finally {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
});

test("validateTaskClarificationHumanGate allows ready after ask_user transcript", () => {
	const entries = [
		{ type: "custom", customType: "harness-plan-attempt", data: {} },
		{
			type: "message",
			message: {
				role: "toolResult",
				toolName: "ask_user",
				details: { cancelled: false, response: { kind: "selection", selections: ["Med risk"] } },
			},
		},
	];
	assert.equal(hasTaskClarificationAskUserSincePlanCommand(entries), true);
	const gate = validateTaskClarificationHumanGate(entries, readyDoc);
	assert.equal(gate.ok, true);
});

test("resolvePlanHumanGateStatus surfaces Review Gate when debate incomplete", async () => {
	const projectRoot = join(tmpdir(), `proj-debate-gate-${randomUUID()}`);
	const runId = `run-${randomUUID()}`;
	const runDir = join(projectRoot, ".pi", "harness", "runs", runId);
	const artifactsDir = join(runDir, "artifacts");
	await mkdir(join(runDir, "debate-messenger"), { recursive: true });
	await mkdir(artifactsDir, { recursive: true });

	const clarYaml = `schema_version: "1.0.0"
status: ready
clarified_task: Add harness-clear prompt
unresolved_questions: []
risk_level: med
`;
	const planningContextYaml = `schema_version: "1.0.0"
status: ok
summary: ok
coverage:
  architecture:
    status: ok
  structure:
    status: ok
  semantic:
    status: ok
`;
	const phase35 = `schema_version: "1.0.0"
status: ok
`;
	const planPacket = `contract_version: "1.1.0"
plan_id: plan-test
scope: test
execution_plan:
  work_items: []
`;

	await writeFile(join(artifactsDir, "task-clarification.yaml"), clarYaml, "utf-8");
	await writeFile(join(artifactsDir, "planning-context.yaml"), planningContextYaml, "utf-8");
	await writeFile(join(artifactsDir, "decomposition.yaml"), phase35, "utf-8");
	await writeFile(join(artifactsDir, "hypothesis.yaml"), phase35, "utf-8");
	await writeFile(join(artifactsDir, "implementation-research.yaml"), phase35, "utf-8");
	await writeFile(join(artifactsDir, "stack.yaml"), phase35, "utf-8");
	await writeFile(join(artifactsDir, "execution-plan-draft.yaml"), phase35, "utf-8");
	await writeFile(join(runDir, "plan-packet.yaml"), planPacket, "utf-8");
	await writeFile(
		join(runDir, "debate-messenger", "state.json"),
		JSON.stringify({
			schema_version: "1.0.0",
			run_id: runId,
			rounds: {},
			debate_profile: "full",
			required_focuses: ["spec", "wbs", "schedule", "quality"],
			review_gate_mode: "threaded",
		}),
		"utf-8",
	);

	const entries = [
		{ type: "custom", customType: "harness-plan-attempt", data: {} },
		{
			type: "message",
			message: {
				role: "toolResult",
				toolName: "ask_user",
				details: { cancelled: false, response: { kind: "selection", selections: ["Yes"] } },
			},
		},
	];

	const status = await resolvePlanHumanGateStatus(projectRoot, runId, entries, {
		taskSummary: "Add harness-clear prompt",
	});
	assert.equal(status.phase0Ready, true);
	assert.equal(status.debateComplete, false);
	assert.equal(status.debateRequired, true);
	assert.equal(status.approvalRequired, false);
	assert.ok(status.nextRequiredAction?.includes("Review Gate"));
	assert.ok(status.debateRecoveryHint?.includes("harness_debate_consensus"));

	const block = formatPlanHumanGateBlock(status);
	assert.match(block, /\[HarnessPlanGate\]/);
	assert.match(block, /review_gate_required=true/);
	assert.match(block, /Do not end this turn with prose only/);
});

test("resolvePlanHumanGateStatus still requires debate under HARNESS_PLAN_NONINTERACTIVE", async () => {
	const prev = process.env.HARNESS_PLAN_NONINTERACTIVE;
	process.env.HARNESS_PLAN_NONINTERACTIVE = "1";
	try {
		const projectRoot = join(tmpdir(), `proj-debate-ni-${randomUUID()}`);
		const runId = `run-${randomUUID()}`;
		const runDir = join(projectRoot, ".pi", "harness", "runs", runId);
		const artifactsDir = join(runDir, "artifacts");
		await mkdir(join(runDir, "debate-messenger"), { recursive: true });
		await mkdir(artifactsDir, { recursive: true });
		await writeFile(
			join(artifactsDir, "task-clarification.yaml"),
			`status: ready
clarified_task: Add harness-clear prompt
unresolved_questions: []
risk_level: med
`,
			"utf-8",
		);
		await writeFile(
			join(artifactsDir, "planning-context.yaml"),
			`schema_version: "1.0.0"
status: ok
coverage:
  architecture: { status: ok }
  structure: { status: ok }
  semantic: { status: ok }
`,
			"utf-8",
		);
		for (const name of [
			"decomposition.yaml",
			"hypothesis.yaml",
			"implementation-research.yaml",
			"stack.yaml",
			"execution-plan-draft.yaml",
		]) {
			await writeFile(
				join(artifactsDir, name),
				`schema_version: "1.0.0"
status: ok
`,
				"utf-8",
			);
		}
		await writeFile(
			join(runDir, "plan-packet.yaml"),
			`contract_version: "1.1.0"
plan_id: plan-test
scope: test
execution_plan:
  work_items: []
`,
			"utf-8",
		);
		await writeFile(
			join(runDir, "debate-messenger", "state.json"),
			JSON.stringify({
				schema_version: "1.0.0",
				run_id: runId,
				rounds: {},
				debate_profile: "full",
				required_focuses: ["spec", "wbs", "schedule", "quality"],
			}),
			"utf-8",
		);
		const status = await resolvePlanHumanGateStatus(projectRoot, runId, [], {
			taskSummary: "Add harness-clear prompt",
		});
		assert.equal(status.debateRequired, true);
		assert.equal(status.approvalRecorded, false);
	} finally {
		if (prev === undefined) delete process.env.HARNESS_PLAN_NONINTERACTIVE;
		else process.env.HARNESS_PLAN_NONINTERACTIVE = prev;
	}
});

test("spawn topology blocks decompose when clarification ready but no ask_user", async () => {
	const saved = {
		HARNESS_NON_INTERACTIVE: process.env.HARNESS_NON_INTERACTIVE,
		HARNESS_PLAN_AUTO_APPROVE: process.env.HARNESS_PLAN_AUTO_APPROVE,
		HARNESS_PLAN_NONINTERACTIVE: process.env.HARNESS_PLAN_NONINTERACTIVE,
	};
	delete process.env.HARNESS_NON_INTERACTIVE;
	delete process.env.HARNESS_PLAN_AUTO_APPROVE;
	delete process.env.HARNESS_PLAN_NONINTERACTIVE;
	try {
		const projectRoot = join(tmpdir(), `proj-hgate-${randomUUID()}`);
		const runId = `run-${randomUUID()}`;
		const runDir = join(projectRoot, ".pi", "harness", "runs", runId, "artifacts");
		await mkdir(runDir, { recursive: true });
		await writeFile(
			join(runDir, "task-clarification.yaml"),
			`status: ready
clarified_task: Implement harness plan gates with user approval
unresolved_questions: []
`,
			"utf-8",
		);
		const result = await validateHarnessSpawnTopology(
			["harness/planning/decompose"],
			"plan",
			{ projectRoot, runId, entries: [] },
		);
		assert.equal(result.ok, false);
		assert.ok(result.message?.includes("ask_user"));
	} finally {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
});
