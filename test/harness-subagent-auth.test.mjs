import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isUsableApiKey,
	resolveConcreteSubagentModel,
	resolveRouterConcreteModelRef,
} from "../.pi/extensions/lib/harness-subagent-auth.ts";

describe("harness-subagent-auth", () => {
	it("rejects router sentinel api keys", () => {
		assert.equal(isUsableApiKey("pi-model-router"), false);
		assert.equal(isUsableApiKey("sk-real-key-here"), true);
	});

	it("resolves router/auto parent to concrete tier model", () => {
		const root = mkdtempSync(join(tmpdir(), "harness-router-"));
		mkdirSync(join(root, ".pi"), { recursive: true });
		writeFileSync(
			join(root, ".pi", "model-router.json"),
			JSON.stringify({
				defaultProfile: "auto",
				profiles: {
					auto: {
						low: { model: "opencode-go/deepseek-v4-flash" },
						medium: { model: "opencode-go/qwen3.6-plus" },
					},
				},
			}),
		);
		const concrete = resolveConcreteSubagentModel(
			root,
			{ provider: "router", id: "auto" },
			{
				name: "harness/planning/scout-graphify",
				thinking: "low",
				description: "",
				systemPrompt: "",
				source: "package",
				filePath: "x",
			},
		);
		assert.equal(concrete?.modelRef, "opencode-go/deepseek-v4-flash");
		assert.equal(concrete?.provider, "opencode-go");
	});

	it("resolveRouterConcreteModelRef reads profile tiers", () => {
		const root = mkdtempSync(join(tmpdir(), "harness-router-tier-"));
		mkdirSync(join(root, ".pi"), { recursive: true });
		writeFileSync(
			join(root, ".pi", "model-router.json"),
			`{"profiles":{"auto":{"medium":{"model":"opencode-go/qwen3.6-plus"}}}}`,
		);
		assert.equal(
			resolveRouterConcreteModelRef(root, "auto", "medium"),
			"opencode-go/qwen3.6-plus",
		);
	});
});
