/**
 * Wall-clock budget for plan-phase Review Gate debate.
 */

import { isHarnessNonInteractive } from "./ask-user/policy.js";
import type { DebateProfile } from "./plan-debate-eligibility.js";

export interface DebateWallClockResult {
	exceeded: boolean;
	elapsed_ms: number;
	limit_ms: number;
	non_interactive: boolean;
}

function parseWallClockMs(profile: DebateProfile): number {
	const env = process.env.HARNESS_DEBATE_WALL_CLOCK_MS;
	if (env?.trim()) {
		const parsed = Number.parseInt(env, 10);
		if (Number.isFinite(parsed) && parsed > 0) return parsed;
	}
	return profile === "fast" ? 480_000 : 1_200_000;
}

export function checkDebateWallClock(args: {
	opened_at: string | undefined;
	debate_profile?: DebateProfile;
}): DebateWallClockResult {
	const limit_ms = parseWallClockMs(args.debate_profile ?? "standard");
	if (!args.opened_at) {
		return {
			exceeded: false,
			elapsed_ms: 0,
			limit_ms,
			non_interactive: isHarnessNonInteractive(),
		};
	}
	const opened = Date.parse(args.opened_at);
	const elapsed_ms = Number.isFinite(opened)
		? Math.max(0, Date.now() - opened)
		: 0;
	return {
		exceeded: elapsed_ms > limit_ms,
		elapsed_ms,
		limit_ms,
		non_interactive: isHarnessNonInteractive(),
	};
}

export function debateWallClockRecoveryHint(
	result: DebateWallClockResult,
): string {
	if (!result.exceeded) return "";
	if (result.non_interactive) {
		return "Debate wall-clock exceeded in non-interactive mode — use conditional_pass with debate_truncated: true.";
	}
	return "Debate wall-clock exceeded — ask_user once to extend HARNESS_DEBATE_WALL_CLOCK_MS or truncate debate.";
}
