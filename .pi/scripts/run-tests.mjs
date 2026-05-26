#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const TEST_DIR = 'test';

const NODE_ONLY_TESTS = [
	'harness-verify.test.mjs',
	'harness-ask-user.test.mjs',
	'harness-subagents-loader.test.mjs',
	'harness-subagent-precheck.test.mjs',
	'sentrux-rules-sync.test.mjs',
	'harness-budget-guard.test.mjs',
];

const DEFAULT_SUITE_EXCLUDES = new Set([
	'graphify-kb-updater.test.mjs',
	'harness-artifact-gate.test.mjs',
	'harness-spawn-critical-path.test.mjs',
	'harness-yaml.test.mjs',
	'plan-debate-lanes.test.mjs',
]);

function listTests() {
	const entries = readdirSync(TEST_DIR, { withFileTypes: true });
	const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
	const nodeOnlySet = new Set(NODE_ONLY_TESTS);

	const nodeTests = NODE_ONLY_TESTS.filter((name) => files.includes(name)).map((name) => `${TEST_DIR}/${name}`);
	const tsxTests = files
		.filter(
			(name) =>
				(name.endsWith('.test.mjs') || name.endsWith('.test.ts')) &&
				!name.endsWith('.integration.test.ts') &&
				!nodeOnlySet.has(name) &&
				!DEFAULT_SUITE_EXCLUDES.has(name),
		)
		.map((name) => `${TEST_DIR}/${name}`)
		.sort();

	return { nodeTests, tsxTests };
}

function run(cmd, args) {
	const result = spawnSync(cmd, args, { stdio: 'inherit' });
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

const { nodeTests, tsxTests } = listTests();

if (nodeTests.length > 0) {
	run('node', ['--test', ...nodeTests]);
}

run('node', ['.pi/harness/evals/smoke/smoke-harness-plan.mjs', '--fixture']);

if (tsxTests.length > 0) {
	run('npx', ['-y', 'tsx', '--test', ...tsxTests]);
}
