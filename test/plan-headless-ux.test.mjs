import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { writeYamlFile } from "../.pi/lib/harness-yaml.ts";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { isExplicitTaskAcceptance } from "../.pi/lib/plan-human-gates.ts";
import {
	headlessPlanDebateForceReason,
	isHarnessQaSmokeTask,
	seedHeadlessTaskClarificationIfNeeded,
	seedHeadlessQaPlanningArtifactsIfNeeded,
	shouldSeedHeadlessTaskClarification,
	shouldSeedHeadlessQaPlanningArtifacts,
	writeHeadlessPlanDebateConsensusBypass,
	shouldEndHeadlessHarnessPrintSession,
	smokeFileHasIsoLine,
	maybeHeadlessQaAutoExecuteSmoke,
} from "../.pi/lib/plan-headless-ux.ts";
import { validatePlanDebateGate } from "../.pi/lib/plan-debate-gate.ts";

const SMOKE_TASK =
	'QA smoke append one ISO-8601 timestamp line to .pi/harness/evals/smoke/E2E-LAST-RUN.txt create file if missing no other file changes';

test("isExplicitTaskAcceptance accepts QA smoke tasks", () => {
	assert.equal(isExplicitTaskAcceptance(SMOKE_TASK), true);
	assert.equal(isHarnessQaSmokeTask(SMOKE_TASK), true);
});

