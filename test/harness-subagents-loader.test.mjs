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
} from "../.pi/lib/harness-agent-discovery.mjs";

const PKG_AGENTS = join(process.cwd(), ".pi", "agents");

describe("harness-subagents loader", () => {
	it("rejects unsafe agent ids", () => {
		assert.equal(isSafeAgentId("../evil"), false);
		assert.equal(isSafeAgentId("harness/executor"), true);
	});

	it("discovers namespaced package agents", () => {
		const files = discoverFromRoots(
			PKG_AGENTS,
			join(process.cwd(), ".pi", "agents", "__none__"),
		);
		assert.ok(files.has("harness/executor"));
		assert.ok(files.has("pi-pi/agent-expert"));
	});

	it("project override wins for same path", () => {
		const root = mkdtempSync(join(tmpdir(), "harness-agents-"));
		const pkgDir = join(root, "pkg", ".pi", "agents");
		const projDir = join(root, "proj", ".pi", "agents");
		mkdirSync(join(pkgDir, "harness"), { recursive: true });
		mkdirSync(join(projDir, "harness"), { recursive: true });
		writeFileSync(
			join(pkgDir, "harness", "executor.md"),
			"---\ndescription: pkg\n---\n",
		);
		writeFileSync(
			join(projDir, "harness", "executor.md"),
			"---\ndescription: proj\n---\n",
		);
		const merged = discoverFromRoots(pkgDir, projDir);
		assert.match(merged.get("harness/executor").content, /description: proj/);
	});

	it("flat project agent does not shadow harness/executor", () => {
		const root = mkdtempSync(join(tmpdir(), "harness-agents-flat-"));
		const pkgDir = join(root, "pkg", ".pi", "agents");
		const projDir = join(root, "proj", ".pi", "agents");
		mkdirSync(join(pkgDir, "harness"), { recursive: true });
		mkdirSync(projDir, { recursive: true });
		writeFileSync(
			join(pkgDir, "harness", "executor.md"),
			"---\ndescription: harness executor\n---\n",
		);
		writeFileSync(
			join(projDir, "executor.md"),
			"---\ndescription: flat\n---\n",
		);
		const merged = discoverFromRoots(pkgDir, projDir);
		assert.ok(merged.has("harness/executor"));
		assert.ok(merged.has("executor"));
		assert.notEqual(
			merged.get("harness/executor").path,
			merged.get("executor").path,
		);
	});

	it("detects manifest drift", () => {
		const content = "---\ndescription: test\n---\n";
		const hash = sha256Content(content);
		const manifest = {
			agents: {
				"harness/executor": {
					path: ".pi/agents/harness/executor.md",
					sha256: hash,
				},
			},
		};
		const onDisk = new Map([["harness/executor", { sha256: "deadbeef" }]]);
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
