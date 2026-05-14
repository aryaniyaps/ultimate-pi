#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROUTER_PATH = ".pi/model-router.json";
const BACKUP_DIR = ".pi/harness/router/backups";

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
	if (!fs.existsSync(filePath)) fail(`${label} not found: ${filePath}`);
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

function validateProposal(proposal) {
	if (proposal.status !== "proposed") {
		fail(`proposal status must be 'proposed', got '${proposal.status}'`);
	}
	if (proposal.router_path !== ROUTER_PATH) {
		fail(`proposal router_path must be '${ROUTER_PATH}'`);
	}
	const evidence = proposal.evidence ?? {};
	if (
		!Number.isInteger(evidence.sample_count) ||
		!Number.isInteger(evidence.min_sample_count)
	) {
		fail("proposal evidence sample counts are invalid");
	}
	if (evidence.sample_count < evidence.min_sample_count) {
		fail("proposal evidence does not meet minimum sample threshold");
	}
	if (evidence.regression_guard_passed !== true) {
		fail("proposal regression guard is not passing");
	}
	if (!proposal.candidate_router || typeof proposal.candidate_router !== "object") {
		fail("proposal missing candidate_router object");
	}
}

const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) {
	process.stdout.write(
		[
			"Usage:",
			"  node .pi/harness/router/apply-router-proposal.mjs \\",
			"    --proposal <proposal.json> \\",
			"    --approve-by <human> \\",
			"    --justification <reason> \\",
			"    --write",
			"",
			"Behavior:",
			"  - validates proposal status and evidence",
			"  - verifies base router hash matches current router file",
			"  - creates backup before atomic write",
			"  - refuses write unless explicit --write is provided",
		].join("\n"),
	);
	process.exit(0);
}

if (!args.proposal) fail("missing --proposal");
if (!args["approve-by"]) fail("missing --approve-by");
if (!args.justification) fail("missing --justification");
if (!args.write) {
	fail("missing --write (blind writes and implicit applies are disallowed)");
}

const proposalPath = path.resolve(args.proposal);
const proposal = readJson(proposalPath, "proposal");
const currentRouter = readJson(ROUTER_PATH, "current router");

validateProposal(proposal);

const currentHash = sha256FromJson(currentRouter);
if (currentHash !== proposal.base_router_sha256) {
	fail(
		[
			"base router hash mismatch; refusing apply.",
			`current:  ${currentHash}`,
			`proposal: ${proposal.base_router_sha256}`,
		].join("\n"),
	);
}

const candidateHash = sha256FromJson(proposal.candidate_router);
if (candidateHash !== proposal.candidate_router_sha256) {
	fail("proposal candidate_router hash mismatch; artifact may be tampered");
}

const now = new Date().toISOString();
fs.mkdirSync(BACKUP_DIR, { recursive: true });
const backupPath = path.join(
	BACKUP_DIR,
	`model-router.${now.replace(/[:.]/g, "-")}.json`,
);
fs.copyFileSync(ROUTER_PATH, backupPath);

const routerTemp = `${ROUTER_PATH}.tmp`;
fs.writeFileSync(routerTemp, `${JSON.stringify(proposal.candidate_router, null, 2)}\n`);
fs.renameSync(routerTemp, ROUTER_PATH);

proposal.status = "approved_applied";
proposal.approval = {
	required: true,
	approved_by: args["approve-by"],
	approved_at: now,
	justification: args.justification,
};
proposal.applied_router_sha256 = candidateHash;
proposal.backup_router_path = backupPath;
proposal.applied_at = now;
fs.writeFileSync(proposalPath, `${JSON.stringify(proposal, null, 2)}\n`);

process.stdout.write(
	[
		"Router proposal applied safely.",
		`proposal: ${proposalPath}`,
		`backup: ${backupPath}`,
		`router: ${ROUTER_PATH}`,
	].join("\n") + "\n",
);
