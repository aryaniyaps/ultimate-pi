import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateHarnessToolPolicy } from "../.pi/lib/agt/evaluate-policy.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cases = JSON.parse(
	readFileSync(join(root, "test/fixtures/agt-policy-cases.json"), "utf-8"),
);

process.env.HARNESS_AGT_POLICY = "1";

function entriesForHarnessSession(active) {
	if (!active) return [];
	return [
		{
			type: "message",
			message: { role: "user", content: "/harness-auto" },
		},
	];
}

for (const c of cases) {
	test(`AGT matrix: ${c.id}`, async () => {
		const prevSub = process.env.PI_HARNESS_SUBPROCESS;
		const prevAgent = process.env.HARNESS_AGENT_ID;
		try {
			process.env.PI_HARNESS_SUBPROCESS = c.isSubprocess ? "1" : "";
			process.env.HARNESS_AGENT_ID = c.agentId;
			const result = await evaluateHarnessToolPolicy(root, {
				toolName: c.toolName,
				toolInput: c.input ?? {},
				packageRoot: root,
				projectRoot: root,
				sessionId: "test-session",
				entries: entriesForHarnessSession(Boolean(c.harnessSession)),
				policyState: {
					phase: c.phase,
					approvedPlan: c.phase === "execute" || c.phase === "merge",
					planId: null,
					aborted: Boolean(c.aborted),
					budgetBypass: false,
				},
			});
			const got = result.allowed ? "allow" : "deny";
			assert.equal(
				got,
				c.expect,
				`${c.id}: expected ${c.expect}, got ${got} (${result.reason})`,
			);
		} finally {
			process.env.PI_HARNESS_SUBPROCESS = prevSub;
			process.env.HARNESS_AGENT_ID = prevAgent;
		}
	});
}
