import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const budgetGuardSrc = readFileSync(
	join(root, ".pi/extensions/budget-guard.ts"),
	"utf-8",
);
const budgetSchema = JSON.parse(
	readFileSync(
		join(root, ".pi/harness/specs/budget-exhausted-event.schema.json"),
		"utf-8",
	),
);

test("plan phase default cap is 80k", () => {
	assert.match(budgetGuardSrc, /HARNESS_BUDGET_PLAN_TOKENS \?\? "80000"/);
});

test("budget guard debounces soft limit emissions", () => {
	assert.match(budgetGuardSrc, /debouncedSoftLimit/);
});

test("budget schema allows phase and global exhaustion reasons", () => {
	const reasons =
		budgetSchema.properties.exhaustion_reason.enum;
	assert.ok(reasons.includes("phase_cap_exceeded"));
	assert.ok(reasons.includes("global_cap_exceeded"));
});
