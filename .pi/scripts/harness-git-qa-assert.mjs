#!/usr/bin/env node
/**
 * Assert scoped harness git QA smoke commit at HEAD.
 *
 * Usage: node harness-git-qa-assert.mjs [--project-root DIR]
 */

import { isHarnessGitQaCommitComplete } from "../lib/harness-git-qa.mjs";

function parseArgs(argv) {
	let projectRoot = process.cwd();
	for (let i = 2; i < argv.length; i++) {
		if (argv[i] === "--project-root" && argv[i + 1]) projectRoot = argv[++i];
	}
	return { projectRoot };
}

async function main() {
	const { projectRoot } = parseArgs(process.argv);
	if (!(await isHarnessGitQaCommitComplete(projectRoot))) {
		console.error(
			"harness-git-qa-assert: FAIL — scoped harness-git-commit missing at HEAD",
		);
		process.exit(1);
	}
	console.log("harness-git-qa-assert: pass");
}

main().catch((err) => {
	console.error(`harness-git-qa-assert: ${err.message}`);
	process.exit(1);
});
