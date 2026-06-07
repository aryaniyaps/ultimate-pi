import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import harnessLiveWidget from "../.pi/extensions/harness-live-widget.ts";
import { writeHarnessProjectEnabled } from "../.pi/lib/harness-project-config.ts";
import {
	formatCrossSessionResumeMessage,
	nextStepAfterOutcome,
} from "../.pi/lib/harness-run-context.ts";
import {
	createStateFromEntries,
	deriveHarnessStatusHint,
	formatHarnessPhaseLabel,
	type HarnessUiState,
	HarnessUiStateStore,
	nextHarnessPhase,
} from "../.pi/lib/harness-ui-state.ts";

function baseState(overrides: Partial<HarnessUiState> = {}): HarnessUiState {
	return {
		phase: "plan",
		flowSubstate: "idle",
		planApproved: false,
		planId: null,
		reviewIsolationOk: true,
		reviewViolationActive: false,
		budgetExhausted: false,
		budgetReason: null,
		testIntegritySeverity: "none",
		testIntegrityReasons: [],
		debateRound: 0,
		debateMaxRounds: null,
		debateBudgetUsed: null,
		debateBudgetCap: null,
		policyDecision: null,
		consensusDelta: null,
		severity: {
			correctness: null,
			security: null,
			architecture: null,
			testIntegrity: null,
		},
		traceRunId: null,
		nextRecommendedCommand: null,
		crossSessionResumeCommand: null,
		...overrides,
	};
}

describe("nextHarnessPhase", () => {
	test("advances through the user-facing plan/run/review pipeline", () => {
		assert.equal(formatHarnessPhaseLabel("plan"), "plan");
		assert.equal(formatHarnessPhaseLabel("execute"), "run");
		assert.equal(formatHarnessPhaseLabel("evaluate"), "review");
		assert.equal(formatHarnessPhaseLabel("adversary"), "review");
		assert.equal(formatHarnessPhaseLabel("merge"), "review");
		assert.equal(nextHarnessPhase("plan"), "execute");
		assert.equal(nextHarnessPhase("execute"), "evaluate");
	});

	test("review-side internal phases have no next widget phase", () => {
		assert.equal(nextHarnessPhase("evaluate"), null);
		assert.equal(nextHarnessPhase("adversary"), null);
		assert.equal(nextHarnessPhase("merge"), null);
	});
});

describe("deriveHarnessStatusHint", () => {
	test("blocker beats next command", () => {
		const hint = deriveHarnessStatusHint(
			baseState({
				budgetExhausted: true,
				nextRecommendedCommand: "/harness-eval",
			}),
		);
		assert.equal(hint.text, "Budget limit reached");
		assert.equal(hint.severity, "error");
	});

	test("next command beats plan-approved default", () => {
		const hint = deriveHarnessStatusHint(
			baseState({
				phase: "plan",
				planApproved: true,
				nextRecommendedCommand: "/harness-run",
			}),
		);
		assert.equal(hint.text, "Next: /harness-run");
		assert.equal(hint.severity, "accent");
	});

	test("run-status auxiliary command displays review as next main phase", () => {
		const hint = deriveHarnessStatusHint(
			baseState({
				phase: "execute",
				nextRecommendedCommand: "/harness-run-status",
			}),
		);
		assert.equal(hint.text, "Next: /harness-review");
		assert.equal(hint.severity, "accent");
	});

	test("implementation repair auxiliary command displays run as main phase", () => {
		const hint = deriveHarnessStatusHint(
			baseState({
				phase: "evaluate",
				nextRecommendedCommand: "/harness-steer",
			}),
		);
		assert.equal(hint.text, "Next: /harness-run");
		assert.equal(hint.severity, "accent");
	});

	test("plan revise recommendation keeps the main plan command", () => {
		const hint = deriveHarnessStatusHint(
			baseState({
				phase: "evaluate",
				nextRecommendedCommand: "/harness-plan or /harness-incident",
			}),
		);
		assert.equal(hint.text, "Next: /harness-plan");
		assert.equal(hint.severity, "accent");
	});

	test("unapproved plan without command", () => {
		const hint = deriveHarnessStatusHint(baseState({ phase: "plan" }));
		assert.equal(hint.text, "Approve plan to continue");
		assert.equal(hint.severity, "warning");
	});
});

