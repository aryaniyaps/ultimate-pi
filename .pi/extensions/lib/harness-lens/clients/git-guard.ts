import type { RuntimeCoordinator } from "./runtime-coordinator.js";

function getShellCommand(input: unknown): string {
	if (!input || typeof input !== "object") return "";
	const raw = input as { command?: unknown; cmd?: unknown };
	if (typeof raw.command === "string") return raw.command;
	if (typeof raw.cmd === "string") return raw.cmd;
	return "";
}

export function isGitCommitOrPushAttempt(
	toolName: string,
	input: unknown,
): boolean {
	if (toolName !== "bash") return false;
	const cmd = getShellCommand(input).toLowerCase();
	if (!cmd) return false;
	return /(^|\s|&&|;|\|)git\s+(commit|push)(\s|$)/.test(cmd);
}

export function evaluateGitGuard(runtime: RuntimeCoordinator): {
	block: boolean;
	reason?: string;
} {
	if (!runtime.gitGuardHasBlockers) return { block: false };
	const details = runtime.gitGuardSummary ? `\n${runtime.gitGuardSummary}` : "";
	return {
		block: true,
		reason: `🔴 COMMIT BLOCKED (--lens-guard): unresolved blockers must be fixed before commit/push.${details}`,
	};
}
