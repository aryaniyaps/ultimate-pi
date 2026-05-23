/**
 * harness-project-control — always-on enable/disable for harness governance.
 *
 * Writes `.pi/harness/project.json`, blocks workflow slash commands while disabled,
 * and emits `harness-project-enabled:changed` so live TUI surfaces update immediately.
 */

import type {
	ExtensionAPI,
	ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import {
	isHarnessProjectEnabled,
	isHarnessWorkflowCommand,
	readHarnessProjectConfig,
	writeHarnessProjectEnabled,
} from "../lib/harness-project-config.js";
import { parseHarnessSlashInput } from "../lib/harness-run-context.js";

function showCommandMessage(
	pi: ExtensionAPI,
	ctx: ExtensionCommandContext,
	text: string,
): void {
	if (ctx.hasUI) {
		ctx.ui.notify(text, "info");
		return;
	}
	pi.sendMessage({
		customType: "harness-project-control",
		content: text,
		display: true,
	});
}

function formatStatus(projectRoot: string): string {
	const config = readHarnessProjectConfig(projectRoot);
	const env = process.env.HARNESS_ENABLED?.trim();
	const lines = [
		`Harness governance: ${config.enabled ? "enabled" : "disabled"}`,
		`Config: .pi/harness/project.json`,
	];
	if (env) {
		lines.push(`Env override: HARNESS_ENABLED=${env}`);
	}
	if (config.updated_at) {
		lines.push(`Updated: ${config.updated_at}`);
	}
	if (!config.enabled) {
		lines.push(
			"Workflow commands (/harness-plan, /harness-run, …) are blocked until you run /harness-enable.",
		);
	} else {
		lines.push("Run /harness-disable to turn governance off.");
	}
	return lines.join("\n");
}

export default function harnessProjectControl(pi: ExtensionAPI) {
	pi.on("input", async (event) => {
		if (event.source === "extension") {
			return { action: "continue" as const };
		}
		const parsed = parseHarnessSlashInput(event.text);
		if (!parsed || !isHarnessWorkflowCommand(parsed.command)) {
			return { action: "continue" as const };
		}
		if (isHarnessProjectEnabled()) {
			return { action: "continue" as const };
		}
		return {
			action: "handled" as const,
			message: [
				`Harness governance is disabled — /${parsed.command} was not started.`,
				"Run /harness-enable to restore the workflow command surface.",
			].join("\n"),
		};
	});

	pi.registerCommand("harness-enable", {
		description: "Enable harness governance for this project",
		handler: async (_args, ctx) => {
			const projectRoot = process.cwd();
			const config = writeHarnessProjectEnabled(projectRoot, true);
			const effectiveConfig = readHarnessProjectConfig(projectRoot);
			pi.events.emit("harness-project-enabled:changed", {
				enabled: effectiveConfig.enabled,
				projectRoot,
				updated_at: config.updated_at,
			});
			showCommandMessage(
				pi,
				ctx,
				[
					"Harness governance enabled.",
					`Wrote .pi/harness/project.json (enabled=true, updated ${config.updated_at}).`,
					"Live TUI surfaces were refreshed.",
				].join("\n"),
			);
		},
	});

	pi.registerCommand("harness-disable", {
		description: "Disable harness governance for this project",
		handler: async (_args, ctx) => {
			const projectRoot = process.cwd();
			const config = writeHarnessProjectEnabled(projectRoot, false);
			const effectiveConfig = readHarnessProjectConfig(projectRoot);
			pi.events.emit("harness-project-enabled:changed", {
				enabled: effectiveConfig.enabled,
				projectRoot,
				updated_at: config.updated_at,
			});
			showCommandMessage(
				pi,
				ctx,
				[
					"Harness governance disabled.",
					`Wrote .pi/harness/project.json (enabled=false, updated ${config.updated_at}).`,
					"Workflow slash commands are blocked immediately.",
					"Live TUI surfaces were refreshed.",
				].join("\n"),
			);
		},
	});

	pi.registerCommand("harness-enabled-status", {
		description: "Show whether harness governance is enabled for this project",
		handler: async (_args, ctx) => {
			showCommandMessage(pi, ctx, formatStatus(process.cwd()));
		},
	});
}
