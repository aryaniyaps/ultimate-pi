#!/usr/bin/env node
/**
 * Manual terminal E2E for harness plan → run → review latency fixes.
 * ADR 0004: not part of default CI — run with --e2e-live or directly.
 *
 * Usage:
 *   node .pi/scripts/harness-e2e-workflow.mjs [--quick] [--task "…"]
 *
 * Requires: pi on PATH, HARNESS_ASK_USER_UI=headless (set by this script).
 * Does NOT use `pi -p` for the main workflow (Phase 0 ask_user blocks -p).
 */

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const pkgRoot = process.cwd();
const sessionId = `harness-latency-e2e-${Date.now()}`;
const logDir = join(pkgRoot, ".pi", "harness", "runs");
const logPath = join(logDir, `_e2e-latency-fixes-${sessionId}.log`);

const args = process.argv.slice(2);
const quick = args.includes("--quick");
const taskIdx = args.indexOf("--task");
const task =
	taskIdx >= 0 && args[taskIdx + 1]
		? args[taskIdx + 1]
		: 'smoke: append one line to .pi/harness/evals/smoke/E2E-LAST-RUN.txt with ISO timestamp and run_id; no other files; unit test only';

async function run(cmd, cmdArgs, env = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, cmdArgs, {
			cwd: pkgRoot,
			env: { ...process.env, ...env },
			stdio: "inherit",
		});
		child.on("error", reject);
		child.on("close", (code) => resolve(code ?? 1));
	});
}

async function main() {
	await mkdir(logDir, { recursive: true });
	console.error(`harness-e2e: log ${logPath}`);

	const verifyCode = await run("node", [join(pkgRoot, ".pi/scripts/harness-verify.mjs")]);
	if (verifyCode !== 0) process.exit(verifyCode);

	await run("pi", ["-p", "/harness-abort e2e preflight reset"]);

	const harnessAuto = `/harness-auto "${task.replace(/"/g, '\\"')}"${quick ? " --quick" : ""} --risk low`;
	const piArgs = [
		"--session-id",
		sessionId,
		harnessAuto,
	];

	const env = {
		HARNESS_ASK_USER_UI: "headless",
		HARNESS_REVIEW_PARALLEL: process.env.HARNESS_REVIEW_PARALLEL ?? "0",
	};

	const logChild = spawn("pi", piArgs, {
		cwd: pkgRoot,
		env: { ...process.env, ...env },
		stdio: ["inherit", "pipe", "pipe"],
	});

	let log = "";
	logChild.stdout?.on("data", (c) => {
		const s = c.toString();
		log += s;
		process.stdout.write(s);
	});
	logChild.stderr?.on("data", (c) => {
		const s = c.toString();
		log += s;
		process.stderr.write(s);
	});

	const exitCode = await new Promise((resolve, reject) => {
		logChild.on("error", reject);
		logChild.on("close", (code) => resolve(code ?? 1));
	});

	await writeFile(logPath, log, "utf-8");
	console.error(`harness-e2e: finished exit=${exitCode}`);
	process.exit(exitCode);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
