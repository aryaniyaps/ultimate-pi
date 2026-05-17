import { test } from "node:test";
import assert from "node:assert/strict";
import {
	getLatestHarnessTurn,
	inferHarnessPhase,
	inferHarnessPhaseFromTurn,
	parseHarnessSlashInput,
} from "../.pi/lib/harness-run-context.ts";

test("parseHarnessSlashInput parses raw slash commands", () => {
	const p = parseHarnessSlashInput('/harness-plan "Build dashboard" --quick');
	assert.ok(p);
	assert.equal(p.command, "harness-plan");
	assert.match(p.args, /Build dashboard/);
});

test("parseHarnessSlashInput ignores expanded template bodies", () => {
	assert.equal(
		parseHarnessSlashInput("# harness-plan\n\nOrchestrator only"),
		null,
	);
});

test("harness-turn drives phase inference not setup prose", () => {
	const entries = [
		{
			type: "custom",
			customType: "harness-turn",
			data: {
				schema_version: "1.0.0",
				command: "harness-plan",
				args: "task",
				source: "slash",
				invoked_at: "2026-05-17T00:00:00.000Z",
			},
		},
	];
	assert.equal(inferHarnessPhaseFromTurn(entries), "plan");
	assert.equal(
		inferHarnessPhase(
			entries,
			"# harness-setup\n\nNext run harness-plan after bootstrap",
		),
		"plan",
	);
});

test("getLatestHarnessTurn returns most recent turn", () => {
	const entries = [
		{
			type: "custom",
			customType: "harness-turn",
			data: { command: "harness-plan", args: "a" },
		},
		{
			type: "custom",
			customType: "harness-turn",
			data: { command: "harness-run", args: "" },
		},
	];
	const turn = getLatestHarnessTurn(entries);
	assert.equal(turn?.command, "harness-run");
});
