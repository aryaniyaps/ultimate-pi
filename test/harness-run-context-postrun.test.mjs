import assert from "node:assert/strict";
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, test } from "node:test";
import {
	buildHarnessClearManifest,
	evaluateCrossSessionResume,
	getLatestRunContext,
	hasConfirmedHarnessClear,
	claimRunOwnership,
	nextStepAfterOutcome,
	parseHarnessUseRunArgs,
	getPolicyTransitionBlock,
	policyBootstrapFromRunContext,
	policyStateFromDiskIfNeeded,
	resolveCompletionStatuses,
	resolveCrossSessionResumeInfo,
	blockingHarnessAutoCommandReason,
	blockingReviewCommandReason,
	blockingRunCommandReason,
	blockingSteerCommandReason,
	harnessAutoTasksDiffer,
	resetRunContextForHarnessAuto,
	shouldReuseHarnessRunId,
	shouldReuseHarnessRunIdForAuto,
	isHarnessAutoSession,
	ensureReviewOutcomeFromEval,
	readSteerStateFromRun,
	remediationClassFromEvalVerdict,
	reconcileReviewRouting,
	resolveSteerEntryEffects,
	updateSteerStateOnEntry,
	reconcileStaleExecuteCompletion,
	refreshRunContextProgress,
	releaseForeignQaRunOwnership,
	saveProjectActiveRun,
	saveRunContextToDisk,
	resolveArgsForCommand,
	resolveHarnessRunPostAgentState,
	syncPlanLastOutcomeFromTaskClarification,
	syncPlanReadyFromDisk,
} from "../.pi/lib/harness-run-context.ts";
import {
	armHarnessKillSwitch,
	disarmHarnessKillSwitch,
	isHarnessKillSwitchDisarmed,
} from "../.pi/lib/agt/kill-switch-state.ts";
import { writeYamlFile } from "../.pi/lib/harness-yaml.ts";

describe("parseHarnessUseRunArgs", () => {
	test("parses run id and flags", () => {
		const parsed = parseHarnessUseRunArgs(
			"--claim --readonly 019e5345-b9d3-784b-ab45-a6ffcbdd0a41-1779513618959",
		);
		assert.equal(
			parsed.runId,
			"019e5345-b9d3-784b-ab45-a6ffcbdd0a41-1779513618959",
		);
		assert.equal(parsed.claim, true);
		assert.equal(parsed.readonly, true);
	});
});


