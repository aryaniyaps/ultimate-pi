/**
 * WRS local cache — pooled `.web/cache/` entries with freshness + search context.
 * Workspace aliases (`.web/search-deep.json`, …) are copies/links for agent ergonomics.
 */

import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";

export const WEB_ROOT = ".web";
export const WEB_CACHE_ROOT = `${WEB_ROOT}/cache`;

export type WebCacheKind =
	| "search"
	| "search-deep"
	| "fetch-page"
	| "fetch-map"
	| "fetch-highlights";

export interface WebCacheMeta {
	version: 1;
	kind: WebCacheKind;
	cacheKey: string;
	createdAt: string;
	expiresAt: string;
	ttlSeconds: number;
	context: Record<string, unknown>;
	artifact: string;
	hitCount: number;
}

export interface SearchCacheContext {
	query: string;
	tier: string;
	engine: string;
	limit: number;
	category?: string;
	expandHeuristic?: boolean;
	anglesFingerprint?: string;
}

export interface FetchCacheContext {
	url: string;
	mode: "scrape" | "map";
	fast: boolean;
	highlightQuery?: string;
	highlights: boolean;
}

export interface CacheLookupResult {
	hit: boolean;
	stale: boolean;
	cacheKey: string;
	entryDir: string;
	artifactPath: string;
	metaPath: string;
	meta?: WebCacheMeta;
	ageMs?: number;
}

function shaKey(payload: unknown): string {
	return createHash("sha256")
		.update(JSON.stringify(payload))
		.digest("hex")
		.slice(0, 20);
}

export function cacheEnabled(): boolean {
	const raw = process.env.HARNESS_WEB_CACHE?.trim();
	if (raw === "0" || raw?.toLowerCase() === "false") return false;
	return true;
}

export function defaultCacheTtlSeconds(): number {
	const raw = process.env.HARNESS_WEB_CACHE_TTL_SEC?.trim();
	if (raw) {
		const n = Number.parseInt(raw, 10);
		if (Number.isFinite(n) && n > 0) return n;
	}
	return 86_400; // 24h
}

