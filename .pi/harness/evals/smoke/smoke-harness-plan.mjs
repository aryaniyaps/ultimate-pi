#!/usr/bin/env node
/**
 * smoke-harness-plan — fixture validation for plan-phase pipeline (CI).
 * Usage: node .pi/harness/evals/smoke/smoke-harness-plan.mjs --fixture [minimal-med|minimal-low-light]
 */

import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { validateExecutionPlan } from "../../../scripts/validate-plan-dag.mjs";

function planOutcomeComplete(coverage, requiredFocus, minRounds) {
	return (
		coverage.missing.length === 0 &&
		coverage.last_review_gate_ready === true &&
		coverage.last_round_index >= minRounds
	);
}

async function scanFocusCoverage(fixtureRoot, requiredFocus) {
	const art = join(fixtureRoot, "artifacts");
	const covered = new Set();
	let last_review_gate_ready = false;
	let last_round_index = 0;
	const { readdir } = await import("node:fs/promises");
	const files = (await readdir(art)).filter((f) =>
		/^review-round-r\d+\.yaml$/i.test(f),
	);
	for (const name of files.sort()) {
		const m = /^review-round-r(\d+)\.yaml$/i.exec(name);
		if (!m) continue;
		const roundIndex = Number(m[1]);
		if (roundIndex > last_round_index) last_round_index = roundIndex;
		const draft = parseYaml(await readFile(join(art, name), "utf-8"));
		const focus = String(draft.debate_round_focus ?? "").trim();
		if (requiredFocus.includes(focus)) covered.add(focus);
		if (roundIndex === last_round_index) {
			last_review_gate_ready = draft.review_gate_ready === true;
		}
	}
	const missing = requiredFocus.filter((f) => !covered.has(f));
	return {
		covered: requiredFocus.filter((f) => covered.has(f)),
		missing,
		last_review_gate_ready,
		last_round_index,
	};
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "plan-phase");

function fail(msg) {
	console.error(`smoke-harness-plan: FAIL: ${msg}`);
	process.exit(1);
}

function ok(msg) {
	console.log(`  ✓ ${msg}`);
}

function fixtureNameFromArgs(args) {
	const idx = args.indexOf("--fixture");
	if (idx === -1 || !args[idx + 1] || args[idx + 1].startsWith("-")) {
		return "minimal-med";
	}
	return args[idx + 1];
}

async function runFixture(name) {
	const fixtureRoot = join(FIXTURE_DIR, name);
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

	const implPath = join(fixtureRoot, "artifacts", "implementation-research.yaml");
	await access(implPath, constants.R_OK);
	ok("implementation-research.yaml present");

	const researchPath = join(fixtureRoot, "research-brief.yaml");
	const research = parseYaml(await readFile(researchPath, "utf-8"));
	if (!research.decomposition || !research.hypothesis) {
		fail("research-brief.yaml missing decomposition/hypothesis");
	}
	if (!research.implementation) {
		fail("research-brief.yaml missing implementation section");
	}
	ok("research-brief.yaml structure");

	const isLight = name === "minimal-low-light";
	const requiredFocus = isLight ? ["spec", "quality"] : ["spec", "wbs", "schedule", "quality"];
	const debateRounds = isLight
		? ["review-round-r1.yaml", "review-round-r2.yaml"]
		: [
				"review-round-r1.yaml",
				"review-round-r2.yaml",
				"review-round-r3.yaml",
				"review-round-r4.yaml",
			];
	const seenFocus = new Set();
	for (const fileName of debateRounds) {
		const p = join(fixtureRoot, "artifacts", fileName);
		await access(p, constants.R_OK);
		const draft = parseYaml(await readFile(p, "utf-8"));
		if (!draft.schema_version) fail(`${fileName} missing schema_version`);
		if (draft.debate_round_focus) seenFocus.add(draft.debate_round_focus);
	}
	for (const focus of requiredFocus) {
		if (!seenFocus.has(focus)) {
			fail(`fixture missing debate_round_focus: ${focus}`);
		}
	}
	ok(`debate round YAML artifacts (${requiredFocus.length} focuses)`);

	const coverage = await scanFocusCoverage(fixtureRoot, requiredFocus);
	const minRounds = isLight ? 2 : 4;
	if (!planOutcomeComplete(coverage, requiredFocus, minRounds)) {
		fail("debate outcome incomplete for fixture coverage");
	}
	ok("debate outcome complete for fixture profile");

	if (isLight && packet.risk_level !== "low") {
		fail("minimal-low-light fixture must use risk_level low");
	}

	console.log(`smoke-harness-plan: all ${name} fixture checks passed`);
}

async function main() {
	const args = process.argv.slice(2);
	if (args.includes("--fixture")) {
		const name = fixtureNameFromArgs(args);
		await runFixture(name);
		return;
	}
	if (args.includes("--live")) {
		console.log(
			"smoke-harness-plan: --live requires manual /harness-plan run; skipping in CI",
		);
		return;
	}
	fail("Usage: smoke-harness-plan.mjs --fixture [minimal-med|minimal-low-light] | --live");
}

main().catch((err) => {
	fail(err instanceof Error ? err.message : String(err));
});
