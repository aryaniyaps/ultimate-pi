import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	allowsAgentTool,
	getAgentPolicySpec,
	isAgtGovernanceActive,
	loadAgentsPolicyMerged,
} from "../.pi/lib/agents-policy.mjs";
const packageRoot = join(import.meta.dirname, "..");

test("project agents.policy.yaml merges over package", () => {
	const projectRoot = mkdtempSync(join(tmpdir(), "up-agt-proj-"));
	mkdirSync(join(projectRoot, ".pi"), { recursive: true });
	writeFileSync(
		join(projectRoot, ".pi", "agents.policy.yaml"),
		`apiVersion: harness.toolkit/v1
agents:
  demo/custom:
    kind: planner
    tools_add:
      - web_search
`,
		"utf-8",
	);
	const merged = loadAgentsPolicyMerged(packageRoot, projectRoot);
	assert.ok(merged.agents.has("demo/custom"));
	const spec = getAgentPolicySpec(packageRoot, projectRoot, "demo/custom");
	assert.ok(spec?.effectiveTools.includes("web_search"));
});

test("isAgtGovernanceActive when project policy files exist", () => {
	const projectRoot = mkdtempSync(join(tmpdir(), "up-agt-gov-"));
	mkdirSync(join(projectRoot, ".pi", "policies"), { recursive: true });
	writeFileSync(
		join(projectRoot, ".pi", "policies", "demo.yaml"),
		"policies: []\n",
		"utf-8",
	);
	assert.equal(isAgtGovernanceActive(projectRoot), true);
});

test("custom project agent tool allowlist via agents.policy", () => {
	const projectRoot = mkdtempSync(join(tmpdir(), "up-agt-custom-"));
	mkdirSync(join(projectRoot, ".pi"), { recursive: true });
	writeFileSync(
		join(projectRoot, ".pi", "agents.policy.yaml"),
		`apiVersion: harness.toolkit/v1
agents:
  demo/runner:
    kind: executor
    tools_add:
      - read
      - bash
    tools_deny:
      - write
      - edit
`,
		"utf-8",
	);
	assert.equal(
		allowsAgentTool({
			packageRoot,
			projectRoot,
			agentId: "demo/runner",
			toolName: "write",
			isSubprocess: true,
		}),
		false,
	);
	assert.equal(
		allowsAgentTool({
			packageRoot,
			projectRoot,
			agentId: "demo/runner",
			toolName: "bash",
			isSubprocess: true,
		}),
		true,
	);
});
