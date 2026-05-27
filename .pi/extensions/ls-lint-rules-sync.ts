/**
 * ls-lint-rules-sync — keep .ls-lint.yml aligned with harness naming manifest.
 */

import { spawn } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { resolveHarnessScript } from "../lib/harness-paths.js";
import { isHarnessProjectEnabled } from "../lib/harness-project-config.js";
import { completeStrictFlag } from "../lib/harness-slash-completions.js";

function resolveSyncScript(): string {
	return resolveHarnessScript(
		// @ts-expect-error pi extensions run as ESM
		import.meta.url,
		"ls-lint-rules-sync.mjs",
	);
}

function runSync(args: string[]): Promise<{ code: number; output: string }> {
	const syncScript = resolveSyncScript();
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [syncScript, ...args], {
			cwd: process.cwd(),
			stdio: ["ignore", "pipe", "pipe"],
		});
		let output = "";
		child.stdout?.on("data", (d) => {
			output += d.toString();
		});
		child.stderr?.on("data", (d) => {
			output += d.toString();
		});
		child.on("close", (code) => resolve({ code: code ?? 1, output }));
		child.on("error", (err) =>
			resolve({ code: 1, output: String(err.message) }),
		);
	});
}

export default function lsLintRulesSync(pi: ExtensionAPI) {
	if (!isHarnessProjectEnabled()) return;
	pi.on("session_start", async () => {
		const { code, output } = await runSync(["--check"]);
		if (code !== 0) {
			console.warn(
				"[ls-lint-rules-sync] .ls-lint.yml out of date — run /harness-ls-lint-sync",
			);
			if (output.trim()) console.warn(output.trim());
		}
	});

	pi.on("agent_end", async (_event, ctx) => {
		const entries = ctx.sessionManager.getEntries();
		let shouldSync = false;
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i] as {
				type?: string;
				customType?: string;
				data?: { phase?: string };
			};
			if (entry.type !== "custom") continue;
			if (entry.customType === "harness-policy-state") {
				const phase = entry.data?.phase;
				if (phase === "plan" || phase === "merge") shouldSync = true;
				break;
			}
			if (entry.customType === "harness-naming-changed") {
				shouldSync = true;
				break;
			}
		}
		if (!shouldSync) return;
		const { output } = await runSync(["--force"]);
		if (output.trim()) {
			pi.appendEntry("harness-ls-lint-rules-sync", {
				synced_at: new Date().toISOString(),
				message: output.trim().split("\n").pop(),
			});
		}
	});

	pi.registerCommand("harness-ls-lint-sync", {
		description: "Regenerate .ls-lint.yml from harness naming manifest",
		getArgumentCompletions: completeStrictFlag,
		handler: async (_args, ctx) => {
			const strict = _args.includes("--strict");
			const { code, output } = await runSync(
				strict ? ["--force", "--strict"] : ["--force"],
			);
			const msg =
				output.trim() || (code === 0 ? "naming rules synced" : "sync failed");
			if (ctx.hasUI) {
				ctx.ui.notify(msg, code === 0 ? "info" : "error");
			} else {
				pi.sendMessage({
					customType: "harness-ls-lint-sync-result",
					content: msg,
					display: true,
				});
			}
		},
	});
}
