#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROUTER_PATH = ".pi/model-router.json";

function fail(message) {
	process.stderr.write(`Error: ${message}\n`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = {};
	for (let i = 0; i < argv.length; i++) {
		const token = argv[i];
		if (!token.startsWith("--")) continue;
		const key = token.slice(2);
		const value = argv[i + 1];
		if (!value || value.startsWith("--")) {
			args[key] = true;
			continue;
		}
		args[key] = value;
		i++;
	}
	return args;
}

function readJson(filePath, label) {
	if (!fs.existsSync(filePath)) {
		fail(`${label} not found: ${filePath}`);
	}
	try {
		return JSON.parse(fs.readFileSync(filePath, "utf8"));
	} catch (error) {
		fail(`${label} is not valid JSON (${filePath}): ${error.message}`);
	}
}

function sha256FromJson(value) {
	const canonical = `${JSON.stringify(value, null, 2)}\n`;
	return crypto.createHash("sha256").update(canonical).digest("hex");
}

function ensureEvidence(evidence) {
	const required = [
		"sample_count",
		"min_sample_count",
		"success_rate_delta",
		"cost_per_task_delta",
		"regression_guard_passed",
		"trace_refs",
	];
	for (const field of required) {
		if (!(field in evidence)) fail(`evidence missing required field: ${field}`);
	}
	if (!Number.isInteger(evidence.sample_count) || evidence.sample_count < 1) {
		fail("evidence.sample_count must be an integer >= 1");
	}
	if (
		!Number.isInteger(evidence.min_sample_count) ||
		evidence.min_sample_count < 1
	) {
		fail("evidence.min_sample_count must be an integer >= 1");
	}
	if (evidence.sample_count < evidence.min_sample_count) {
		fail(
			`insufficient sample_count (${evidence.sample_count} < ${evidence.min_sample_count})`,
		);
	}
	if (typeof evidence.success_rate_delta !== "number") {
		fail("evidence.success_rate_delta must be numeric");
	}
	if (typeof evidence.cost_per_task_delta !== "number") {
		fail("evidence.cost_per_task_delta must be numeric");
	}
	if (evidence.regression_guard_passed !== true) {
		fail("evidence.regression_guard_passed must be true");
	}
	if (!Array.isArray(evidence.trace_refs) || evidence.trace_refs.length === 0) {
		fail("evidence.trace_refs must be a non-empty array");
	}
}

const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) {
	process.stdout.write(
		[
			"Usage:",
			"  node .pi/harness/router/propose-router-tuning.mjs \\",
			"    --evidence <evidence.json> \\",
			"    --candidate <candidate-router.json> \\",
			"    --proposal-out <proposal.json>",
			"",
			"Behavior:",
			"  - validates evidence thresholds",
			"  - captures base/candidate router hashes",
			"  - emits proposal artifact without changing .pi/model-router.json",
		].join("\n"),
	);
	process.exit(0);
}

if (!args.evidence) fail("missing --evidence");
if (!args.candidate) fail("missing --candidate");
if (!args["proposal-out"]) fail("missing --proposal-out");

const baseRouter = readJson(ROUTER_PATH, "base router");
const candidateRouter = readJson(args.candidate, "candidate router");
const evidence = readJson(args.evidence, "evidence");

ensureEvidence(evidence);

const now = new Date().toISOString();
const proposalId = `router-tune-${now.replace(/[:.]/g, "-")}`;

const proposal = {
	schema_version: "1.0.0",
	proposal_id: proposalId,
	created_at: now,
	router_path: ROUTER_PATH,
	base_router_sha256: sha256FromJson(baseRouter),
	candidate_router_sha256: sha256FromJson(candidateRouter),
	evidence,
	status: "proposed",
	approval: {
		required: true,
		approved_by: null,
		approved_at: null,
		justification: null,
	},
	candidate_router: candidateRouter,
};

const outputPath = path.resolve(args["proposal-out"]);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(proposal, null, 2)}\n`);

process.stdout.write(
	[
		"Router tuning proposal created.",
		`proposal_id: ${proposal.proposal_id}`,
		`output: ${outputPath}`,
		"status: proposed (no router write performed)",
	].join("\n") + "\n",
);
