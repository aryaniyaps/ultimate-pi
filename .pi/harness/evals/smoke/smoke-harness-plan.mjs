#!/usr/bin/env node
/**
 * smoke-harness-plan — fixture validation for plan-phase pipeline (CI).
 * Usage: node .pi/harness/evals/smoke/smoke-harness-plan.mjs --fixture
 */

import { access, cp, mkdir, readFile, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { validateExecutionPlan } from "../../../scripts/validate-plan-dag.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "plan-phase");

function fail(msg) {
	console.error(`smoke-harness-plan: FAIL: ${msg}`);
	process.exit(1);
}

function ok(msg) {
	console.log(`  ✓ ${msg}`);
}

async function runFixture() {
	const fixtureRoot = join(FIXTURE_DIR, "minimal-med");
	try {
		await access(fixtureRoot, constants.R_OK);
	} catch {
		fail(`missing fixture ${fixtureRoot}`);
	}

	const packetPath = join(fixtureRoot, "plan-packet.yaml");
	const raw = await readFile(packetPath, "utf-8");
	const packet = parseYaml(raw);
	if (packet.contract_version !== "1.1.0") {
		fail("fixture contract_version must be 1.1.0");
	}
	if (!packet.execution_plan) fail("fixture missing execution_plan");

	const { status, errors } = validateExecutionPlan(packet, fixtureRoot);
	if (status !== "pass") {
		fail(`DAG validation failed: ${errors.join("; ")}`);
	}
	ok("fixture plan-packet.yaml DAG pass");

	const reviewPath = join(fixtureRoot, "plan-review.md");
	await access(reviewPath, constants.R_OK);
	ok("plan-review.md present");

	const debateRounds = ["review-round-r1.yaml", "review-round-r4.yaml"];
	for (const name of debateRounds) {
		const p = join(fixtureRoot, "artifacts", name);
		await access(p, constants.R_OK);
		const draft = parseYaml(await readFile(p, "utf-8"));
		if (!draft.schema_version) fail(`${name} missing schema_version`);
	}
	ok("debate round YAML artifacts present");

	const researchPath = join(fixtureRoot, "research-brief.yaml");
	const research = parseYaml(await readFile(researchPath, "utf-8"));
	if (!research.decomposition || !research.hypothesis) {
		fail("research-brief.yaml missing decomposition/hypothesis");
	}
	ok("research-brief.yaml structure");

	console.log("smoke-harness-plan: all fixture checks passed");
}

async function main() {
	const args = process.argv.slice(2);
	if (args.includes("--fixture")) {
		await runFixture();
		return;
	}
	if (args.includes("--live")) {
		console.log(
			"smoke-harness-plan: --live requires manual /harness-plan run; skipping in CI",
		);
		return;
	}
	fail("Usage: smoke-harness-plan.mjs --fixture | --live");
}

main().catch((err) => {
	fail(err instanceof Error ? err.message : String(err));
});
