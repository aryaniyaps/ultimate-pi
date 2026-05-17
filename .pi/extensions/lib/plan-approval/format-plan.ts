import type { PlanPacketLike } from "../../../lib/harness-run-context.js";

function wrapLine(text: string, width: number): string[] {
	if (width < 20) return [text];
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let line = "";
	for (const word of words) {
		const next = line ? `${line} ${word}` : word;
		if (next.length > width && line) {
			lines.push(line);
			line = word;
		} else {
			line = next;
		}
	}
	if (line) lines.push(line);
	return lines.length > 0 ? lines : [""];
}

function riskBadge(risk: string | undefined): string {
	const r = (risk ?? "med").toLowerCase();
	return `[risk: ${r}]`;
}

export function formatPlanPacketLines(
	packet: PlanPacketLike,
	width: number,
): string[] {
	const lines: string[] = [];
	const w = Math.max(40, width - 2);
	const add = (s: string) => {
		for (const part of wrapLine(s, w)) lines.push(part);
	};

	lines.push(`plan_id: ${packet.plan_id ?? "?"}`);
	lines.push(`task_id: ${packet.task_id ?? "?"}`);
	lines.push(
		riskBadge(
			typeof packet.risk_level === "string" ? packet.risk_level : undefined,
		),
	);
	lines.push("");
	lines.push("scope:");
	add(String(packet.scope ?? ""));
	lines.push("");

	const assumptions = Array.isArray(packet.assumptions)
		? (packet.assumptions as string[])
		: [];
	if (assumptions.length > 0) {
		lines.push("assumptions:");
		for (const a of assumptions) {
			add(`  • ${a}`);
		}
		lines.push("");
	}

	const checks = Array.isArray(packet.acceptance_checks)
		? (packet.acceptance_checks as string[])
		: [];
	if (checks.length > 0) {
		lines.push("acceptance_checks:");
		for (let i = 0; i < checks.length; i++) {
			add(`  ${i + 1}. ${checks[i]}`);
		}
		lines.push("");
	}

	const rollback = packet.rollback_plan as
		| {
				rollback_artifacts?: {
					revert_command?: string;
					revert_branch?: string;
					patch_bundle?: string;
				};
		  }
		| undefined;
	const artifacts = rollback?.rollback_artifacts;
	if (artifacts) {
		lines.push("rollback:");
		if (artifacts.revert_command) {
			add(`  revert_command: ${artifacts.revert_command}`);
		}
		if (artifacts.revert_branch) {
			add(`  revert_branch: ${artifacts.revert_branch}`);
		}
		if (artifacts.patch_bundle) {
			add(`  patch_bundle: ${artifacts.patch_bundle}`);
		}
	}

	return lines;
}
