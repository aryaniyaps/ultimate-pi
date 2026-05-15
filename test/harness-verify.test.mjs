import { spawn } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function runHarnessVerify() {
	return new Promise((resolve, reject) => {
		const child = spawn("node", [".pi/scripts/harness-verify.mjs"], {
			cwd: ROOT,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => {
			stdout += d.toString();
		});
		child.stderr.on("data", (d) => {
			stderr += d.toString();
		});
		child.on("close", (code) => {
			if (code === 0) resolve(stdout);
			else reject(new Error(stderr || stdout || `exit ${code}`));
		});
	});
}

test("harness:verify passes", async () => {
	const out = await runHarnessVerify();
	assert.match(out, /harness:verify PASS/);
});