describe("buildHarnessClearManifest", () => {
	test("limits candidates to in-root run directories and only protects explicit ids", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-clear-manifest-"));
		const runsRoot = join(root, ".pi", "harness", "runs");
		await mkdir(runsRoot, { recursive: true });
		await mkdir(join(runsRoot, "run-a"), { recursive: true });
		await mkdir(join(runsRoot, "run-b"), { recursive: true });
		const outside = join(root, "outside-run");
		await mkdir(outside, { recursive: true });
		await symlink(outside, join(runsRoot, "escape-run"));
		const manifest = await buildHarnessClearManifest(root, ["run-b"]);
		assert.deepEqual(
			manifest.candidates.map((candidate) => candidate.run_id),
			["run-a"],
		);
		assert.equal(manifest.protected_run_ids.includes("run-b"), true);

		const clearAllManifest = await buildHarnessClearManifest(root);
		assert.deepEqual(
			clearAllManifest.candidates.map((candidate) => candidate.run_id),
			["run-a", "run-b"],
		);
		assert.equal(
			manifest.skipped.some(
				(item) =>
					item.run_id === "escape-run" && item.reason === "out_of_root",
			),
			true,
		);
		await rm(root, { recursive: true, force: true });
	});
	test("getLatestRunContext treats confirmed harness-clear as clearing active run", () => {
		const runContext = {
			schema_version: "1.0.0",
			run_id: "run-cleared",
			pi_session_id: "sess",
			project_root: "/tmp/project",
			phase: "plan",
			plan_id: null,
			plan_packet_path: null,
			plan_ready: false,
			task_summary: "clear",
			status: "active",
			last_completed_step: null,
			last_outcome: null,
			next_recommended_command: null,
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		assert.equal(
			getLatestRunContext([
				{ type: "custom", customType: "harness-run-context", data: runContext },
				{
					type: "custom",
					customType: "harness-clear-result",
					data: { approved: true, cleared_all: true },
				},
			]),
			null,
		);
	});
	test("getLatestRunContext keeps a new run started after cleared_all with no active_run_ids", () => {
		const newRun = {
			schema_version: "1.0.0",
			run_id: "run-new",
			pi_session_id: "sess",
			project_root: "/tmp/project",
			phase: "plan",
			plan_id: "plan-new",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "new",
			status: "active",
			last_completed_step: "plan",
			last_outcome: "ready",
			next_recommended_command: "/harness-run",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const latest = getLatestRunContext([
			{
				type: "custom",
				customType: "harness-clear-result",
				data: {
					approved: true,
					active_cleared: true,
					cleared_all: true,
					active_run_ids: [],
				},
			},
			{ type: "custom", customType: "harness-run-context", data: newRun },
		]);
		assert.equal(latest?.run_id, "run-new");
		assert.equal(latest?.next_recommended_command, "/harness-run");
	});
	test("getLatestRunContext does not revive a cleared active run from a later stale entry", () => {
		const runContext = {
			schema_version: "1.0.0",
			run_id: "run-stale",
			pi_session_id: "sess",
			project_root: "/tmp/project",
			phase: "execute",
			plan_id: "plan-stale",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "clear",
			status: "active",
			last_completed_step: "execute",
			last_outcome: "completed",
			next_recommended_command: "/harness-review",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		assert.equal(
			getLatestRunContext([
				{
					type: "custom",
					customType: "harness-clear-result",
					data: {
						approved: true,
						active_cleared: true,
						cleared_all: true,
						active_run_ids: ["run-stale"],
					},
				},
				{ type: "custom", customType: "harness-run-context", data: runContext },
			]),
			null,
		);
	});
	test("getLatestRunContext does not clear active run on cancelled harness-clear", () => {
		const runContext = {
			schema_version: "1.0.0",
			run_id: "run-not-cleared",
			pi_session_id: "sess",
			project_root: "/tmp/project",
			phase: "plan",
			plan_id: null,
			plan_packet_path: null,
			plan_ready: false,
			task_summary: "clear",
			status: "active",
			last_completed_step: null,
			last_outcome: null,
			next_recommended_command: null,
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const latest = getLatestRunContext([
			{ type: "custom", customType: "harness-run-context", data: runContext },
			{
				type: "custom",
				customType: "harness-clear-result",
				data: { approved: false, cleared_all: false, active_cleared: false },
			},
		]);
		assert.equal(latest?.run_id, "run-not-cleared");
		assert.equal(
			hasConfirmedHarnessClear([
				{
					type: "custom",
					customType: "harness-clear-result",
					data: { approved: false, cleared_all: false, active_cleared: false },
				},
			]),
			false,
		);
	});


});
describe("cross-session resume eligibility", () => {
	function runContext(root, overrides = {}) {
		return {
			schema_version: "1.0.0",
			run_id: "run-resume",
			pi_session_id: "sess-old",
			project_root: root,
			phase: "plan",
			plan_id: "plan-resume",
			plan_packet_path: join(root, ".pi", "harness", "runs", "run-resume", "plan-packet.yaml"),
			plan_ready: true,
			task_summary: "resume task",
			status: "active",
			last_completed_step: "plan",
			last_outcome: "ready",
			next_recommended_command: null,
			owner_pi_session_id: "sess-old",
			updated_at: new Date().toISOString(),
			...overrides,
		};
	}

	test("evaluateCrossSessionResume ignores tombstoned disk pointer after confirmed clear", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-resume-tombstone-"));
		try {
			const ctx = runContext(root, { run_id: "run-stale", plan_id: "plan-stale" });
			await saveRunContextToDisk(ctx);
			await saveProjectActiveRun(ctx);
			const entries = [
				{
					type: "custom",
					customType: "harness-clear-result",
					data: {
						approved: true,
						active_cleared: true,
						cleared_all: true,
						active_run_ids: ["run-stale"],
					},
				},
				{ type: "custom", customType: "harness-run-context", data: ctx },
			];
			assert.equal(getLatestRunContext(entries), null);
			assert.equal(await evaluateCrossSessionResume(root, entries), null);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("evaluateCrossSessionResume ignores active pointer tombstoned by confirmed clear", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-resume-clear-pointer-"));
		try {
			const ctx = runContext(root, { run_id: "run-cleared" });
			await saveRunContextToDisk(ctx);
			await saveProjectActiveRun(ctx);
			const entries = [
				{
					type: "custom",
					customType: "harness-clear-result",
					data: {
						approved: true,
						active_cleared: true,
						active_run_ids: ["run-cleared"],
					},
				},
			];
			assert.equal(await evaluateCrossSessionResume(root, entries), null);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("valid prior-session active run remains resumable with claim command", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-resume-valid-"));
		try {
			const ctx = runContext(root);
			await saveRunContextToDisk(ctx);
			await saveProjectActiveRun(ctx);
			const info = await evaluateCrossSessionResume(root, []);
			assert.equal(info?.resumeCommand, "/harness-use-run run-resume --claim");
			assert.equal(info?.nextAfterResume, "/harness-run");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("confirmed clear suppresses otherwise valid active-run resume", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-resume-cleared-"));
		try {
			const ctx = runContext(root);
			await saveRunContextToDisk(ctx);
			await saveProjectActiveRun(ctx);
			const info = await evaluateCrossSessionResume(root, [
				{
					type: "custom",
					customType: "harness-clear-result",
					data: { approved: true, active_cleared: true, cleared_all: true },
				},
			]);
			assert.equal(info, null);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("invalid active-run pointers fail closed without resume command", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-resume-invalid-"));
		try {
			for (const status of ["completed", "aborted"]) {
				const ctx = runContext(root, { status });
				await saveRunContextToDisk(ctx);
				await saveProjectActiveRun(ctx);
				assert.equal(await evaluateCrossSessionResume(root, []), null);
			}

			const missingCtx = runContext(root, { run_id: "run-missing" });
			await saveProjectActiveRun(missingCtx);
			assert.equal(await evaluateCrossSessionResume(root, []), null);

			const staleCtx = runContext(root, {
				run_id: "run-stale",
				updated_at: "2000-01-01T00:00:00.000Z",
			});
			await saveRunContextToDisk(staleCtx);
			await saveProjectActiveRun(staleCtx);
			assert.equal(await evaluateCrossSessionResume(root, []), null);


			const foreignCtx = runContext(root, {
				project_root: join(root, "other-project"),
				status: "active",
			});
			await mkdir(join(root, ".pi", "harness", "runs", foreignCtx.run_id), {
				recursive: true,
			});
			await writeYamlFile(
				join(root, ".pi", "harness", "runs", foreignCtx.run_id, "run-context.yaml"),
				foreignCtx,
			);
			assert.equal(
				await resolveCrossSessionResumeInfo(root, {
					schema_version: "1.0.0",
					run_id: "run-resume",
					project_root: root,
					owner_pi_session_id: "sess-old",
					phase: "plan",
					plan_id: "plan-resume",
					plan_ready: true,
					updated_at: "2026-01-01T00:00:00.000Z",
				}),
				null,
			);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

let extensionHarness;

async function getExtensionHarness() {
	if (extensionHarness) return extensionHarness;
	const commands = new Map();
	const lifecycle = new Map();
	const eventHandlers = new Map();
	const sentMessages = [];
	const appendedEntries = [];
	const addHandler = (map, name, handler) => {
		const handlers = map.get(name) ?? [];
		handlers.push(handler);
		map.set(name, handlers);
	};
	const pi = {
		registerCommand(name, definition) {
			commands.set(name, definition.handler);
		},
		registerTool() {},
		appendEntry(customType, data) {
			appendedEntries.push({ type: "custom", customType, data });
		},
		sendMessage(message) {
			sentMessages.push(message);
		},
		events: {
			on(name, handler) {
				addHandler(eventHandlers, name, handler);
			},
			emit(name, payload) {
				for (const handler of eventHandlers.get(name) ?? []) handler(payload);
			},
		},
		on(name, handler) {
			addHandler(lifecycle, name, handler);
		},
	};
	const mod = await import("../.pi/extensions/harness-run-context.ts");
	const install = mod.default?.default ?? mod.default;
	install(pi);
	extensionHarness = {
		commands,
		lifecycle,
		sentMessages,
		appendedEntries,
		emit: pi.events.emit,
		reset() {
			sentMessages.length = 0;
			appendedEntries.length = 0;
			pi.events.emit("harness-runs-cleared", {});
		},
	};
	return extensionHarness;
}

function extensionCtx({ entries = [], notifications = [], sessionId = "new-session" } = {}) {
	return {
		hasUI: true,
		ui: {
			notify(message, type) {
				notifications.push({ message, type });
			},
		},
		sessionManager: {
			getEntries: () => entries,
			getSessionId: () => sessionId,
		},
	};
}

async function writeActiveRunPointer(root, overrides = {}) {
	await mkdir(join(root, ".pi", "harness"), { recursive: true });
	await writeFile(
		join(root, ".pi", "harness", "active-run.json"),
		`${JSON.stringify(
			{
				schema_version: "1.0.0",
				run_id: "missing-run",
				project_root: root,
				owner_pi_session_id: "old-session",
				phase: "execute",
				plan_id: "plan-missing",
				plan_ready: true,
				updated_at: new Date().toISOString(),
				...overrides,
			},
			null,
			2,
		)}\n`,
		"utf-8",
	);
}

describe("harness-run-context extension invalid active pointer handling", () => {
	test("/harness-plan is not blocked by a missing active-run pointer", async () => {
		const harness = await getExtensionHarness();
		harness.reset();
		const root = await mkdtemp(join(tmpdir(), "up-ext-missing-plan-"));
		const prev = process.cwd();
		try {
			process.chdir(root);
			await writeActiveRunPointer(root);
			const beforeAgentStart = harness.lifecycle.get("before_agent_start")?.[0];
			assert.ok(beforeAgentStart);
			const result = await beforeAgentStart(
				{ prompt: '/harness-plan "new task"', systemPrompt: "base" },
				extensionCtx(),
			);
			assert.notEqual(result?.message?.customType, "harness-run-context-block");
			assert.ok(!result?.message?.content?.includes("Active harness run in progress"));
		} finally {
			process.chdir(prev);
			await rm(root, { recursive: true, force: true });
		}
	});

	test("/harness-run-status treats confirmed clear plus leftover pointer as no active run", async () => {
		const harness = await getExtensionHarness();
		harness.reset();
		const root = await mkdtemp(join(tmpdir(), "up-ext-clear-status-"));
		const prev = process.cwd();
		const notifications = [];
		try {
			process.chdir(root);
			await writeActiveRunPointer(root, {
				run_id: "cleared-run",
				plan_id: "plan-cleared",
			});
			const entries = [
				{
					type: "custom",
					customType: "harness-clear-result",
					data: { approved: true, active_cleared: true, cleared_all: true },
				},
			];
			await harness.commands.get("harness-run-status")(
				"",
				extensionCtx({ entries, notifications }),
			);
			const text = notifications.map((item) => item.message).join("\n");
			assert.match(text, /No active harness run\. Start with \/harness-plan/);
			assert.ok(!text.includes("phase: execute"));
			assert.ok(!text.includes("plan-cleared"));
		} finally {
			process.chdir(prev);
			await rm(root, { recursive: true, force: true });
		}
	});

	test("valid prior-session run still offers explicit claim recovery", async () => {
		const harness = await getExtensionHarness();
		harness.reset();
		const root = await mkdtemp(join(tmpdir(), "up-ext-valid-resume-"));
		const prev = process.cwd();
		try {
			process.chdir(root);
			const ctx = {
				schema_version: "1.0.0",
				run_id: "run-resume",
				pi_session_id: "old-session",
				project_root: root,
				phase: "plan",
				plan_id: "plan-resume",
				plan_packet_path: join(root, ".pi", "harness", "runs", "run-resume", "plan-packet.yaml"),
				plan_ready: true,
				task_summary: "resume task",
				status: "active",
				last_completed_step: "plan",
				last_outcome: "ready",
				next_recommended_command: null,
				owner_pi_session_id: "old-session",
				updated_at: new Date().toISOString(),
			};
			await saveRunContextToDisk(ctx);
			await saveProjectActiveRun(ctx);
			const sessionStart = harness.lifecycle.get("session_start")?.[0];
			assert.ok(sessionStart);
			await sessionStart({}, extensionCtx({ sessionId: "new-session" }));
			const content = harness.sentMessages.map((message) => message.content).join("\n");
			assert.match(content, /\/harness-use-run run-resume --claim/);
		} finally {
			process.chdir(prev);
			await rm(root, { recursive: true, force: true });
		}
	});
});



describe("getPolicyTransitionBlock cross-session bootstrap", () => {
	test("allows harness-review when disk run context is hydrated without session policy", () => {
		const activeCtx = {
			schema_version: "1.0.0",
			run_id: "run-review",
			pi_session_id: "sess",
			project_root: "/tmp/project",
			phase: "evaluate",
			plan_id: "plan-review",
			plan_packet_path: "/tmp/project/.pi/harness/runs/run-review/plan-packet.yaml",
			plan_ready: true,
			task_summary: "widget",
			status: "active",
			last_completed_step: "steer",
			last_outcome: "completed",
			next_recommended_command: "/harness-review",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const block = getPolicyTransitionBlock("/harness-review --quick", [], activeCtx);
		assert.equal(block.blocked, false);
	});
});

describe("claimRunOwnership", () => {
	test("sets owner and pi session to current session", () => {
		const ctx = claimRunOwnership(
			{
				schema_version: "1.0.0",
				run_id: "run-a",
				pi_session_id: "old",
				project_root: "/tmp",
				phase: "evaluate",
				plan_id: "plan-a",
				plan_packet_path: null,
				plan_ready: true,
				task_summary: null,
				status: "active",
				last_completed_step: "execute",
				last_outcome: "completed",
				next_recommended_command: null,
				owner_pi_session_id: "old-owner",
				updated_at: "2026-01-01T00:00:00.000Z",
			},
			"new-session",
		);
		assert.equal(ctx.owner_pi_session_id, "new-session");
		assert.equal(ctx.pi_session_id, "new-session");
	});
});

describe("nextStepAfterOutcome post-run", () => {
	test("after execute suggests harness-review master command", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "evaluate",
				executionStatus: "completed",
			}),
			"/harness-review",
		);
	});

	test("eval fail after review with implementation_gap suggests steer", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "evaluate",
				evalStatus: "fail",
				lastCompletedStep: "review",
				remediationClass: "implementation_gap",
				steerAttempt: 0,
				steerMaxAttempts: 3,
				reviewComplete: true,
			}),
			"/harness-steer",
		);
	});

	test("hygiene steer entry does not increment steer_attempt", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-hygiene-steer-"));
		const runId = "run-hygiene";
		const artifacts = join(root, ".pi", "harness", "runs", runId, "artifacts");
		await mkdir(artifacts, { recursive: true });
		await writeYamlFile(join(artifacts, "repair-brief.yaml"), {
			schema_version: "1.1.0",
			run_id: runId,
			gap_kind: "hygiene",
			remediation_class: "implementation_gap",
		});
		await writeYamlFile(join(artifacts, "steer-state.yaml"), {
			schema_version: "1.0.0",
			run_id: runId,
			attempt: 1,
			hygiene_repairs: 0,
		});
		const effects = await resolveSteerEntryEffects(runId, root, "");
		assert.equal(effects.skipExecutor, true);
		assert.equal(effects.incrementSteerAttempt, false);
		assert.equal(effects.incrementHygieneRepairs, true);
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "execute",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "review",
			last_outcome: "fail",
			next_recommended_command: "/harness-steer",
			owner_pi_session_id: "sess",
			steer_attempt: 1,
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		await updateSteerStateOnEntry(runId, root, effects, ctx);
		const state = await readSteerStateFromRun(runId, root);
		assert.equal(state?.attempt, 1);
		assert.equal(state?.hygiene_repairs, 1);
		await rm(root, { recursive: true, force: true });
	});

	test("burst cap allows one extra steer when burst env on", async () => {
		const prev = process.env.HARNESS_STEER_BURST;
		process.env.HARNESS_STEER_BURST = "1";
		const root = await mkdtemp(join(tmpdir(), "up-burst-cap-"));
		const runId = "run-burst";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		const artifacts = join(runDir, "artifacts");
		await mkdir(join(runDir, "handoff"), { recursive: true });
		await mkdir(artifacts, { recursive: true });
		await writeYamlFile(join(runDir, "handoff", "executor-summary.yaml"), {
			execution_status: "completed",
		});
		await writeYamlFile(join(artifacts, "eval-verdict.yaml"), {
			schema_version: "1.0.0",
			status: "pass",
		});
		await writeYamlFile(join(artifacts, "adversary-report.yaml"), {
			schema_version: "1.0.0",
			block_merge: true,
		});
		await writeYamlFile(join(artifacts, "repair-brief.yaml"), {
			schema_version: "1.1.0",
			remediation_class: "implementation_gap",
		});
		await writeYamlFile(join(artifacts, "review-outcome.yaml"), {
			schema_version: "1.0.0",
			remediation_class: "implementation_gap",
		});
		await writeYamlFile(join(artifacts, "steer-state.yaml"), {
			schema_version: "1.0.0",
			attempt: 3,
			max_attempts: 3,
		});
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "evaluate",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "review",
			last_outcome: "pass",
			next_recommended_command: "/harness-steer --burst",
			owner_pi_session_id: "sess",
			steer_attempt: 3,
			steer_max_attempts: 3,
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const atCap = await blockingSteerCommandReason("harness-steer", ctx, root);
		assert.equal(atCap, null);
		await writeYamlFile(join(artifacts, "steer-state.yaml"), {
			schema_version: "1.0.0",
			attempt: 4,
			max_attempts: 3,
		});
		const ctxExhausted = { ...ctx, steer_attempt: 4 };
		const blocked = await blockingSteerCommandReason(
			"harness-steer",
			ctxExhausted,
			root,
		);
		assert.match(blocked ?? "", /cap reached/i);
		if (prev === undefined) delete process.env.HARNESS_STEER_BURST;
		else process.env.HARNESS_STEER_BURST = prev;
		await rm(root, { recursive: true, force: true });
	});

	test("split verdict burst routes to harness-steer --burst", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "evaluate",
				evalStatus: "pass",
				lastCompletedStep: "review",
				remediationClass: "implementation_gap",
				steerAttempt: 0,
				steerMaxAttempts: 3,
				reviewComplete: true,
				burstAllowed: true,
			}),
			"/harness-steer --burst",
		);
	});

	test("adversary complete suggests policy status", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "evaluate",
				evalStatus: "pass",
				adversaryComplete: true,
			}),
			"/harness-policy-status",
		);
	});
});

