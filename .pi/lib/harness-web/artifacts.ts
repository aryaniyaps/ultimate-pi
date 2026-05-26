/**
 * WRS workspace paths — flat `.web/` aliases + optional per-run/session isolation.
 * Search/fetch payloads are pooled under `.web/cache/` (see cache.ts).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { activeRunPointerPath } from "../harness-run-context.js";
import { WEB_ROOT, webCacheHint } from "./cache.js";

export type WebArtifactScopeSource =
	| "explicit"
	| "run"
	| "session"
	| "workspace";

export interface WebArtifactScope {
	/** Relative path under repo root, e.g. `.web` or `.web/runs/abc` */
	artifactDir: string;
	scopeId: string;
	source: WebArtifactScopeSource;
}

function webIsolateEnabled(): boolean {
	return (
		process.env.HARNESS_WEB_ISOLATE === "1" ||
		process.env.HARNESS_WEB_LEGACY_SCOPE === "1"
	);
}

/** Parent session → last resolved artifact dir (for web-retrieval subagent env). */
const sessionArtifactDirs = new Map<string, string>();

const CANONICAL_BASENAMES = new Set([
	"angles.yaml",
	"angles-inline.yaml",
	"search-deep.json",
	"search.json",
	"evidence-bundle.json",
	"answer.md",
	"highlights.json",
	"page.md",
	"map.json",
]);

export function sanitizeWebScopeId(id: string): string {
	return id.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export function isScopedWebArtifactPath(path: string): boolean {
	const n = path.replace(/\\/g, "/");
	if (!n.startsWith(`${WEB_ROOT}/`)) return false;
	const rest = n.slice(`${WEB_ROOT}/`.length);
	const top = rest.split("/")[0];
	return top === "runs" || top === "sessions";
}

function readActiveHarnessRunId(projectRoot: string): string | null {
	const pointerPath = activeRunPointerPath(projectRoot);
	if (!existsSync(pointerPath)) return null;
	try {
		const raw = readFileSync(pointerPath, "utf-8");
		const data = JSON.parse(raw) as { run_id?: string };
		const runId = data.run_id?.trim();
		return runId || null;
	} catch {
		return null;
	}
}

export function resolveWebArtifactScope(options: {
	projectRoot: string;
	piSessionId?: string;
	explicitScope?: string;
	explicitArtifactDir?: string;
}): WebArtifactScope {
	const explicitDir =
		options.explicitArtifactDir?.trim() ||
		options.explicitScope?.trim() ||
		process.env.HARNESS_WEB_ARTIFACT_DIR?.trim() ||
		process.env.HARNESS_WEB_SCOPE?.trim();
	if (explicitDir) {
		const normalized = normalizeArtifactDir(explicitDir);
		return {
			artifactDir: normalized,
			scopeId: normalized.split("/").pop() ?? normalized,
			source: "explicit",
		};
	}

	if (webIsolateEnabled()) {
		const runId =
			process.env.HARNESS_RUN_ID?.trim() ||
			readActiveHarnessRunId(options.projectRoot);
		if (runId) {
			const id = sanitizeWebScopeId(runId);
			return {
				artifactDir: `${WEB_ROOT}/runs/${id}`,
				scopeId: id,
				source: "run",
			};
		}

		const sessionId = options.piSessionId?.trim();
		if (sessionId) {
			const id = sanitizeWebScopeId(sessionId);
			return {
				artifactDir: `${WEB_ROOT}/sessions/${id}`,
				scopeId: id,
				source: "session",
			};
		}
	}

	return {
		artifactDir: WEB_ROOT,
		scopeId: "workspace",
		source: "workspace",
	};
}

export function normalizeArtifactDir(dir: string): string {
	let n = dir.replace(/\\/g, "/").trim();
	if (n.startsWith("./")) n = n.slice(2);
	if (n === WEB_ROOT || n === `${WEB_ROOT}/`) return WEB_ROOT;
	if (!n.startsWith(`${WEB_ROOT}/`)) {
		n = `${WEB_ROOT}/${n.replace(/^\/+/, "")}`;
	}
	return n.replace(/\/+$/, "");
}

export function scopedWebArtifactPath(
	artifactDir: string,
	basename: string,
): string {
	const base = normalizeArtifactDir(artifactDir);
	if (base === WEB_ROOT) return `${WEB_ROOT}/${basename}`;
	return `${base}/${basename}`;
}

/**
 * Resolve output path: honor explicit paths; optional isolation rewrites flat canonical names.
 */
export function resolveWebOutputPath(options: {
	projectRoot: string;
	piSessionId?: string;
	basename: string;
	explicitOutput?: string;
	webScope?: string;
}): { path: string; artifactDir: string; scope: WebArtifactScope } {
	const scope = resolveWebArtifactScope({
		projectRoot: options.projectRoot,
		piSessionId: options.piSessionId,
		explicitScope: options.webScope,
	});

	const explicit = options.explicitOutput?.trim();
	if (explicit) {
		const norm = explicit.replace(/\\/g, "/");
		if (isScopedWebArtifactPath(norm)) {
			const artifactDir = norm.slice(0, norm.lastIndexOf("/"));
			return { path: norm, artifactDir, scope };
		}
		const base = norm.split("/").pop() ?? norm;
		if (
			webIsolateEnabled() &&
			scope.source !== "workspace" &&
			norm.startsWith(`${WEB_ROOT}/`) &&
			CANONICAL_BASENAMES.has(base)
		) {
			const path = scopedWebArtifactPath(scope.artifactDir, base);
			return { path, artifactDir: scope.artifactDir, scope };
		}
		return { path: norm, artifactDir: scope.artifactDir, scope };
	}

	const path = scopedWebArtifactPath(scope.artifactDir, options.basename);
	return { path, artifactDir: scope.artifactDir, scope };
}

export function rememberSessionWebArtifactDir(
	sessionId: string,
	artifactDir: string,
): void {
	if (!sessionId?.trim() || !artifactDir?.trim()) return;
	sessionArtifactDirs.set(sessionId.trim(), normalizeArtifactDir(artifactDir));
}

export function getRememberedSessionWebArtifactDir(
	sessionId: string,
): string | undefined {
	return sessionArtifactDirs.get(sessionId.trim());
}

export function webArtifactScopeHint(scope: WebArtifactScope): string {
	const isolateNote = webIsolateEnabled()
		? `Isolation on (${scope.artifactDir}/). Set HARNESS_WEB_ISOLATE=0 for shared workspace only.`
		: `Shared workspace ${scope.artifactDir}/ for angles, search-deep, answer.md. Set HARNESS_WEB_ISOLATE=1 to isolate per session/run.`;
	return `[WRS workspace] ${isolateNote} ${webCacheHint()}`;
}
