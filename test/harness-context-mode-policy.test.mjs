import { test } from "node:test";
import assert from "node:assert/strict";
import {
	contextModeInputLooksMutating,
	evaluateContextModeMutation,
	hasJsTsFsMutation,
	isMutatingShellScript,
	normalizeContextModeToolName,
	splitChainedCommands,
} from "../.pi/lib/harness-context-mode-policy.ts";

test("normalizeContextModeToolName handles Pi MCP prefix", () => {
	assert.equal(normalizeContextModeToolName("ctx_execute"), "ctx_execute");
	assert.equal(
		normalizeContextModeToolName("context_mode_ctx_execute"),
		"ctx_execute",
	);
	assert.equal(normalizeContextModeToolName("ctx_search"), null);
});

test("splitChainedCommands respects quotes", () => {
	const parts = splitChainedCommands('echo "a && b" && git commit -m x');
	assert.equal(parts.length, 2);
	assert.match(parts[1], /git commit/);
});

test("contextModeInputLooksMutating detects shell git commit", () => {
	assert.equal(
		contextModeInputLooksMutating("ctx_execute", {
			language: "shell",
			code: "git commit -m test",
		}),
		true,
	);
	assert.equal(
		contextModeInputLooksMutating("ctx_execute", {
			language: "shell",
			code: "ls -la",
		}),
		false,
	);
});

test("contextModeInputLooksMutating detects batch rm", () => {
	assert.equal(
		contextModeInputLooksMutating("ctx_batch_execute", {
			commands: [{ label: "rm", command: "rm -rf /tmp/foo" }],
		}),
		true,
	);
});

test("hasJsTsFsMutation detects writeFileSync", () => {
	assert.equal(
		hasJsTsFsMutation(
			"const fs = require('fs'); fs.writeFileSync('src/x.ts', 'hacked');",
		),
		true,
	);
	assert.equal(
		hasJsTsFsMutation(
			"const fs = require('fs'); console.log(fs.readdirSync('.'));",
		),
		false,
	);
});

test("isMutatingShellScript detects chained mutating commands", () => {
	assert.equal(isMutatingShellScript("ls && git push"), true);
	assert.equal(isMutatingShellScript("graphify query foo"), false);
});

test("evaluateContextModeMutation blocks shell git commit in plan phase", () => {
	const decision = evaluateContextModeMutation(
		"ctx_execute",
		{ language: "shell", code: "git commit -m test" },
		"plan",
		{ aborted: false },
	);
	assert.equal(decision.blocked, true);
	assert.match(decision.reason, /plan/);
});

test("evaluateContextModeMutation allows read-only shell in plan phase", () => {
	const decision = evaluateContextModeMutation(
		"ctx_execute",
		{ language: "shell", code: "ls -la" },
		"plan",
		{ aborted: false },
	);
	assert.equal(decision.blocked, false);
});

test("evaluateContextModeMutation blocks JS writeFileSync in plan phase", () => {
	const decision = evaluateContextModeMutation(
		"ctx_execute",
		{
			language: "javascript",
			code: "require('fs').writeFileSync('src/x.ts', 'x');",
		},
		"plan",
		{ aborted: false },
	);
	assert.equal(decision.blocked, true);
});

test("evaluateContextModeMutation allows mutating calls in execute phase", () => {
	const decision = evaluateContextModeMutation(
		"ctx_batch_execute",
		{
			commands: [{ label: "commit", command: "git commit -m ok" }],
		},
		"execute",
		{ aborted: false },
	);
	assert.equal(decision.blocked, false);
});

test("evaluateContextModeMutation blocks when aborted", () => {
	const decision = evaluateContextModeMutation(
		"ctx_execute",
		{ language: "shell", code: "git commit -m test" },
		"execute",
		{ aborted: true },
	);
	assert.equal(decision.blocked, true);
	assert.match(decision.reason, /abort/i);
});

test("evaluateContextModeMutation allows mutating calls with budgetBypass", () => {
	const decision = evaluateContextModeMutation(
		"ctx_execute",
		{ language: "shell", code: "git commit -m bootstrap" },
		"plan",
		{ aborted: false, budgetBypass: true },
	);
	assert.equal(decision.blocked, false);
});

test("evaluateContextModeMutation readOnlyAgent blocks even in execute phase", () => {
	const decision = evaluateContextModeMutation(
		"ctx_execute",
		{ language: "shell", code: "git commit -m test" },
		"execute",
		{ aborted: false, readOnlyAgent: true },
	);
	assert.equal(decision.blocked, true);
	assert.match(decision.reason, /read-only/i);
});
