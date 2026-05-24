import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isUsableApiKey,
	parseModelRef,
	resolveConcreteSubagentModel,
} from "../.pi/lib/harness-subagent-auth.ts";

describe("harness-subagent-auth", () => {
	it("rejects sentinel api keys", () => {
		assert.equal(isUsableApiKey("<authenticated>"), false);
		assert.equal(isUsableApiKey("sk-real-key-here"), true);
	});

	it("parses concrete provider/model refs only", () => {
		assert.deepEqual(parseModelRef("opencode-go/qwen3.6-plus"), {
			provider: "opencode-go",
			modelId: "qwen3.6-plus",
		});
		assert.equal(parseModelRef("router/legacy"), null);
		assert.equal(parseModelRef("missing-slash"), null);
	});

	it("prefers concrete agent model over parent model", () => {
		const concrete = resolveConcreteSubagentModel(
			process.cwd(),
			{ provider: "anthropic", id: "claude-sonnet-4" },
			{
				name: "harness/planning/planning-context",
				model: "opencode-go/qwen3.6-plus",
				thinking: "low",
				description: "",
				systemPrompt: "",
				source: "package",
				filePath: "x",
			},
		);
		assert.equal(concrete?.modelRef, "opencode-go/qwen3.6-plus");
		assert.equal(concrete?.provider, "opencode-go");
	});

	it("falls back to concrete parent model", () => {
		const concrete = resolveConcreteSubagentModel(
			process.cwd(),
			{ provider: "anthropic", id: "claude-sonnet-4" },
			{
				name: "harness/planning/planning-context",
				thinking: "low",
				description: "",
				systemPrompt: "",
				source: "package",
				filePath: "x",
			},
		);
		assert.equal(concrete?.modelRef, "anthropic/claude-sonnet-4");
	});

	it("does not resolve logical router models", () => {
		const concrete = resolveConcreteSubagentModel(
			process.cwd(),
			{ provider: "router", id: "legacy" },
			{
				name: "harness/planning/planning-context",
				model: "router/legacy",
				thinking: "low",
				description: "",
				systemPrompt: "",
				source: "package",
				filePath: "x",
			},
		);
		assert.equal(concrete, undefined);
	});
});