describe("resolveCompletionStatuses", () => {
	test("reads eval-verdict.yaml from run dir", async () => {
		const root = await mkdtemp(join(tmpdir(), "harness-postrun-"));
		const runId = "run-test-1";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "artifacts"), { recursive: true });
		await writeYamlFile(join(runDir, "artifacts", "eval-verdict.yaml"), {
			schema_version: "1.0.0",
			contract_version: "1.0.0",
			run_id: runId,
			status: "fail",
			failed_checks: ["AC-01"],
			regression_flags: [],
			confidence: 0.5,
			recommended_action: "replan",
		});
		const statuses = await resolveCompletionStatuses([], runId, root);
		assert.equal(statuses.evalStatus, "fail");
		assert.equal(statuses.adversaryComplete, false);
		await rm(root, { recursive: true, force: true });
	});
});

describe("policyBootstrapFromRunContext", () => {
	test("executor subprocess gets approved plan from disk context", () => {
		const prev = process.env.HARNESS_AGENT_ID;
		process.env.HARNESS_AGENT_ID = "harness/running/executor";
		const boot = policyBootstrapFromRunContext({
			schema_version: "1.0.0",
			run_id: "run-x",
			pi_session_id: "",
			project_root: "/tmp",
			phase: "execute",
			plan_id: "plan-x",
			plan_packet_path: "/tmp/plan-packet.yaml",
			plan_ready: true,
			task_summary: null,
			status: "active",
			last_completed_step: null,
			last_outcome: null,
			next_recommended_command: null,
			owner_pi_session_id: "owner",
			updated_at: "2026-01-01T00:00:00.000Z",
		});
		assert.equal(boot.approvedPlan, true);
		assert.equal(boot.phase, "execute");
		if (prev === undefined) delete process.env.HARNESS_AGENT_ID;
		else process.env.HARNESS_AGENT_ID = prev;
	});
});

