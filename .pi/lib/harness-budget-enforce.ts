/**
 * Central switch for harness token/debate budget enforcement.
 * Default: telemetry-only (HARNESS_BUDGET_ENFORCE off).
 */

export function isHarnessBudgetEnforceOn(): boolean {
	const raw = (process.env.HARNESS_BUDGET_ENFORCE ?? "off").toLowerCase();
	return raw === "1" || raw === "true" || raw === "on";
}

/** When false, soft-limit and debate telemetry must not block UI or gates. */
export function shouldEmitBlockingBudgetExhausted(): boolean {
	if (!isHarnessBudgetEnforceOn()) return false;
	return (
		process.env.HARNESS_BUDGET_HARD_STOP === "true" ||
		process.env.HARNESS_DEBATE_HARD_STOP === "true"
	);
}