describe("nextStepAfterOutcome", () => {
	test("after execute completes in evaluate phase suggests harness-review", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "evaluate",
				lastCompletedStep: "execute",
				lastOutcome: "ready",
				executionStatus: "completed",
			}),
			"/harness-review",
		);
	});

	test("execute phase with completed status suggests harness-review", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "execute",
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

	test("blocked execute suggests harness-review before replan", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "execute",
				executionStatus: "blocked",
			}),
			"/harness-review",
		);
	});
});

describe("createStateFromEntries run-context merge", () => {
	test("harness-use-run disk context overrides stale policy", () => {
		const state = createStateFromEntries([
			{
				type: "custom",
				customType: "harness-policy-state",
				data: { phase: "plan", approvedPlan: false, planId: null },
			},
			{
				type: "custom",
				customType: "harness-run-context",
				data: {
					phase: "plan",
					plan_ready: true,
					plan_id: "plan-recovery",
					run_id: "run-recovery",
					last_completed_step: "plan",
					last_outcome: "ready",
					next_recommended_command: null,
					status: "active",
				},
			},
		]);
		assert.equal(state.phase, "plan");
		assert.equal(state.planApproved, true);
		assert.equal(state.planId, "plan-recovery");
		assert.equal(state.traceRunId, "run-recovery");
		const hint = deriveHarnessStatusHint(state);
		assert.equal(hint.text, "Next: /harness-run");
	});

	test("recomputes next as harness-review after execute when no persisted command", () => {
		const state = createStateFromEntries([
			{
				type: "custom",
				customType: "harness-policy-state",
				data: { phase: "evaluate", approvedPlan: true, planId: "plan-x" },
			},
			{
				type: "custom",
				customType: "harness-run-context",
				data: {
					phase: "evaluate",
					plan_ready: true,
					plan_id: "plan-x",
					run_id: "run-x",
					last_completed_step: "execute",
					last_outcome: "completed",
					next_recommended_command: null,
					status: "active",
				},
			},
		]);
		assert.equal(state.nextRecommendedCommand, "/harness-review");
		const hint = deriveHarnessStatusHint(state);
		assert.equal(hint.text, "Next: /harness-review");
	});

	test("prefers persisted next_recommended_command from run context", () => {
		const state = createStateFromEntries([
			{
				type: "custom",
				customType: "harness-policy-state",
				data: { phase: "evaluate", approvedPlan: true, planId: "plan-x" },
			},
			{
				type: "custom",
				customType: "harness-run-context",
				data: {
					phase: "evaluate",
					plan_ready: true,
					plan_id: "plan-x",
					run_id: "run-x",
					last_completed_step: "review",
					last_outcome: "fail",
					next_recommended_command: "/harness-plan or /harness-incident",
					status: "active",
				},
			},
		]);
		assert.equal(
			state.nextRecommendedCommand,
			"/harness-plan or /harness-incident",
		);
	});

	test("no active run recommends fresh harness-plan command", () => {
		const state = createStateFromEntries([]);
		assert.equal(state.phase, "plan");
		assert.equal(state.nextRecommendedCommand, "/harness-plan");
		assert.equal(deriveHarnessStatusHint(state).text, "Next: /harness-plan");
	});

	test("confirmed clear after run context invalidates stale active state", () => {
		const state = createStateFromEntries([
			{
				type: "custom",
				customType: "harness-run-context",
				data: {
					phase: "evaluate",
					plan_ready: true,
					plan_id: "plan-stale",
					run_id: "run-stale",
					last_completed_step: "execute",
					last_outcome: "completed",
					next_recommended_command: "/harness-review",
					status: "active",
				},
			},
			{
				type: "custom",
				customType: "harness-clear-result",
				data: { approved: true, active_cleared: true, cleared_all: true },
			},
		]);
		assert.equal(state.traceRunId, null);
		assert.equal(state.nextRecommendedCommand, "/harness-plan");
		assert.equal(deriveHarnessStatusHint(state).text, "Next: /harness-plan");
	});

	test("confirmed clear tombstones active_run_ids even if stale run context is appended later", () => {
		const state = createStateFromEntries([
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
			{
				type: "custom",
				customType: "harness-run-context",
				data: {
					phase: "execute",
					plan_ready: true,
					plan_id: "plan-stale",
					run_id: "run-stale",
					last_completed_step: "execute",
					last_outcome: "completed",
					next_recommended_command: "/harness-review",
					status: "active",
				},
			},
		]);
		assert.equal(state.traceRunId, null);
		assert.equal(state.nextRecommendedCommand, "/harness-plan");
		assert.equal(deriveHarnessStatusHint(state).text, "Next: /harness-plan");
	});
});