describe("syncPlanLastOutcomeFromTaskClarification", () => {
	test("clears stale needs_clarification when task-clarification is ready", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-sync-outcome-"));
		const runId = "run-sync-test";
		const runDir = join(root, ".pi", "harness", "runs", runId, "artifacts");
		await mkdir(runDir, { recursive: true });
		await writeFile(
			join(runDir, "task-clarification.yaml"),
			`schema_version: 1.0.0
status: ready
clarified_task: Add harness-clear command
unresolved_questions: []
`,
			"utf-8",
		);
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "plan",
			plan_id: "plan-x",
			plan_packet_path: join(root, ".pi/harness/runs", runId, "plan-packet.yaml"),
			plan_ready: false,
			task_summary: "harness-clear",
			status: "active",
			last_completed_step: "plan",
			last_outcome: "needs_clarification",
			next_recommended_command: "/harness-run-status",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const synced = await syncPlanLastOutcomeFromTaskClarification(root, ctx);
		assert.equal(synced.last_outcome, null);
		assert.equal(synced.next_recommended_command, "/harness-run-status");
		await rm(root, { recursive: true, force: true });
	});
});

describe("reconcileStaleExecuteCompletion", () => {
	test("resets false completed when executor handoff is missing", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-reconcile-exec-"));
		const runId = "run-stale-exec";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "artifacts"), { recursive: true });
		await writeYamlFile(join(runDir, "plan-packet.yaml"), {
			schema_version: "1.0.0",
			contract_version: "1.1.0",
			plan_id: "plan-harness-clear",
			task_id: "task-harness-clear",
			scope: "Add harness-clear prompt",
			acceptance_checks: ["prompt exists"],
			risk_level: "med",
			rollback_plan: "revert commit",
			execution_plan: { work_items: [{ id: "WI-01", title: "t" }] },
		});
		await writeFile(
			join(runDir, "plan-review.md"),
			"# Harness plan\n\n- **Status:** committed\n",
			"utf-8",
		);
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "evaluate",
			plan_id: "plan-harness-clear",
			plan_packet_path: join(runDir, "plan-packet.yaml"),
			plan_ready: true,
			task_summary: "harness-clear",
			status: "active",
			last_completed_step: "execute",
			last_outcome: "completed",
			next_recommended_command: "/harness-review",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const reconciled = await reconcileStaleExecuteCompletion(root, ctx, []);
		assert.equal(reconciled.phase, "plan");
		assert.equal(reconciled.last_outcome, "ready");
		assert.equal(reconciled.next_recommended_command, "/harness-run");
		await rm(root, { recursive: true, force: true });
	});

	test("promotes stale plan-phase context when executor handoff is completed", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-reconcile-handoff-"));
		const runId = "run-handoff-ahead";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "handoff"), { recursive: true });
		await writeYamlFile(join(runDir, "plan-packet.yaml"), {
			schema_version: "1.0.0",
			contract_version: "1.1.0",
			plan_id: "plan-harness-clear",
			task_id: "task-harness-clear",
			scope: "Add harness-clear prompt",
			acceptance_checks: ["prompt exists"],
			risk_level: "med",
			rollback_plan: "revert commit",
			execution_plan: { work_items: [{ id: "WI-01", title: "t" }] },
		});
		await writeFile(
			join(runDir, "plan-review.md"),
			"# Harness plan\n\n- **Status:** committed\n",
			"utf-8",
		);
		await writeYamlFile(join(runDir, "handoff", "executor-summary.yaml"), {
			schema_version: "1.0.0",
			execution_status: "completed",
			handoff_ready: { ready: true },
		});
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "execute",
			plan_id: "plan-harness-clear",
			plan_packet_path: join(runDir, "plan-packet.yaml"),
			plan_ready: true,
			task_summary: "harness-clear",
			status: "active",
			last_completed_step: "plan",
			last_outcome: "ready",
			next_recommended_command: "/harness-run-status",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const reconciled = await reconcileStaleExecuteCompletion(root, ctx, []);
		assert.equal(reconciled.last_completed_step, "execute");
		assert.equal(reconciled.last_outcome, "completed");
		assert.equal(reconciled.phase, "evaluate");
		assert.equal(reconciled.next_recommended_command, "/harness-review");
		await rm(root, { recursive: true, force: true });
	});
});

