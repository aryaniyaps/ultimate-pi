import test from "node:test";
import assert from "node:assert/strict";

import { mergeConfig, resolveCoAuthorTrailer, validateMergedConfig, parseChangedPaths, deriveSummary } from "../lib/auto-commit-core.ts";
import { FIXTURE_CONFIG, FIXTURE_STATUS } from "./fixtures/auto-commit.fixtures.ts";

test("global dryRun true is ratchet and cannot be unset by project", () => {
	const cfg = mergeConfig(FIXTURE_CONFIG.globalRestrictive, FIXTURE_CONFIG.projectAggressive);
	assert.equal(cfg.dryRun, true);
});

test("global dryRun false can be escalated by project", () => {
	const cfg = mergeConfig({ dryRun: false }, { dryRun: true });
	assert.equal(cfg.dryRun, true);
});

test("global autoPush false cannot be escalated by project", () => {
	const cfg = mergeConfig(FIXTURE_CONFIG.globalRestrictive, FIXTURE_CONFIG.projectAggressive);
	assert.equal(cfg.autoPush, false);
});

test("global autoPush true can be disabled by project", () => {
	const cfg = mergeConfig({ autoPush: true }, { autoPush: false });
	assert.equal(cfg.autoPush, false);
});

test("push allowedRemotes narrows with intersection", () => {
	const cfg = mergeConfig(FIXTURE_CONFIG.globalRestrictive, FIXTURE_CONFIG.projectSafe);
	assert.deepEqual(cfg.push.allowedRemotes, ["origin"]);
});

test("push allowedRemotes takes global if project empty", () => {
	const cfg = mergeConfig({ push: { allowedRemotes: ["origin", "upstream"] } }, { push: { allowedRemotes: [] } });
	assert.deepEqual(cfg.push.allowedRemotes, ["origin", "upstream"]);
});

test("co-author trailer uses deterministic fallback noreply formula", () => {
	const cfg = mergeConfig({}, { coAuthor: { login: "pi-mono", id: 261679550, email: "", enforce: true } });
	const trailer = resolveCoAuthorTrailer(cfg);
	assert.equal(trailer, "Co-authored-by: pi-mono <261679550+pi-mono@users.noreply.github.com>");
});

test("co-author trailer uses provided email if valid", () => {
	const cfg = mergeConfig({}, { coAuthor: { login: "user", email: "user@example.com" } });
	const trailer = resolveCoAuthorTrailer(cfg);
	assert.equal(trailer, "Co-authored-by: user <user@example.com>");
});

test("default merged config validates cleanly", () => {
	const cfg = mergeConfig({}, {});
	const issues = validateMergedConfig(cfg);
	assert.deepEqual(issues, []);
});

test("mergeConfig clamps idleMs to a minimum of 1000", () => {
	const cfg = mergeConfig({}, { trigger: { mode: "idle", idleMs: 500 } });
	assert.equal(cfg.trigger.idleMs, 1000);
});

test("validation catches invalid idleMs when bypassed mergeConfig", () => {
	const cfg = mergeConfig({}, {});
	cfg.trigger.mode = "idle";
	cfg.trigger.idleMs = 500;
	const issues = validateMergedConfig(cfg);
	assert.ok(issues.some((i) => i.includes("trigger.idleMs should be at least 1000ms")));
});

test("parseChangedPaths extracts standard and renamed paths", () => {
	const paths = parseChangedPaths(FIXTURE_STATUS.mixed);
	assert.deepEqual(paths, ["lib/auto-commit-core.ts", "new_path.ts", "spaced path/file.ts"]);
});

test("parseChangedPaths deduplicates repeated paths", () => {
	const paths = parseChangedPaths(FIXTURE_STATUS.duplicates);
	assert.deepEqual(paths, ["src/index.ts", "src/new.ts"]);
});

test("deriveSummary clusters by directory up to maxPaths", () => {
	const paths = ["src/components/button.ts", "src/components/modal.ts", "lib/utils.ts", "index.ts"];
	const summary = deriveSummary(paths, 2);
	assert.equal(summary, "update src/components, lib/utils.ts +1 more");
});

test("deriveSummary handles single files", () => {
	const paths = ["index.ts"];
	const summary = deriveSummary(paths, 2);
	assert.equal(summary, "update index.ts");
});

test("validation blocks autoPush when remotes empty", () => {
	const cfg = mergeConfig({ autoPush: true, push: { allowedRemotes: ["origin"] } }, { push: { allowedRemotes: ["fork"] } });
	const issues = validateMergedConfig(cfg);
	assert.ok(issues.includes("autoPush enabled but push.allowedRemotes is empty"));
});

test("validation blocks enforce co-author when explicit email is invalid", () => {
	const cfg = mergeConfig({}, { coAuthor: { login: "pi-mono", email: "not-an-email", enforce: true } });
	const issues = validateMergedConfig(cfg);
	assert.ok(issues.includes("coAuthor.enforce is true but co-author trailer cannot be resolved"));
});
