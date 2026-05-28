#!/usr/bin/env node
/**
 * Reconcile run-context.yaml with on-disk plan + executor handoff (no Pi session).
 * Usage: node .pi/scripts/harness-reconcile-run-context.mjs <run-id>
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const runId = process.argv[2];
if (!runId) {
	console.error("usage: node .pi/scripts/harness-reconcile-run-context.mjs <run-id>");
	process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "harness-reconcile-"));
const runner = join(dir, "run.mts");
writeFileSync(
	runner,
	`import {
  reconcileStaleExecuteCompletion,
  reconcileReviewRouting,
  loadRunContextFromDisk,
  saveRunContextToDisk,
} from ${JSON.stringify(join(root, ".pi/lib/harness-run-context.ts"))};

const root = ${JSON.stringify(root)};
const runId = ${JSON.stringify(runId)};
const ctx0 = await loadRunContextFromDisk(runId, root);
if (!ctx0) {
  console.error("run not found:", runId);
  process.exit(1);
}
console.log("before", JSON.stringify({
  phase: ctx0.phase,
  step: ctx0.last_completed_step,
  outcome: ctx0.last_outcome,
  next: ctx0.next_recommended_command,
}));
let ctx1 = await reconcileStaleExecuteCompletion(root, ctx0, []);
ctx1 = await reconcileReviewRouting(root, ctx1);
await saveRunContextToDisk(ctx1, root);
console.log("after", JSON.stringify({
  phase: ctx1.phase,
  step: ctx1.last_completed_step,
  outcome: ctx1.last_outcome,
  next: ctx1.next_recommended_command,
}));
`,
	"utf-8",
);

const result = spawnSync("npx", ["-y", "tsx", runner], {
	cwd: root,
	encoding: "utf-8",
	stdio: "inherit",
});
rmSync(dir, { recursive: true, force: true });
process.exit(result.status ?? 1);
