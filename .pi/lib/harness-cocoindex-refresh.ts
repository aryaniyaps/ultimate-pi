/**
 * Incremental CocoIndex refresh before harness subagent batches (plan/execute).
 * Agents use `ccc search` only; harness owns `ccc index`.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_TIMEOUT_MS = 120_000;
const MARKER_REL = join(".cocoindex_code", ".harness-last-index.json");

interface IndexMarker {
	indexed_at_ms: number;
	git_head: string | null;
	porcelain_empty: boolean;
}

function readMarker(cwd: string): IndexMarker | null {
	const path = join(cwd, MARKER_REL);
	try {
		return JSON.parse(readFileSync(path, "utf8")) as IndexMarker;
	} catch {
		return null;
	}
}

function writeMarker(cwd: string, marker: IndexMarker): void {
	const path = join(cwd, MARKER_REL);
	writeFileSync(path, `${JSON.stringify(marker, null, 2)}\n`, "utf8");
}

function gitHead(cwd: string): string | null {
	const r = spawnSync("git", ["rev-parse", "HEAD"], {
		cwd,
		encoding: "utf8",
		stdio: "pipe",
	});
	if (r.status !== 0) return null;
	return (r.stdout ?? "").trim() || null;
}

function gitPorcelainEmpty(cwd: string): boolean {
	const r = spawnSync("git", ["status", "--porcelain"], {
		cwd,
		encoding: "utf8",
		stdio: "pipe",
	});
	if (r.status !== 0) return false;
	return !(r.stdout ?? "").trim();
}

function shouldSkipIndex(cwd: string, forceExecuteRefresh: boolean): boolean {
	if (forceExecuteRefresh) return false;
	if (process.env.HARNESS_COCOINDEX_REFRESH === "0") return true;

	const debounceMs = Number(
		process.env.HARNESS_COCOINDEX_REFRESH_DEBOUNCE_MS ?? 300_000,
	);
	if (!Number.isFinite(debounceMs) || debounceMs <= 0) return false;

	const marker = readMarker(cwd);
	if (!marker) return false;

	const age = Date.now() - marker.indexed_at_ms;
	if (age >= debounceMs) return false;

	const head = gitHead(cwd);
	const porcelainEmpty = gitPorcelainEmpty(cwd);
	if (!porcelainEmpty) return false;
	if (head && marker.git_head && head !== marker.git_head) return false;

	console.error(
		`harness-cocoindex: skip ccc index (debounced ${Math.round(age / 1000)}s ago, git clean)`,
	);
	return true;
}

export function refreshHarnessCocoindexIndex(
	cwd: string,
	opts?: { forceExecuteRefresh?: boolean },
): string | undefined {
	if (process.env.HARNESS_COCOINDEX_REFRESH === "0") {
		return undefined;
	}
	const settingsPath = join(cwd, ".cocoindex_code", "settings.yml");
	if (!existsSync(settingsPath)) {
		return undefined;
	}

	if (shouldSkipIndex(cwd, opts?.forceExecuteRefresh === true)) {
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

	writeMarker(cwd, {
		indexed_at_ms: Date.now(),
		git_head: gitHead(cwd),
		porcelain_empty: gitPorcelainEmpty(cwd),
	});

	return undefined;
}
