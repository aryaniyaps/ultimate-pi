import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readPrompt(relativePath) {
	return readFileSync(join(root, relativePath), "utf-8");
}

function assertTestTypeTriad(promptText, promptName) {
	assert.match(promptText, /\bunit\b/i, `${promptName} must mention unit tests`);
	assert.match(promptText, /\bintegration\b/i, `${promptName} must mention integration tests`);
	assert.match(promptText, /\b(?:e2e|end-to-end)\b/i, `${promptName} must mention e2e/end-to-end tests`);
	assert.match(promptText, /\bapplicable|applicability\b/i, `${promptName} must preserve applicability-based test selection`);
}

test("harness-plan prompt requires explicit unit/integration/e2e planning expectations", () => {
	const prompt = readPrompt(".pi/prompts/harness-plan.md");
	assertTestTypeTriad(prompt, "harness-plan");
	assert.match(prompt, /execution_plan[\s\S]{0,500}testing expectations explicit/i);
	assert.match(prompt, /decide whether[\s\S]{0,220}unit[\s\S]{0,220}integration[\s\S]{0,220}(?:e2e|end-to-end)[\s\S]{0,220}applicable/i);
	assert.match(prompt, /verification commands/i);
	assert.match(prompt, /rationale[\s\S]{0,120}not applicable/i);
});

test("harness-run prompt requires executor to implement or update applicable tests", () => {
	const prompt = readPrompt(".pi/prompts/harness-run.md");
	assertTestTypeTriad(prompt, "harness-run");
	assert.match(prompt, /executor must implement or update applicable unit, integration, and e2e\/end-to-end tests/i);
	assert.match(prompt, /run the relevant verification commands/i);
	assert.match(prompt, /validation_summary/i);
});

test("harness-review prompt verifies planned and executed applicable testing", () => {
	const prompt = readPrompt(".pi/prompts/harness-review.md");
	assertTestTypeTriad(prompt, "harness-review");
	assert.match(prompt, /verify the testing obligation itself/i);
	assert.match(prompt, /planned applicability decisions[\s\S]{0,160}unit[\s\S]{0,160}integration[\s\S]{0,160}(?:e2e|end-to-end) tests/i);
	assert.match(prompt, /implemented or updated and run/i);
	assert.match(prompt, /benchmark failure/i);
});
