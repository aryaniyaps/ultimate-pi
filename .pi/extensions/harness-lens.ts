import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	captureHarnessEvent,
	type HarnessPostHogEventName,
} from "./lib/harness-posthog.js";

const LENS_EVENT_TO_POSTHOG: Record<string, HarnessPostHogEventName> = {
	"pi-lens/analysis-complete": "harness_lens_analysis_complete",
	"pi-lens/findings": "harness_lens_findings",
	"pi-lens/turn-findings": "harness_lens_turn_findings",
};

type EventBusLike = {
	on?: (event: string, handler: (payload: unknown) => void) => void;
};

function lensConfigRoot(cwd = process.cwd()): string {
	return path.join(cwd, ".pi", "harness", ".lens");
}

function configureHarnessLensPaths(): void {
	const root = lensConfigRoot();
	process.env.PI_LENS_CONFIG_PATH ??= path.join(root, "config.json");
	process.env.PILENS_DATA_DIR ??= path.join(root, "projects");
	process.env.PI_LENS_DASHBOARD = "0";
}

function toCount(value: unknown): number {
	return Array.isArray(value) ? value.length : 0;
}

function firstString(...values: unknown[]): string | undefined {
	for (const value of values) {
		if (typeof value === "string" && value.trim()) return value;
	}
	return undefined;
}

function lensPostHogProperties(
	eventName: string,
	payload: Record<string, unknown>,
): Record<string, unknown> {
	return {
		lens_event: eventName,
		lens_source: "harness-lens",
		tool_name: firstString(payload.toolName, payload.tool_name) ?? "",
		model: firstString(payload.model) ?? "unknown",
		file_path: firstString(payload.filePath, payload.file_path) ?? "",
		file_count: toCount(payload.filePaths),
		diagnostic_count: toCount(payload.diagnostics),
		blocker_count: toCount(payload.blockers),
		warning_count: toCount(payload.warnings),
		fixed_count: toCount(payload.fixed),
		resolved_count: Number(payload.resolvedCount ?? 0),
		duration_ms: Number(payload.durationMs ?? 0),
		has_blockers: Boolean(payload.hasBlockers),
		file_modified: Boolean(payload.fileModified),
		changed_file_count: toCount(payload.changedFiles),
		blocker_sections: Number(payload.blockerSections ?? 0),
		advisory_sections: Number(payload.advisorySections ?? 0),
	};
}

function installLensPostHogBridge(pi: ExtensionAPI): void {
	const bus = (pi as { events?: EventBusLike }).events;
	if (typeof bus?.on !== "function") return;

	for (const [eventName, posthogEvent] of Object.entries(
		LENS_EVENT_TO_POSTHOG,
	)) {
		bus.on(eventName, (payload: unknown) => {
			if (!payload || typeof payload !== "object") return;
			const data = payload as Record<string, unknown>;
			const distinctId =
				firstString(data.sessionId, data.pi_session_id) ?? "harness-lens";
			captureHarnessEvent(
				distinctId,
				posthogEvent,
				lensPostHogProperties(eventName, data),
			);
		});
	}
}

export default async function harnessLens(pi: ExtensionAPI) {
	configureHarnessLensPaths();
	installLensPostHogBridge(pi);

	const lens = (await import("./lib/harness-lens/index.js")) as unknown as {
		default: (pi: ExtensionAPI) => unknown;
	};
	return lens.default(pi);
}