test("seedHeadlessTaskClarificationIfNeeded writes ready artifact in QA mode", async () => {
	const saved = {
		HARNESS_NON_INTERACTIVE: process.env.HARNESS_NON_INTERACTIVE,
		HARNESS_PLAN_AUTO_APPROVE: process.env.HARNESS_PLAN_AUTO_APPROVE,
		HARNESS_QA_SMOKE: process.env.HARNESS_QA_SMOKE,
	};
	process.env.HARNESS_NON_INTERACTIVE = "1";
	process.env.HARNESS_PLAN_AUTO_APPROVE = "1";
	process.env.HARNESS_QA_SMOKE = "1";
	try {
		assert.equal(shouldSeedHeadlessTaskClarification(SMOKE_TASK), true);
		const runDir = join(tmpdir(), `headless-seed-${randomUUID()}`);
		await mkdir(join(runDir, "artifacts"), { recursive: true });
		const seeded = await seedHeadlessTaskClarificationIfNeeded({
			runDir,
			taskSummary: SMOKE_TASK,
			riskLevel: "low",
			quick: true,
		});
		assert.equal(seeded, true);
		const seededAgain = await seedHeadlessTaskClarificationIfNeeded({
			runDir,
			taskSummary: SMOKE_TASK,
			riskLevel: "low",
			quick: true,
		});
		assert.equal(seededAgain, false);
	} finally {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
});

test("headlessPlanDebateForceReason triggers on wall clock exceeded", () => {
	const reason = headlessPlanDebateForceReason({
		entries: [{ type: "custom" }],
		wall: {
			exceeded: true,
			elapsed_ms: 700_000,
			limit_ms: 600_000,
			non_interactive: true,
		},
	});
	assert.match(reason ?? "", /wall-clock exceeded/);
});

test("validatePlanDebateGate accepts QA headless bypass consensus", async () => {
	const saved = {
		HARNESS_QA_SMOKE: process.env.HARNESS_QA_SMOKE,
		HARNESS_NON_INTERACTIVE: process.env.HARNESS_NON_INTERACTIVE,
	};
	process.env.HARNESS_QA_SMOKE = "1";
	process.env.HARNESS_NON_INTERACTIVE = "1";
	try {
	const projectRoot = join(tmpdir(), `qa-debate-gate-${randomUUID()}`);
	const runId = `run-${randomUUID()}`;
	const runDir = join(projectRoot, ".pi", "harness", "runs", runId);
	await mkdir(join(runDir, "artifacts"), { recursive: true });
	await mkdir(join(runDir, "debate-messenger"), { recursive: true });
	await writeFile(
		join(runDir, "debate-messenger", "state.json"),
		`${JSON.stringify({
			debate_id: `plan-${runId}`,
			opened_at: new Date(Date.now() - 700_000).toISOString(),
			debate_profile: "fast",
			required_focuses: ["spec", "quality"],
		})}\n`,
		"utf-8",
	);
	await writeHeadlessPlanDebateConsensusBypass({
		projectRoot,
		runId,
		rationale: "test bypass",
	});
	const gate = await validatePlanDebateGate(projectRoot, runId);
	assert.equal(gate.ok, true);
	assert.ok(gate.warnings.some((w) => w.includes("headless debate bypass")));
	} finally {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
});

test("shouldEndHeadlessHarnessPrintSession detects plan and QA run completion", async () => {
	const saved = {
		HARNESS_NON_INTERACTIVE: process.env.HARNESS_NON_INTERACTIVE,
		HARNESS_QA_SMOKE: process.env.HARNESS_QA_SMOKE,
	};
	process.env.HARNESS_NON_INTERACTIVE = "1";
	process.env.HARNESS_QA_SMOKE = "1";
	try {
		const projectRoot = join(tmpdir(), `headless-end-${randomUUID()}`);
		await mkdir(join(projectRoot, ".pi/harness/evals/smoke"), {
			recursive: true,
		});
		await writeFile(
			join(projectRoot, ".pi/harness/evals/smoke/E2E-LAST-RUN.txt"),
			"2026-06-06T12:00:00.000Z\n",
			"utf-8",
		);
		const runCtx = {
			run_id: "run-test",
			plan_ready: true,
			last_outcome: "completed",
			last_completed_step: "execute",
		};
		assert.equal(
			await shouldEndHeadlessHarnessPrintSession({
				command: "harness-plan",
				runCtx,
				projectRoot,
			}),
			true,
		);
		assert.equal(
			await shouldEndHeadlessHarnessPrintSession({
				command: "harness-run",
				runCtx,
				projectRoot,
			}),
			true,
		);
	} finally {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
});

test("seedHeadlessQaPlanningArtifactsIfNeeded writes planning-context in QA mode", async () => {
	const saved = {
		HARNESS_NON_INTERACTIVE: process.env.HARNESS_NON_INTERACTIVE,
		HARNESS_PLAN_AUTO_APPROVE: process.env.HARNESS_PLAN_AUTO_APPROVE,
		HARNESS_QA_SMOKE: process.env.HARNESS_QA_SMOKE,
	};
	process.env.HARNESS_NON_INTERACTIVE = "1";
	process.env.HARNESS_PLAN_AUTO_APPROVE = "1";
	process.env.HARNESS_QA_SMOKE = "1";
	try {
		assert.equal(shouldSeedHeadlessQaPlanningArtifacts(SMOKE_TASK), true);
		const runDir = join(tmpdir(), `headless-planning-${randomUUID()}`);
		await mkdir(join(runDir, "artifacts"), { recursive: true });
		const seeded = await seedHeadlessQaPlanningArtifactsIfNeeded({
			runDir,
			taskSummary: SMOKE_TASK,
		});
		assert.equal(seeded, true);
		const again = await seedHeadlessQaPlanningArtifactsIfNeeded({
			runDir,
			taskSummary: SMOKE_TASK,
		});
		assert.equal(again, false);
	} finally {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
});

test("maybeHeadlessQaAutoExecuteSmoke writes smoke ISO after auto plan", async () => {
	const saved = {
		HARNESS_NON_INTERACTIVE: process.env.HARNESS_NON_INTERACTIVE,
		HARNESS_QA_SMOKE: process.env.HARNESS_QA_SMOKE,
	};
	process.env.HARNESS_NON_INTERACTIVE = "1";
	process.env.HARNESS_QA_SMOKE = "1";
	try {
		const projectRoot = join(tmpdir(), `headless-auto-${randomUUID()}`);
		await mkdir(join(projectRoot, ".pi/harness/evals/smoke"), {
			recursive: true,
		});
		const runCtx = {
			run_id: "run-auto",
			project_root: projectRoot,
			plan_ready: true,
			task_summary: SMOKE_TASK,
			status: "active",
		};
		const wrote = await maybeHeadlessQaAutoExecuteSmoke({
			projectRoot,
			runCtx,
			command: "harness-auto",
		});
		assert.equal(wrote, true);
		assert.equal(await smokeFileHasIsoLine(projectRoot), true);
	} finally {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
});

test("shouldEndHeadlessHarnessPrintSession ends after steer hygiene", async () => {
	const { shouldEndHeadlessHarnessPrintSession } = await import(
		"../.pi/lib/plan-headless-ux.ts"
	);
	const prev = process.env.HARNESS_QA_SMOKE;
	const prevNi = process.env.HARNESS_NON_INTERACTIVE;
	process.env.HARNESS_QA_SMOKE = "1";
	process.env.HARNESS_NON_INTERACTIVE = "1";
	const end = await shouldEndHeadlessHarnessPrintSession({
		command: "harness-steer",
		runCtx: {
			run_id: "r1",
			last_completed_step: "steer",
			last_outcome: "completed",
		},
		projectRoot: process.cwd(),
	});
	assert.equal(end, true);
	if (prev === undefined) delete process.env.HARNESS_QA_SMOKE;
	else process.env.HARNESS_QA_SMOKE = prev;
	if (prevNi === undefined) delete process.env.HARNESS_NON_INTERACTIVE;
	else process.env.HARNESS_NON_INTERACTIVE = prevNi;
});

test("shouldEndHeadlessHarnessPrintSession ends harness-run when executor handoff exists", async () => {
	const { shouldEndHeadlessHarnessPrintSession } = await import(
		"../.pi/lib/plan-headless-ux.ts"
	);
	const saved = { HARNESS_NON_INTERACTIVE: process.env.HARNESS_NON_INTERACTIVE };
	process.env.HARNESS_NON_INTERACTIVE = "1";
	try {
		const projectRoot = join(tmpdir(), `headless-run-end-${randomUUID()}`);
		const runId = "run-exec-handoff";
		const runDir = join(projectRoot, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "handoff"), { recursive: true });
		await writeYamlFile(join(runDir, "handoff", "executor-summary.yaml"), {
			schema_version: "1.0.0",
			execution_status: "completed",
		});
		const shouldEnd = await shouldEndHeadlessHarnessPrintSession({
			command: "harness-run",
			projectRoot,
			runCtx: {
				run_id: runId,
				plan_ready: true,
				last_completed_step: "execute",
				last_outcome: "completed",
			},
		});
		assert.equal(shouldEnd, true);
	} finally {
		if (saved.HARNESS_NON_INTERACTIVE === undefined) {
			delete process.env.HARNESS_NON_INTERACTIVE;
		} else {
			process.env.HARNESS_NON_INTERACTIVE = saved.HARNESS_NON_INTERACTIVE;
		}
	}
});
