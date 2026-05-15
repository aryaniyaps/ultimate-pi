#!/usr/bin/env node
/**
 * harness:verify — deterministic harness contract checks (no LLM).
 */

import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPECS = join(ROOT, ".pi", "harness", "specs");
const SMOKE = join(ROOT, ".pi", "harness", "evals", "smoke");
const ADRS = join(ROOT, ".pi", "harness", "docs", "adrs");

const REQUIRED_SCHEMAS = [
	"harness-run-record.schema.json",
	"harness-posthog-event.schema.json",
	"observation.schema.json",
	"run-trace.schema.json",
	"eval-verdict.schema.json",
];

const REQUIRED_ADRS = [
	"0001-harness-constitution.md",
	"0002-harness-run-record.md",
	"0003-eval-promotion-gates.md",
	"0004-defer-ci-agent-smoke.md",
	"0005-defer-posthog-analyst.md",
	"0006-sentrux-dual-layer.md",
	"0007-interactive-drift-monitor.md",
	"0008-harness-posthog-telemetry.md",
];

const REQUIRED_EXTENSIONS = [
	"harness-telemetry.ts",
	"trace-recorder.ts",
	"observation-bus.ts",
	"drift-monitor.ts",
];

function fail(msg) {
	console.error(`harness:verify FAIL: ${msg}`);
	process.exit(1);
}

function ok(msg) {
	console.log(`  ✓ ${msg}`);
}

async function fileExists(path) {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

function validateRunRecordFixture(data) {
	const required = [
		"schema_version",
		"run_id",
		"plan_id",
		"started_at",
		"ended_at",
		"duration_ms",
		"cost",
	];
	for (const key of required) {
		if (!(key in data)) fail(`run-record fixture missing ${key}`);
	}
	if (data.schema_version !== "1.0.0") {
		fail("run-record fixture schema_version must be 1.0.0");
	}
}

function validateTestDiffGolden(data) {
	if (!Array.isArray(data.cases)) fail("test-diff-golden missing cases array");
	for (const c of data.cases) {
		if (!c.id || !c.file_path) fail(`test-diff case missing id or file_path`);
	}
}

async function checkSentruxGate() {
	if (process.env.HARNESS_SENTRUX_REQUIRED !== "true") {
		ok("Sentrux gate skipped (HARNESS_SENTRUX_REQUIRED not set)");
		return;
	}
	const stubPath = join(ROOT, ".pi", "harness", "evals", "smoke", "sentrux-stub.json");
	if (!(await fileExists(stubPath))) {
		fail(
			"HARNESS_SENTRUX_REQUIRED=true but .pi/harness/evals/smoke/sentrux-stub.json missing",
		);
	}
	ok("Sentrux stub present");
}

async function main() {
	console.log("harness:verify\n");

	for (const name of REQUIRED_SCHEMAS) {
		const path = join(SPECS, name);
		if (!(await fileExists(path))) fail(`missing schema ${name}`);
		JSON.parse(await readFile(path, "utf-8"));
		ok(`schema ${name}`);
	}

	for (const name of REQUIRED_ADRS) {
		const path = join(ADRS, name);
		if (!(await fileExists(path))) fail(`missing ADR ${name}`);
		ok(`ADR ${name}`);
	}

	for (const name of REQUIRED_EXTENSIONS) {
		const path = join(ROOT, ".pi", "extensions", name);
		if (!(await fileExists(path))) fail(`missing extension ${name}`);
		ok(`extension ${name}`);
	}

	const libPath = join(ROOT, ".pi", "extensions", "lib", "harness-posthog.ts");
	if (!(await fileExists(libPath))) fail("missing lib/harness-posthog.ts");
	ok("lib/harness-posthog.ts");

	const fixture = JSON.parse(
		await readFile(join(SMOKE, "run-record.fixture.json"), "utf-8"),
	);
	validateRunRecordFixture(fixture);
	ok("run-record.fixture.json");

	const golden = JSON.parse(
		await readFile(join(SMOKE, "test-diff-golden.json"), "utf-8"),
	);
	validateTestDiffGolden(golden);
	ok("test-diff-golden.json");

	await checkSentruxGate();

	console.log("\nharness:verify PASS");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
