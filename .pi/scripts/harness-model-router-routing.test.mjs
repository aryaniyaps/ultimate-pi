#!/usr/bin/env node
/**
 * Unit tests for session-locked pi-model-router routing (no LLM).
 * Run: npx tsx .pi/scripts/harness-model-router-routing.test.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	decideSessionLock,
	applyThinkingToDecision,
	buildRoutingDecision,
	decideRouting,
} from "../../vendor/pi-model-router/extensions/routing.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const sampleProfile = {
	high: { model: "openai/gpt-5.5", thinking: "high" },
	medium: { model: "openai/gpt-5.5", thinking: "medium" },
	low: { model: "openai/gpt-5.5", thinking: "low" },
};

const planningContext = {
	systemPrompt: "You are a harness architect. Design tradeoffs and migration strategy.",
	messages: [
		{
			role: "user",
			content:
				"Plan a multi-phase refactor across modules with architecture review.",
			timestamp: 1,
		},
	],
};

const shortContext = {
	systemPrompt: "Summarize briefly.",
	messages: [{ role: "user", content: "changelog", timestamp: 1 }],
};

const lockHigh = decideSessionLock(
	planningContext,
	"auto",
	sampleProfile,
	undefined,
	undefined,
	0.5,
	[{ matches: "changelog", tier: "low" }],
);
assert.equal(lockHigh.tier, "high", "planning prompt locks high tier");

const lockLow = decideSessionLock(shortContext, "auto", sampleProfile);
assert.equal(lockLow.tier, "low", "short summary locks low tier");

const locked = buildRoutingDecision(
	"auto",
	sampleProfile,
	lockHigh.tier,
	"planning",
	lockHigh.reasoning,
);
const thinkingTurn = decideRouting(
	{
		...planningContext,
		messages: [
			...planningContext.messages,
			{ role: "user", content: "changelog only", timestamp: 2 },
		],
	},
	"auto",
	sampleProfile,
	locked,
);
const merged = applyThinkingToDecision(locked, thinkingTurn, sampleProfile);
assert.equal(merged.targetLabel, locked.targetLabel, "model stays locked");
assert.equal(merged.tier, thinkingTurn.tier, "thinking tier follows turn");
assert.equal(merged.thinking, "low", "low thinking from turn tier config");

const examplePath = join(ROOT, ".pi", "model-router.example.json");
const example = JSON.parse(readFileSync(examplePath, "utf8"));
for (const [name, profile] of Object.entries(example.profiles ?? {})) {
	const { high, medium, low } = profile;
	assert.equal(
		high.model,
		medium.model,
		`example profile ${name}: medium/high same model`,
	);
	assert.equal(
		medium.model,
		low.model,
		`example profile ${name}: low/medium same model`,
	);
}

console.log("harness-model-router-routing.test: PASS");