describe("cross-session resume UX", () => {
	test("formatCrossSessionResumeMessage includes harness-use-run", () => {
		const text = formatCrossSessionResumeMessage({
			runId: "run-abc",
			resumeCommand: "/harness-use-run run-abc --claim",
			phase: "evaluate",
			planReady: true,
			nextAfterResume: "/harness-review",
			taskSummary: "Update graphify KB",
		});
		assert.match(text, /run-abc/);
		assert.match(text, /\/harness-use-run run-abc --claim/);
		assert.match(text, /\/harness-review/);
	});

	test("cross-session resume hint beats next command", () => {
		const hint = deriveHarnessStatusHint(
			baseState({
				nextRecommendedCommand: "/harness-run-status",
				crossSessionResumeCommand: "/harness-use-run run-abc",
			}),
		);
		assert.equal(hint.text, "Resume: /harness-use-run run-abc");
		assert.equal(hint.severity, "warning");
	});
});

type Handler = (...args: unknown[]) => unknown;

function createPi() {
	const lifecycle = new Map<string, Handler[]>();
	const eventHandlers = new Map<string, Handler[]>();
	return {
		on(name: string, handler: Handler) {
			const handlers = lifecycle.get(name) ?? [];
			handlers.push(handler);
			lifecycle.set(name, handlers);
		},
		async fire(name: string, ...args: unknown[]) {
			for (const handler of lifecycle.get(name) ?? []) await handler(...args);
		},
		events: {
			on(name: string, handler: Handler) {
				const handlers = eventHandlers.get(name) ?? [];
				handlers.push(handler);
				eventHandlers.set(name, handlers);
			},
			emit(name: string, payload: unknown) {
				for (const handler of eventHandlers.get(name) ?? []) handler(payload);
			},
		},
	};
}

function createWidgetCtx(entries: unknown[] = []) {
	const widgets: Array<{ key: string; content: unknown }> = [];
	const statuses: Array<{ key: string; text: string | undefined }> = [];
	return {
		hasUI: true,
		ui: {
			setWidget(key: string, content: unknown) {
				widgets.push({ key, content });
			},
			setStatus(key: string, text: string | undefined) {
				statuses.push({ key, text });
			},
		},
		sessionManager: { getEntries: () => entries },
		widgets,
		statuses,
	};
}