export function fingerprintFile(projectRoot: string, relPath: string): string | undefined {
	const full = resolve(projectRoot, relPath);
	if (!existsSync(full)) return undefined;
	const text = readFileSync(full, "utf-8");
	return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export function searchCacheKey(ctx: SearchCacheContext): string {
	return shaKey({
		v: 1,
		kind: ctx.tier === "deep" || ctx.tier === "research" ? "search-deep" : "search",
		query: ctx.query.trim().toLowerCase(),
		tier: ctx.tier,
		engine: ctx.engine,
		limit: ctx.limit,
		category: ctx.category?.trim().toLowerCase() || null,
		expandHeuristic: Boolean(ctx.expandHeuristic),
		angles: ctx.anglesFingerprint || null,
	});
}

export function fetchCacheKey(ctx: FetchCacheContext): string {
	return shaKey({
		v: 1,
		kind: ctx.highlights ? "fetch-highlights" : ctx.mode === "map" ? "fetch-map" : "fetch-page",
		url: ctx.url.trim(),
		mode: ctx.mode,
		fast: ctx.fast,
		highlightQuery: ctx.highlightQuery?.trim() || null,
	});
}

function cacheKindFromTier(tier: string): WebCacheKind {
	return tier === "deep" || tier === "research" ? "search-deep" : "search";
}

function entryDir(projectRoot: string, kind: WebCacheKind, cacheKey: string): string {
	return `${WEB_CACHE_ROOT}/${kind}/${cacheKey}`;
}

function readMeta(metaPath: string): WebCacheMeta | undefined {
	if (!existsSync(metaPath)) return undefined;
	try {
		const data = JSON.parse(readFileSync(metaPath, "utf-8")) as WebCacheMeta;
		if (data?.version !== 1) return undefined;
		return data;
	} catch {
		return undefined;
	}
}

export function isCacheFresh(
	meta: WebCacheMeta,
	options?: { maxAgeSec?: number; nowMs?: number },
): boolean {
	const now = options?.nowMs ?? Date.now();
	const expiresAt = Date.parse(meta.expiresAt);
	if (Number.isFinite(expiresAt) && now > expiresAt) return false;
	if (options?.maxAgeSec != null && options.maxAgeSec > 0) {
		const createdAt = Date.parse(meta.createdAt);
		if (Number.isFinite(createdAt) && now - createdAt > options.maxAgeSec * 1000) {
			return false;
		}
	}
	return true;
}

function bumpHitCount(metaPath: string, meta: WebCacheMeta): void {
	const next: WebCacheMeta = { ...meta, hitCount: (meta.hitCount ?? 0) + 1 };
	writeFileSync(metaPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
}

export function lookupSearchCache(
	projectRoot: string,
	ctx: SearchCacheContext,
	options?: { maxAgeSec?: number; ttlSeconds?: number },
): CacheLookupResult {
	const cacheKey = searchCacheKey(ctx);
	const kind = cacheKindFromTier(ctx.tier);
	const relDir = entryDir(projectRoot, kind, cacheKey);
	const absDir = resolve(projectRoot, relDir);
	const artifactName = kind === "search-deep" ? "search-deep.json" : "search.json";
	const artifactPath = resolve(absDir, artifactName);
	const metaPath = resolve(absDir, "meta.json");
	const base: CacheLookupResult = {
		hit: false,
		stale: false,
		cacheKey,
		entryDir: relDir,
		artifactPath: `${relDir}/${artifactName}`,
		metaPath: `${relDir}/meta.json`,
	};
	if (!cacheEnabled() || !existsSync(artifactPath)) return base;
	const meta = readMeta(metaPath);
	if (!meta) return { ...base, hit: true, stale: true };
	const fresh = isCacheFresh(meta, {
		maxAgeSec: options?.maxAgeSec,
	});
	const createdAt = Date.parse(meta.createdAt);
	const ageMs = Number.isFinite(createdAt) ? Date.now() - createdAt : undefined;
	if (fresh) bumpHitCount(metaPath, meta);
	return {
		...base,
		hit: true,
		stale: !fresh,
		meta,
		ageMs,
	};
}

export function lookupFetchCache(
	projectRoot: string,
	ctx: FetchCacheContext,
	options?: { maxAgeSec?: number },
): CacheLookupResult {
	const cacheKey = fetchCacheKey(ctx);
	const kind: WebCacheKind = ctx.highlights
		? "fetch-highlights"
		: ctx.mode === "map"
			? "fetch-map"
			: "fetch-page";
	const relDir = entryDir(projectRoot, kind, cacheKey);
	const absDir = resolve(projectRoot, relDir);
	const artifactName = ctx.highlights
		? "highlights.json"
		: ctx.mode === "map"
			? "map.json"
			: "page.md";
	const artifactPath = resolve(absDir, artifactName);
	const metaPath = resolve(absDir, "meta.json");
	const base: CacheLookupResult = {
		hit: false,
		stale: false,
		cacheKey,
		entryDir: relDir,
		artifactPath: `${relDir}/${artifactName}`,
		metaPath: `${relDir}/meta.json`,
	};
	if (!cacheEnabled() || !existsSync(artifactPath)) return base;
	const meta = readMeta(metaPath);
	if (!meta) return { ...base, hit: true, stale: true };
	const fresh = isCacheFresh(meta, { maxAgeSec: options?.maxAgeSec });
	const createdAt = Date.parse(meta.createdAt);
	const ageMs = Number.isFinite(createdAt) ? Date.now() - createdAt : undefined;
	if (fresh) bumpHitCount(metaPath, meta);
	return {
		...base,
		hit: true,
		stale: !fresh,
		meta,
		ageMs,
	};
}

export function writeSearchCacheEntry(
	projectRoot: string,
	ctx: SearchCacheContext,
	sourceArtifactPath: string,
	options?: { anglesPath?: string; ttlSeconds?: number },
): { cacheKey: string; entryDir: string; metaPath: string } {
	const cacheKey = searchCacheKey(ctx);
	const kind = cacheKindFromTier(ctx.tier);
	const relDir = entryDir(projectRoot, kind, cacheKey);
	const absDir = resolve(projectRoot, relDir);
	mkdirSync(absDir, { recursive: true });
	const artifactName = kind === "search-deep" ? "search-deep.json" : "search.json";
	const destArtifact = resolve(absDir, artifactName);
	copyFileSync(resolve(projectRoot, sourceArtifactPath), destArtifact);
	if (options?.anglesPath && existsSync(resolve(projectRoot, options.anglesPath))) {
		copyFileSync(resolve(projectRoot, options.anglesPath), resolve(absDir, "angles.yaml"));
	}
	const ttl = options?.ttlSeconds ?? defaultCacheTtlSeconds();
	const now = new Date();
	const expires = new Date(now.getTime() + ttl * 1000);
	const meta: WebCacheMeta = {
		version: 1,
		kind,
		cacheKey,
		createdAt: now.toISOString(),
		expiresAt: expires.toISOString(),
		ttlSeconds: ttl,
		context: {
			query: ctx.query,
			tier: ctx.tier,
			engine: ctx.engine,
			limit: ctx.limit,
			category: ctx.category ?? null,
			expandHeuristic: Boolean(ctx.expandHeuristic),
			anglesFingerprint: ctx.anglesFingerprint ?? null,
		},
		artifact: artifactName,
		hitCount: 0,
	};
	const metaPath = resolve(absDir, "meta.json");
	writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf-8");
	return { cacheKey, entryDir: relDir, metaPath: `${relDir}/meta.json` };
}

export function writeFetchCacheEntry(
	projectRoot: string,
	ctx: FetchCacheContext,
	sourceArtifactPath: string,
	extra?: { highlightsPath?: string },
): { cacheKey: string; entryDir: string } {
	const cacheKey = fetchCacheKey(ctx);
	const kind: WebCacheKind = ctx.highlights
		? "fetch-highlights"
		: ctx.mode === "map"
			? "fetch-map"
			: "fetch-page";
	const relDir = entryDir(projectRoot, kind, cacheKey);
	const absDir = resolve(projectRoot, relDir);
	mkdirSync(absDir, { recursive: true });
	const artifactName = ctx.highlights
		? "highlights.json"
		: ctx.mode === "map"
			? "map.json"
			: "page.md";
	copyFileSync(resolve(projectRoot, sourceArtifactPath), resolve(absDir, artifactName));
	if (extra?.highlightsPath && existsSync(resolve(projectRoot, extra.highlightsPath))) {
		copyFileSync(
			resolve(projectRoot, extra.highlightsPath),
			resolve(absDir, "highlights.json"),
		);
	}
	const ttl = defaultCacheTtlSeconds();
	const now = new Date();
	const expires = new Date(now.getTime() + ttl * 1000);
	const meta: WebCacheMeta = {
		version: 1,
		kind,
		cacheKey,
		createdAt: now.toISOString(),
		expiresAt: expires.toISOString(),
		ttlSeconds: ttl,
		context: {
			url: ctx.url,
			mode: ctx.mode,
			fast: ctx.fast,
			highlightQuery: ctx.highlightQuery ?? null,
			highlights: ctx.highlights,
		},
		artifact: artifactName,
		hitCount: 0,
	};
	writeFileSync(
		resolve(absDir, "meta.json"),
		`${JSON.stringify(meta, null, 2)}\n`,
		"utf-8",
	);
	return { cacheKey, entryDir: relDir };
}

/** Copy cached artifact to a stable workspace path for agents (`.web/search-deep.json`, …). */
export function publishWorkspaceAlias(
	projectRoot: string,
	cacheArtifactPath: string,
	workspaceBasename: string,
): string {
	const workspacePath = `${WEB_ROOT}/${workspaceBasename}`;
	const dest = resolve(projectRoot, workspacePath);
	mkdirSync(dirname(dest), { recursive: true });
	copyFileSync(resolve(projectRoot, cacheArtifactPath), dest);
	return workspacePath;
}

export function formatCacheAge(ageMs: number | undefined): string {
	if (ageMs == null || ageMs < 0) return "unknown";
	if (ageMs < 60_000) return `${Math.round(ageMs / 1000)}s`;
	if (ageMs < 3_600_000) return `${Math.round(ageMs / 60_000)}m`;
	return `${(ageMs / 3_600_000).toFixed(1)}h`;
}

export function webCacheHint(): string {
	return (
		`[WRS cache] Pooled under ${WEB_CACHE_ROOT}/ with TTL (HARNESS_WEB_CACHE_TTL_SEC, default 24h). ` +
		`Workspace aliases: ${WEB_ROOT}/search-deep.json, ${WEB_ROOT}/angles.yaml, ${WEB_ROOT}/page.md. ` +
		`Use refreshCache:true to bypass. Same query+angles reuses SERP without network.`
	);
}