describe("refreshRunContextProgress", () => {
	test("recomputes next command from executor handoff while context lags", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-refresh-progress-"));
		const runId = "run-refresh-progress";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "handoff"), { recursive: true });
		await writeYamlFile(join(runDir, "handoff", "executor-summary.yaml"), {
			schema_version: "1.0.0",
			execution_status: "completed",
		});
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "plan",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "plan",
			last_outcome: "ready",
			next_recommended_command: "/harness-run-status",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const refreshed = await refreshRunContextProgress(root, ctx, []);
		assert.equal(refreshed.phase, "evaluate");
		assert.equal(refreshed.last_completed_step, "execute");
		assert.equal(refreshed.next_recommended_command, "/harness-review");
		await rm(root, { recursive: true, force: true });
	});
});

describe("resolveHarnessRunPostAgentState", () => {
	test("does not default to completed without executor status", () => {
		const state = resolveHarnessRunPostAgentState(null, true);
		assert.equal(state.last_completed_step, "plan");
		assert.equal(state.last_outcome, "ready");
		assert.equal(state.phase, "plan");
		assert.equal(state.next_recommended_command, "/harness-run");
	});

	test("moves to evaluate when executor completed", () => {
		const state = resolveHarnessRunPostAgentState("completed", true);
		assert.equal(state.last_completed_step, "execute");
		assert.equal(state.last_outcome, "completed");
		assert.equal(state.phase, "evaluate");
		assert.equal(state.next_recommended_command, "/harness-review");
	});
});

