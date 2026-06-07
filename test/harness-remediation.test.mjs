import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	classifyImplementationGap,
	effectiveSteerMaxAttempts,
	parseReproCommandsFromAdversary,
	recommendedNextForRemediation,
	remediationClassFromEvalVerdict,
	steerBurstAllowed,
	steerBurstFromEnv,
	synthesizeReviewOutcome,
} from "../.pi/lib/harness-remediation.ts";

describe("synthesizeReviewOutcome split verdict", () => {
	test("eval pass + adversary block_merge → implementation_gap + burst when env on", () => {
		const prev = process.env.HARNESS_STEER_BURST;
		process.env.HARNESS_STEER_BURST = "1";
		const out = synthesizeReviewOutcome({
			runId: "run-1",
			eval: { status: "pass" },
			adversary: { block_merge: true, repro_steps: ["npx vitest run foo"] },
		});
		assert.equal(out?.remediation_class, "implementation_gap");
		assert.equal(out?.status, "fail");
		assert.equal(out?.eval_status, "pass");
		assert.equal(out?.adversary_status, "block_merge");
		assert.equal(out?.recommended_next, "/harness-steer --burst");
		if (prev === undefined) delete process.env.HARNESS_STEER_BURST;
		else process.env.HARNESS_STEER_BURST = prev;
	});

	test("eval pass + adversary proceed → pass", () => {
		const out = synthesizeReviewOutcome({
			runId: "run-1",
			eval: { status: "pass" },
			adversary: { block_merge: false },
		});
		assert.equal(out?.remediation_class, "pass");
		assert.equal(out?.recommended_next, "/harness-policy-status");
	});

	test("hygiene gap_kind from ls_lint failure", () => {
		const out = synthesizeReviewOutcome({
			runId: "run-1",
			eval: {
				status: "fail",
				recommended_action: "steer",
				failed_checks: ["ls_lint_format"],
			},
			adversary: null,
			benchmark: { ls_lint: "fail" },
		});
		assert.equal(out?.remediation_class, "implementation_gap");
		assert.equal(out?.gap_kind, "hygiene");
		assert.equal(out?.recommended_next, "/harness-steer");
	});
});

describe("steerBurstAllowed", () => {
	test("default env off", () => {
		const prev = process.env.HARNESS_STEER_BURST;
		delete process.env.HARNESS_STEER_BURST;
		assert.equal(steerBurstFromEnv(), false);
		assert.equal(
			steerBurstAllowed({ status: "pass" }, { block_merge: true }),
			false,
		);
		if (prev !== undefined) process.env.HARNESS_STEER_BURST = prev;
	});

	test("blocked when inline repair already attempted", () => {
		const prev = process.env.HARNESS_STEER_BURST;
		process.env.HARNESS_STEER_BURST = "1";
		assert.equal(
			steerBurstAllowed(
				{ status: "pass" },
				{ block_merge: true },
				true,
			),
			false,
		);
		if (prev === undefined) delete process.env.HARNESS_STEER_BURST;
		else process.env.HARNESS_STEER_BURST = prev;
	});
});

describe("effectiveSteerMaxAttempts", () => {
	test("adds one when burst allowed", () => {
		assert.equal(effectiveSteerMaxAttempts(3, true), 4);
		assert.equal(effectiveSteerMaxAttempts(3, false), 3);
	});
});

describe("parseReproCommandsFromAdversary", () => {
	test("extracts shell commands and skips prose", () => {
		const { commands, skipped } = parseReproCommandsFromAdversary({
			repro_steps: [
				"Open the widget and click resume",
				"npx vitest run test/widget.test.mjs",
			],
			repro_commands: [{ cmd: "node scripts/repro.mjs" }],
		});
		assert.equal(commands.includes("node scripts/repro.mjs"), true);
		assert.equal(
			commands.includes("npx vitest run test/widget.test.mjs"),
			true,
		);
		assert.equal(skipped.length, 1);
	});
});

describe("remediationClassFromEvalVerdict", () => {
	test("maps replan to plan_gap", () => {
		assert.equal(
			remediationClassFromEvalVerdict({
				status: "fail",
				recommended_action: "replan",
			}),
			"plan_gap",
		);
	});
});

describe("recommendedNextForRemediation", () => {
	test("burst path", () => {
		assert.equal(
			recommendedNextForRemediation("implementation_gap", { burst: true }),
			"/harness-steer --burst",
		);
	});
});

describe("classifyImplementationGap", () => {
	test("mixed when hygiene and block_merge", () => {
		assert.equal(
			classifyImplementationGap(
				{ failed_checks: ["format_check"] },
				{ block_merge: true },
				null,
			),
			"mixed",
		);
	});
});
