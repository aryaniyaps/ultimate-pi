/**
 * harness-posthog — thin PostHog client for harness_* domain events.
 *
 * Reuses POSTHOG_API_KEY, POSTHOG_HOST, POSTHOG_ENABLED, POSTHOG_PRIVACY_MODE.
 * Kill switch: HARNESS_TELEMETRY_ENABLED=false
 */

import { PostHog } from "posthog-node";
import { getPostHogClientOptions } from "./posthog-client.js";

export type HarnessPostHogEventName =
	| "harness_run_started"
	| "harness_run_completed"
	| "harness_phase_transition"
	| "harness_policy_violation"
	| "harness_policy_abort"
	| "harness_budget_soft_limit"
	| "harness_budget_exhausted"
	| "harness_review_integrity_block"
	| "harness_test_integrity_flag"
	| "harness_debate_round"
	| "harness_debate_consensus"
	| "harness_drift_report"
	| "harness_eval_verdict"
	| "harness_sentrux_signal"
	| "harness_observation"
	| "harness_lens_analysis_complete"
	| "harness_lens_findings"
	| "harness_lens_turn_findings"
	| "harness_subagent_spawned"
	| "harness_subagent_completed"
	| "harness_subagent_timeout"
	| "harness_subagent_result_wait"
	| "harness_subagent_setup"
	| "harness_phase_completed"
	| "harness_blackboard_op"
	| "harness_auto_compact"
	| "harness_plan_fsm"
	| "harness_plan_route";

const SCHEMA_VERSION = "1.0.0";

let client: PostHog | null = null;

function telemetryEnabled(): boolean {
	if (process.env.HARNESS_TELEMETRY_ENABLED === "false") return false;
	if (process.env.POSTHOG_ENABLED === "false") return false;
	return Boolean(process.env.POSTHOG_API_KEY?.trim());
}

function privacyMode(): boolean {
	return process.env.POSTHOG_PRIVACY_MODE === "true";
}

function getClient(): PostHog | null {
	if (!telemetryEnabled()) return null;
	if (client) return client;
	const apiKey = process.env.POSTHOG_API_KEY?.trim();
	if (!apiKey) return null;
	client = new PostHog(apiKey, getPostHogClientOptions());
	return client;
}

const PATH_LIKE_KEYS = new Set([
	"file_path",
	"filePath",
	"path",
	"targetPath",
	"artifact_refs",
	"paths",
	"evidence_refs",
]);

function redactValue(key: string, value: unknown): unknown {
	if (!privacyMode()) return value;
	if (PATH_LIKE_KEYS.has(key)) {
		if (typeof value === "string") return "[redacted]";
		if (Array.isArray(value)) return { count: value.length };
	}
	if (typeof value === "object" && value !== null && !Array.isArray(value)) {
		return redactProperties(value as Record<string, unknown>);
	}
	return value;
}

export function redactProperties(
	props: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(props)) {
		out[key] = redactValue(key, value);
	}
	return out;
}

export function captureHarnessEvent(
	distinctId: string,
	event: HarnessPostHogEventName,
	properties: Record<string, unknown>,
): void {
	const ph = getClient();
	if (!ph) return;
	const base = {
		schema_version: SCHEMA_VERSION,
		posthog_project_name:
			process.env.POSTHOG_PROJECT_NAME?.trim() || "ultimate-pi",
		pi_session_id: distinctId,
		...properties,
	};
	ph.capture({
		distinctId,
		event,
		properties: redactProperties(base),
	});
}

export async function shutdownHarnessPostHog(): Promise<void> {
	if (!client) return;
	try {
		await client.shutdown();
	} catch {
		// Best-effort telemetry — avoid noisy flush errors when offline / WSL DNS broken.
	} finally {
		client = null;
	}
}
