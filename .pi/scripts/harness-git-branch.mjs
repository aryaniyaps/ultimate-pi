#!/usr/bin/env node
/**
 * Ensure harness feature branch when on protected default branch.
 *
 * Usage:
 *   node "$UP_PKG/.pi/scripts/harness-git-branch.mjs" \
 *     --run-id <id> [--run-dir <path>] [--project-root <root>] [--dry-run]
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	ensureHarnessGitBranch,
	writeGitWorkflowArtifact,
} from "../lib/harness-git-branch.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const UP_PKG = join(SCRIPT_DIR, "..", "..");

function parseArgs(argv) {
	const out = {
		runId: null,
		runDir: null,
		projectRoot: null,
		dryRun: false,
	};
	for (let i = 2; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--dry-run") out.dryRun = true;
		else if (a === "--run-id" && argv[i + 1]) out.runId = argv[++i];
		else if (a === "--run-dir" && argv[i + 1]) out.runDir = argv[++i];
		else if (a === "--project-root" && argv[i + 1])
			out.projectRoot = argv[++i];
		else if (a === "--help" || a === "-h") {
			console.log(`Usage: harness-git-branch.mjs --run-id <id> [--run-dir <dir>] [--project-root <root>] [--dry-run]`);
			process.exit(0);
		}
	}
	return out;
}

async function main() {
	const args = parseArgs(process.argv);
	const projectRoot = args.projectRoot ?? process.cwd();
	const runId = args.runId;
	if (!runId) {
		console.error("harness-git-branch: --run-id is required");
		process.exit(1);
	}

	const result = await ensureHarnessGitBranch({
		projectRoot,
		runId,
		upPkg: UP_PKG,
		dryRun: args.dryRun,
	});

	if (args.runDir && !args.dryRun) {
		await writeGitWorkflowArtifact({ runDir: args.runDir, result });
	}

	console.log(JSON.stringify(result, null, 2));
	if (!result.ok) process.exit(1);
}

main().catch((err) => {
	console.error(`harness-git-branch: ${err.message}`);
	process.exit(1);
});
