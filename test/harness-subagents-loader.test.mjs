import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	discoverFromRoots,
	getDriftReport,
	isSafeAgentId,
	sha256Content,
} from "./harness-subagents-loader.core.mjs";

const PKG_AGENTS = join(process.cwd(), ".pi", "agents");

describe("harness-subagents loader", () => {
	it("rejects unsafe agent ids", () => {
		assert.equal(isSafeAgentId("../evil"), false);
		assert.equal(isSafeAgentId("harness/planner"), true);
	});

	it("discovers namespaced package agents", () => {
		const files = discoverFromRoots(PKG_AGENTS, join(process.cwd(), ".pi", "agents", "__none__"));
		assert.ok(files.has("harness/planner"));
		assert.ok(files.has("pi-pi/agent-expert"));
	});

	it("project override wins for same path", () => {
		const root = mkdtempSync(join(tmpdir(), "harness-agents-"));
		const pkgDir = join(root, "pkg", ".pi", "agents");
		const projDir = join(root, "proj", ".pi", "agents");
		mkdirSync(join(pkgDir, "harness"), { recursive: true });
		mkdirSync(join(projDir, "harness"), { recursive: true });
		writeFileSync(
			join(pkgDir, "harness", "planner.md"),
			"---\ndescription: pkg\n---\n",
		);
		writeFileSync(
			join(projDir, "harness", "planner.md"),
			"---\ndescription: proj\n---\n",
		);
		const merged = discoverFromRoots(pkgDir, projDir);
		assert.match(merged.get("harness/planner").content, /description: proj/);
	});

	it("flat project planner does not shadow harness/planner", () => {
		const root = mkdtempSync(join(tmpdir(), "harness-agents-flat-"));
		const pkgDir = join(root, "pkg", ".pi", "agents");
		const projDir = join(root, "proj", ".pi", "agents");
		mkdirSync(join(pkgDir, "harness"), { recursive: true });
		mkdirSync(projDir, { recursive: true });
		writeFileSync(
			join(pkgDir, "harness", "planner.md"),
			"---\ndescription: harness planner\n---\n",
		);
		writeFileSync(join(projDir, "planner.md"), "---\ndescription: flat\n---\n");
		const merged = discoverFromRoots(pkgDir, projDir);
		assert.ok(merged.has("harness/planner"));
		assert.ok(merged.has("planner"));
		assert.notEqual(
			merged.get("harness/planner").path,
			merged.get("planner").path,
		);
	});

	it("detects manifest drift", () => {
		const content = "---\ndescription: test\n---\n";
		const hash = sha256Content(content);
		const manifest = {
			agents: {
				"harness/planner": { path: ".pi/agents/harness/planner.md", sha256: hash },
			},
		};
		const onDisk = new Map([
			["harness/planner", { sha256: "deadbeef" }],
		]);
		const drift = getDriftReport(manifest, onDisk);
		assert.equal(drift.ok, false);
		assert.equal(drift.items[0].kind, "hash_mismatch");
	});

	it("shipped agents.manifest.json matches package hashes", () => {
		const manifestPath = join(
			process.cwd(),
			".pi/harness/agents.manifest.json",
		);
		let manifest;
		try {
			manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
		} catch {
			// Generated in CI via harness-agents-manifest.mjs --write
			return;
		}
		const onDisk = new Map();
		for (const [id, entry] of Object.entries(manifest.agents)) {
			const abs = join(process.cwd(), entry.path);
			const content = readFileSync(abs, "utf-8");
			onDisk.set(id, { sha256: sha256Content(content) });
		}
		const drift = getDriftReport(manifest, onDisk);
		assert.equal(drift.ok, true, JSON.stringify(drift.items));
	});
});
