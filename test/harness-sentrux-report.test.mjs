import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import {
	parseCheckOutput,
	parseGateOutput,
	inferBottleneck,
} from "../.pi/lib/harness-sentrux-parse.mjs";
import { synthesizeDiagnostics } from "../.pi/scripts/harness-sentrux-diagnostics.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIX = join(ROOT, "test", "fixtures", "sentrux");

test("parseCheckOutput: golden check sample", async () => {
	const text = await readFile(join(FIX, "check-sample.txt"), "utf-8");
	const check = parseCheckOutput(text);
	assert.equal(check.parse_ok, true);
	assert.equal(check.rules_checked, 11);
	assert.equal(check.quality_signal, 6718);
	assert.equal(check.check_pass, false);
	assert.equal(check.violations.length, 2, "layer_direction+boundary deduped");
	const rules = check.violations.map((v) => v.rule).sort();
	assert.deepEqual(rules, ["layer_direction", "max_cc"]);
	const layer = check.violations.find((v) => v.rule === "layer_direction");
	assert.ok(layer?.related_rules?.includes("boundary"));
	assert.equal(layer?.files.length, 2);
	const maxCc = check.violations.find((v) => v.rule === "max_cc");
	assert.equal(maxCc?.files.length, 3);
});

test("parseGateOutput: degraded gate", async () => {
	const text = await readFile(join(FIX, "gate-degraded.txt"), "utf-8");
	const gate = parseGateOutput(text);
	assert.equal(gate.status, "degraded");
	assert.equal(gate.quality_before, 6566);
	assert.equal(gate.quality_after, 6718);
	assert.equal(gate.degraded_reasons.length, 2);
	assert.ok(gate.degraded_reasons[0].includes("Coupling"));
});

test("parseGateOutput: pass gate", async () => {
	const text = await readFile(join(FIX, "gate-pass.txt"), "utf-8");
	const gate = parseGateOutput(text);
	assert.equal(gate.status, "pass");
	assert.equal(gate.degraded_reasons.length, 0);
});

test("inferBottleneck: modularity from boundary violations", () => {
	const violations = [
		{ rule: "boundary", files: ["a.ts"], message: "x" },
	];
	const { bottleneck } = inferBottleneck(violations, { degraded_reasons: [] });
	assert.equal(bottleneck, "modularity");
});

test("synthesizeDiagnostics: builds Pro-shaped buckets", async () => {
	const checkText = await readFile(join(FIX, "check-sample.txt"), "utf-8");
	const gateText = await readFile(join(FIX, "gate-degraded.txt"), "utf-8");
	const report = {
		project_root: ROOT,
		check: parseCheckOutput(checkText),
		gate: parseGateOutput(gateText),
	};
	const diag = synthesizeDiagnostics(report);
	assert.equal(diag.schema_version, "1.0.0");
	assert.equal(diag.quality_signal, 6718);
	assert.equal(diag.gate_status, "degraded");
	assert.equal(diag.bottleneck, "modularity");
	assert.ok(diag.root_causes.length >= 1);
	assert.equal(diag.diagnostics.complex_functions.length, 3);
	assert.ok(diag.diagnostics.hotspots.length > 0);
	assert.equal(diag.diagnostics.violations_summary.length, 2);
});
