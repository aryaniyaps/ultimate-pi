/**
 * Incremental CocoIndex refresh before harness subagent batches (plan/execute).
 * Agents use `ccc search` only; harness owns `ccc index`.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_TIMEOUT_MS = 120_000;

export function refreshHarnessCocoindexIndex(cwd: string): string | undefined {
	if (process.env.HARNESS_COCOINDEX_REFRESH === "0") {
		return undefined;
	}
	const settingsPath = join(cwd, ".cocoindex_code", "settings.yml");
	if (!existsSync(settingsPath)) {
		return undefined;
	}

	const timeoutMs = Number(
		process.env.HARNESS_COCOINDEX_REFRESH_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS,
	);
	const result = spawnSync("ccc", ["index"], {
		cwd,
		encoding: "utf8",
		timeout: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
		stdio: "pipe",
	});

	if (result.error) {
		const msg = `harness-cocoindex: ccc index failed (${result.error.message})`;
		if (process.env.HARNESS_COCOINDEX_REFRESH_STRICT === "1") {
			return msg;
		}
		return `${msg} — continuing`;
	}

	if (result.status !== 0) {
		const stderr = (result.stderr ?? "").trim().slice(0, 500);
		const msg = `harness-cocoindex: ccc index exited ${result.status ?? "?"}${stderr ? `: ${stderr}` : ""}`;
		if (process.env.HARNESS_COCOINDEX_REFRESH_STRICT === "1") {
			return msg;
		}
		return `${msg} — continuing`;
	}

	return undefined;
}