describe("harness-auto pipeline routing", () => {
	test("does not reuse run id after execute started", () => {
		const ctx = {
			schema_version: "1.0.0",
			run_id: "run-auto",
			pi_session_id: "sess",
			project_root: "/tmp",
			phase: "evaluate",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "smoke task",
			status: "active",
			last_completed_step: "review",
			last_outcome: "fail",
			next_recommended_command: null,
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		assert.equal(shouldReuseHarnessRunIdForAuto(ctx), false);
		assert.equal(
			shouldReuseHarnessRunId("", ctx, "harness-auto"),
			false,
		);
	});

	test("disarmHarnessKillSwitch clears kill-switch block for session", () => {
		const sid = "sess-kill-disarm";
		armHarnessKillSwitch(sid);
		assert.equal(isHarnessKillSwitchDisarmed(sid), false);
		disarmHarnessKillSwitch(sid);
		assert.equal(isHarnessKillSwitchDisarmed(sid), true);
	});

	test("resolveArgsForCommand does not inherit stale plan_packet_path", () => {
		const resolved = resolveArgsForCommand(
			"harness-auto",
			'"smoke task" --quick',
			{
				run_id: "run-new",
				plan_packet_path: "/tmp/old-run/plan-packet.yaml",
			},
		);
		assert.equal(resolved.planPath, null);
		const withPlan = resolveArgsForCommand(
			"harness-auto",
			"--plan /tmp/run-new/plan-packet.yaml",
			{ run_id: "run-new" },
		);
		assert.equal(withPlan.planPath, "/tmp/run-new/plan-packet.yaml");
	});

	test("resetRunContextForHarnessAuto clears post-plan progress", () => {
		const reset = resetRunContextForHarnessAuto({
			schema_version: "1.0.0",
			run_id: "run-auto",
			pi_session_id: "sess",
			project_root: "/tmp",
			phase: "evaluate",
			plan_id: "p",
			plan_packet_path: "/tmp/plan.yaml",
			plan_ready: true,
			task_summary: "smoke",
			status: "active",
			last_completed_step: "review",
			last_outcome: "fail",
			next_recommended_command: "/harness-steer",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
			steer_attempt: 2,
		});
		assert.equal(reset.phase, "plan");
		assert.equal(reset.plan_ready, false);
		assert.equal(reset.last_completed_step, null);
		assert.equal(reset.steer_attempt, 0);
	});

	test("blocks harness-auto with missing task", async () => {
		const reason = await blockingHarnessAutoCommandReason(
			"harness-auto",
			null,
			"--quick",
			"/harness-auto --quick",
		);
		assert.match(reason ?? "", /Usage: \/harness-auto/i);
	});

	test("blocks harness-auto when task differs from active run", async () => {
		const reason = await blockingHarnessAutoCommandReason(
			"harness-auto",
			{
				schema_version: "1.0.0",
				run_id: "run-a",
				pi_session_id: "sess",
				project_root: "/tmp",
				phase: "plan",
				plan_id: null,
				plan_packet_path: null,
				plan_ready: false,
				task_summary: "harness-clear",
				status: "active",
				last_completed_step: null,
				last_outcome: null,
				next_recommended_command: null,
				owner_pi_session_id: "sess",
				updated_at: "2026-01-01T00:00:00.000Z",
			},
			'"other task"',
			'/harness-auto "other task"',
		);
		assert.match(reason ?? "", /different task/i);
	});

	test("blockingRunCommandReason bypassed during harness-auto session", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-auto-bypass-"));
		const runId = "run-auto-bypass";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "handoff"), { recursive: true });
		await writeYamlFile(join(runDir, "handoff", "executor-summary.yaml"), {
			execution_status: "completed",
		});
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "evaluate",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "execute",
			last_outcome: "completed",
			next_recommended_command: "/harness-review",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const entries = [
			{
				type: "custom",
				customType: "harness-turn",
				data: {
					command: "harness-auto",
					args: '"t"',
					invoked_at: "2026-01-01T00:00:00.000Z",
				},
			},
		];
		assert.equal(isHarnessAutoSession(entries), true);
		const reason = await blockingRunCommandReason(
			"harness-run",
			ctx,
			root,
			entries,
		);
		assert.equal(reason, null);
		await rm(root, { recursive: true, force: true });
	});
});