async function flushMicrotasks(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

describe("cross-session resume invalidation", () => {
	test("mounted live widget ignores delayed cross-session-resume after confirmed clear", async () => {
		const previous = process.cwd();
		const root = mkdtempSync(join(tmpdir(), "up-live-widget-delayed-resume-"));
		try {
			process.chdir(root);
			writeHarnessProjectEnabled(root, true);
			const entries: unknown[] = [
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
			];
			const pi = createPi();
			const ctx = createWidgetCtx(entries);
			harnessLiveWidget(pi as never);
			await pi.fire("session_start", {}, ctx);
			const factory = ctx.widgets.at(-1)?.content as (
				tui: { requestRender(): void },
				theme: {
					fg(color: string, text: string): string;
					bold(text: string): string;
				},
			) => { render(width: number): string[] };
			const widget = factory(
				{ requestRender() {} },
				{
					fg: (_color: string, text: string) => text,
					bold: (text: string) => text,
				},
			);

			pi.events.emit("harness-cross-session-resume", {
				resume_command: "/harness-use-run run-stale --claim",
			});
			await flushMicrotasks();
			const rendered = widget.render(120).join("\n");
			assert.doesNotMatch(rendered, /harness-use-run/);
			assert.match(rendered, /Next: \/harness-plan/);
		} finally {
			process.chdir(previous);
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("HarnessUiStateStore clears resume overlay after confirmed clear entry", () => {
		const entries: unknown[] = [];
		const store = new HarnessUiStateStore();
		const ctx = createWidgetCtx(entries);
		store.setCrossSessionResumeCommand("/harness-use-run run-abc --claim");
		assert.equal(
			deriveHarnessStatusHint(store.refresh(ctx as never)).text,
			"Resume: /harness-use-run run-abc --claim",
		);
		entries.push({
			type: "custom",
			customType: "harness-clear-result",
			data: { approved: true, active_cleared: true, cleared_all: true },
		});
		const state = store.refresh(ctx as never);
		assert.equal(state.crossSessionResumeCommand, null);
		assert.equal(state.nextRecommendedCommand, "/harness-plan");
		assert.equal(deriveHarnessStatusHint(state).text, "Next: /harness-plan");
	});

	test("HarnessUiStateStore rejects delayed stale resume overlay after confirmed clear", () => {
		const entries: unknown[] = [
			{
				type: "custom",
				customType: "harness-clear-result",
				data: {
					approved: true,
					active_cleared: true,
					active_run_ids: ["run-stale"],
				},
			},
		];
		const store = new HarnessUiStateStore();
		const ctx = createWidgetCtx(entries);
		assert.equal(
			deriveHarnessStatusHint(store.refresh(ctx as never)).text,
			"Next: /harness-plan",
		);

		store.setCrossSessionResumeCommand("/harness-use-run run-stale --claim");
		const state = store.refresh(ctx as never);

		assert.equal(state.crossSessionResumeCommand, null);
		assert.equal(state.nextRecommendedCommand, "/harness-plan");
		assert.equal(deriveHarnessStatusHint(state).text, "Next: /harness-plan");
	});

	test("HarnessUiStateStore clear event suppresses lagging run-context with project_root", () => {
		const entries: unknown[] = [
			{
				type: "custom",
				customType: "harness-run-context",
				data: {
					phase: "execute",
					plan_ready: true,
					plan_id: "plan-stale",
					run_id: "run-stale",
					project_root: "/tmp/ultimate-pi",
					last_completed_step: "execute",
					last_outcome: "completed",
					next_recommended_command: "/harness-review",
					status: "active",
				},
			},
		];
		const store = new HarnessUiStateStore();
		const ctx = createWidgetCtx(entries);
		store.refresh(ctx as never);
		store.setCrossSessionResumeCommand("/harness-use-run run-stale --claim");
		store.clearActiveRunState(entries.length);
		const state = store.refresh(ctx as never);
		assert.equal(state.traceRunId, null);
		assert.equal(state.crossSessionResumeCommand, null);
		assert.equal(state.nextRecommendedCommand, "/harness-plan");
		assert.equal(deriveHarnessStatusHint(state).text, "Next: /harness-plan");
	});

	test("HarnessUiStateStore clear event suppresses stale active entries until run update", () => {
		const entries: unknown[] = [
			{
				type: "custom",
				customType: "harness-run-context",
				data: {
					phase: "execute",
					plan_ready: true,
					plan_id: "plan-stale",
					run_id: "run-stale",
					last_completed_step: "execute",
					last_outcome: "completed",
					next_recommended_command: "/harness-review",
					status: "active",
				},
			},
		];
		const store = new HarnessUiStateStore();
		const ctx = createWidgetCtx(entries);
		assert.equal(
			deriveHarnessStatusHint(store.refresh(ctx as never)).text,
			"Next: /harness-review",
		);

		store.setCrossSessionResumeCommand("/harness-use-run run-stale --claim");
		store.clearActiveRunState(entries.length);
		const state = store.refresh(ctx as never);

		assert.equal(state.traceRunId, null);
		assert.equal(state.crossSessionResumeCommand, null);
		assert.equal(state.nextRecommendedCommand, "/harness-plan");
		assert.equal(deriveHarnessStatusHint(state).text, "Next: /harness-plan");
	});

	test("current run update after confirmed clear supersedes clear overlay", () => {
		const entries: unknown[] = [
			{
				type: "custom",
				customType: "harness-run-context",
				data: {
					phase: "evaluate",
					plan_ready: true,
					plan_id: "plan-stale",
					run_id: "run-stale",
					last_completed_step: "execute",
					last_outcome: "completed",
					next_recommended_command: "/harness-review",
					status: "active",
				},
			},
		];
		const store = new HarnessUiStateStore();
		const ctx = createWidgetCtx(entries);
		store.refresh(ctx as never);
		store.clearActiveRunState(entries.length);
		assert.equal(
			deriveHarnessStatusHint(store.refresh(ctx as never)).text,
			"Next: /harness-plan",
		);

		entries.push(
			{
				type: "custom",
				customType: "harness-clear-result",
				data: { approved: true, active_cleared: true, cleared_all: true },
			},
			{
				type: "custom",
				customType: "harness-run-context",
				data: {
					phase: "plan",
					plan_ready: true,
					plan_id: "plan-current",
					run_id: "run-current",
					last_completed_step: "plan",
					last_outcome: "ready",
					next_recommended_command: null,
					status: "active",
				},
			},
		);

		const state = store.refresh(ctx as never);
		assert.equal(state.traceRunId, "run-current");
		assert.equal(state.crossSessionResumeCommand, null);
		assert.equal(state.nextRecommendedCommand, "/harness-run");
		assert.equal(deriveHarnessStatusHint(state).text, "Next: /harness-run");
	});

	test("mounted live widget clears resume overlay on harness-runs-cleared event", async () => {
		const previous = process.cwd();
		const root = mkdtempSync(join(tmpdir(), "up-live-widget-clear-"));
		try {
			process.chdir(root);
			writeHarnessProjectEnabled(root, true);
			const pi = createPi();
			const ctx = createWidgetCtx([
				{
					type: "custom",
					customType: "harness-run-context",
					data: {
						phase: "execute",
						plan_ready: true,
						plan_id: "plan-stale",
						run_id: "run-stale",
						last_completed_step: "execute",
						last_outcome: "completed",
						next_recommended_command: "/harness-review",
						status: "active",
					},
				},
			]);
			harnessLiveWidget(pi as never);
			await pi.fire("session_start", {}, ctx);
			const factory = ctx.widgets.at(-1)?.content as (
				tui: { requestRender(): void },
				theme: {
					fg(color: string, text: string): string;
					bold(text: string): string;
				},
			) => { render(width: number): string[] };
			const widget = factory(
				{ requestRender() {} },
				{
					fg: (_color: string, text: string) => text,
					bold: (text: string) => text,
				},
			);

			pi.events.emit("harness-cross-session-resume", {
				resume_command: "/harness-use-run run-abc --claim",
			});
			await flushMicrotasks();
			assert.match(
				widget.render(120).join("\n"),
				/Resume: \/harness-use-run run-abc/,
			);

			pi.events.emit("harness-runs-cleared", { deleted: 1, projectRoot: root });
			await flushMicrotasks();
			const afterClear = widget.render(120).join("\n");
			assert.doesNotMatch(afterClear, /harness-use-run/);
			assert.doesNotMatch(afterClear, /\/harness-review/);
			assert.match(afterClear, /Next: \/harness-plan/);
		} finally {
			process.chdir(previous);
			rmSync(root, { recursive: true, force: true });
		}
	});
});
