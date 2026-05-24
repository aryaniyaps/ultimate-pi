import type { PlanPacketLike } from "../harness-run-context.js";
import { stringifyYaml } from "../harness-yaml.js";

/** Canonical YAML for plan_packet (same shape as plan-packet.yaml on disk). */
export function formatPlanPacketYaml(packet: PlanPacketLike): string {
	return stringifyYaml(packet).trimEnd();
}

/** Line array for TUI renderers; preserves YAML structure with optional per-line width cap. */
export function formatPlanPacketLines(
	packet: PlanPacketLike,
	width: number,
): string[] {
	const w = Math.max(40, width);
	return formatPlanPacketYaml(packet)
		.split("\n")
		.map((line) => {
			if (line.length <= w) return line;
			return `${line.slice(0, w - 1)}…`;
		});
}