describe("review routing from eval-verdict", () => {
	test("replan maps to plan_gap", () => {
		assert.equal(
			remediationClassFromEvalVerdict({
				status: "fail",
				recommended_action: "replan",
			}),
			"plan_gap",
		);
	});

	test("synthesizes review-outcome and routes to plan revise", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-review-sync-"));
		const runId = "run-review-sync";
		const runDir = join(root, ".pi", "harness", "runs", runId, "artifacts");
		await mkdir(runDir, { recursive: true });
		await writeYamlFile(join(runDir, "eval-verdict.yaml"), {
			schema_version: "1.0.0",
			contract_version: "1.0.0",
			run_id: runId,
			status: "fail",
			recommended_action: "replan",
			failed_checks: ["scope_minimization_not_met"],
		});
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "evaluate",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "review",
			last_outcome: "fail",
			next_recommended_command: "/harness-steer",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		await ensureReviewOutcomeFromEval(runId, root);
		const routed = await reconcileReviewRouting(root, ctx);
		assert.equal(routed.next_recommended_command, "/harness-plan (mode: revise)");
		const steerBlock = await blockingSteerCommandReason(
			"harness-steer",
			routed,
			root,
		);
		assert.match(steerBlock ?? "", /implementation_gap/i);
		await rm(root, { recursive: true, force: true });
	});

	test("synthesizes split verdict eval pass + adversary block_merge", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-split-verdict-"));
		const runId = "run-split";
		const runDir = join(root, ".pi", "harness", "runs", runId, "artifacts");
		await mkdir(runDir, { recursive: true });
		await writeYamlFile(join(runDir, "eval-verdict.yaml"), {
			schema_version: "1.0.0",
			run_id: runId,
			status: "pass",
		});
		await writeYamlFile(join(runDir, "adversary-report.yaml"), {
			schema_version: "1.0.0",
			run_id: runId,
			block_merge: true,
			severity: "high",
		});
		await ensureReviewOutcomeFromEval(runId, root);
		const { readReviewOutcomeFromRun } = await import(
			"../.pi/lib/harness-run-context.ts"
		);
		const outcome = await readReviewOutcomeFromRun(runId, root);
		assert.equal(outcome?.remediation_class, "implementation_gap");
		assert.equal(outcome?.eval_status, "pass");
		assert.equal(outcome?.adversary_status, "block_merge");
		await rm(root, { recursive: true, force: true });
	});
});

