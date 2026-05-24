import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateHarnessToolPolicy } from "../.pi/lib/agt/evaluate-policy.ts";
import { evaluateLegacyHarnessToolPolicy } from "../.pi/lib/agt/legacy-evaluate.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cases = JSON.parse(
	readFileSync(join(root, "test/fixtures/agt-policy-cases.json"), "utf-8"),
);

for (const c of cases) {
	test(`AGT parity: ${c.id}`, async () => {
		const prevSub = process.env.PI_HARNESS_SUBPROCESS;
		const prevAgent = process.env.HARNESS_AGENT_ID;
		const prevFlag = process.env.HARNESS_AGT_POLICY;
		try {
			process.env.PI_HARNESS_SUBPROCESS = c.isSubprocess ? "1" : "";
			process.env.HARNESS_AGENT_ID = c.agentId;
			const input = {
				toolName: c.toolName,
				toolInput: c.input ?? {},
				packageRoot: root,
				projectRoot: root,
				sessionId: "test-session",
				entries: [],
				policyState: {
					phase: c.phase,
					approvedPlan: c.phase === "execute" || c.phase === "merge",
					planId: null,
					aborted: Boolean(c.aborted),
					budgetBypass: false,
				},
			};
			const legacy = await evaluateLegacyHarnessToolPolicy(input);
			process.env.HARNESS_AGT_POLICY = "1";
			const agt = await evaluateHarnessToolPolicy(root, input);
			const legacyDecision = legacy.allowed ? "allow" : "deny";
			const agtDecision = agt.allowed ? "allow" : "deny";
			assert.equal(
				agtDecision,
				legacyDecision,
				`parity mismatch for ${c.id}: legacy=${legacyDecision} agt=${agtDecision} (${agt.reason} vs ${legacy.reason})`,
			);
		} finally {
			process.env.PI_HARNESS_SUBPROCESS = prevSub;
			process.env.HARNESS_AGENT_ID = prevAgent;
			process.env.HARNESS_AGT_POLICY = prevFlag;
		}
	});
}