describe("harness command gates", () => {
	test("blocks harness-run when executor handoff completed", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-gate-run-"));
		const runId = "run-gate-run";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "handoff"), { recursive: true });
		await writeYamlFile(join(runDir, "handoff", "executor-summary.yaml"), {
			schema_version: "1.0.0",
			execution_status: "completed",
		});
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "plan",
			plan_id: "p",
			plan_packet_path: join(runDir, "plan-packet.yaml"),
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "plan",
			last_outcome: "ready",
			next_recommended_command: "/harness-run",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const reason = await blockingRunCommandReason("harness-run", ctx, root);
		assert.match(reason ?? "", /already completed/i);
		await rm(root, { recursive: true, force: true });
	});

	test("blocks harness-review without execute handoff", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-gate-review-"));
		const runId = "run-gate-review";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(runDir, { recursive: true });
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "plan",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "plan",
			last_outcome: "ready",
			next_recommended_command: "/harness-run",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const reason = await blockingReviewCommandReason(
			"harness-review",
			ctx,
			root,
		);
		assert.match(reason ?? "", /Execute not finished/i);
		await rm(root, { recursive: true, force: true });
	});

	test("blocks harness-steer without review-outcome", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-gate-steer-"));
		const runId = "run-gate-steer";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "handoff"), { recursive: true });
		await writeYamlFile(join(runDir, "handoff", "executor-summary.yaml"), {
			execution_status: "completed",
		});
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "evaluate",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "execute",
			last_outcome: "completed",
			next_recommended_command: "/harness-review",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const reason = await blockingSteerCommandReason("harness-steer", ctx, root);
		assert.match(reason ?? "", /harness-review first/i);
		await rm(root, { recursive: true, force: true });
	});
});

describe("syncPlanReadyFromDisk", () => {
	test("sets plan_ready when plan-review.md is committed", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-sync-ready-"));
		const runId = "run-ready-sync";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "artifacts"), { recursive: true });
		await writeYamlFile(join(runDir, "plan-packet.yaml"), {
			schema_version: "1.0.0",
			contract_version: "1.1.0",
			plan_id: "plan-harness-clear",
			task_id: "task-harness-clear",
			scope: "Add harness-clear prompt",
			acceptance_checks: ["prompt exists"],
			risk_level: "med",
			rollback_plan: "revert commit",
			execution_plan: { work_items: [{ id: "WI-01", title: "t" }] },
		});
		await writeFile(
			join(runDir, "plan-review.md"),
			"# Harness plan\n\n- **Status:** committed\n",
			"utf-8",
		);
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "plan",
			plan_id: null,
			plan_packet_path: join(runDir, "plan-packet.yaml"),
			plan_ready: false,
			task_summary: "harness-clear",
			status: "active",
			last_completed_step: "plan",
			last_outcome: null,
			next_recommended_command: "/harness-run-status",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const synced = await syncPlanReadyFromDisk(root, ctx, []);
		assert.equal(synced.plan_ready, true);
		assert.equal(synced.last_outcome, "ready");
		assert.equal(synced.next_recommended_command, "/harness-run");
		await rm(root, { recursive: true, force: true });
	});
});

describe("releaseForeignQaRunOwnership", () => {
	test("aborts stale harness-qa-live pointer owned by another session", async () => {
		const saved = { HARNESS_QA_SMOKE: process.env.HARNESS_QA_SMOKE };
		process.env.HARNESS_QA_SMOKE = "1";
		const root = await mkdtemp(join(tmpdir(), "qa-release-"));
		const runId = "harness-qa-live-stale-123";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(runDir, { recursive: true });
		await writeYamlFile(join(runDir, "context.yaml"), {
			schema_version: "1.0.0",
			run_id: runId,
			project_root: root,
			phase: "execute",
			plan_id: `${runId}-plan`,
			plan_ready: true,
			status: "active",
			owner_pi_session_id: "harness-qa-live-old-run",
			updated_at: "2026-06-06T00:00:00.000Z",
		});
		await mkdir(join(root, ".pi", "harness"), { recursive: true });
		await writeFile(
			join(root, ".pi", "harness", "active-run.json"),
			`${JSON.stringify({
				schema_version: "1.0.0",
				run_id: runId,
				project_root: root,
				owner_pi_session_id: "harness-qa-live-old-run",
				phase: "execute",
				plan_id: `${runId}-plan`,
				plan_ready: true,
				updated_at: "2026-06-06T00:00:00.000Z",
			})}\n`,
		);
		const cwd = process.cwd();
		process.chdir(root);
		try {
			const released = await releaseForeignQaRunOwnership(
				root,
				"harness-qa-live-new",
			);
			assert.equal(released, true);
		} finally {
			process.chdir(cwd);
			for (const [key, value] of Object.entries(saved)) {
				if (value === undefined) delete process.env[key];
				else process.env[key] = value;
			}
			await rm(root, { recursive: true, force: true });
		}
	});
});
