/**
 * harness-web-tools — WRS web_search, web_fetch, web_find_similar, web_contents.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { claimHarnessGovernanceLoad } from "../lib/extension-load-guard.js";
import {
	rememberSessionWebArtifactDir,
	resolveWebOutputPath,
	type WebArtifactScope,
	webArtifactScopeHint,
} from "../lib/harness-web/artifacts.js";
import {
	type FetchCacheContext,
	fingerprintFile,
	formatCacheAge,
	lookupFetchCache,
	lookupSearchCache,
	publishWorkspaceAlias,
	type SearchCacheContext,
	writeFetchCacheEntry,
	writeSearchCacheEntry,
} from "../lib/harness-web/cache.js";
import {
	harnessWebContextLine,
	readTextExcerpt,
	runHarnessWeb,
	summarizeDeepSearchJson,
	summarizeSearchJson,
} from "../lib/harness-web/run-cli.js";

const MODULE_URL = import.meta.url;

const WEB_SEARCH_GUIDELINES = [
	"DEFAULT tier=deep for landscape, prior art, comparisons, planning research, or any multi-source question.",
	"Before deep (research): spawn harness/web-retrieval/web-query-expander → <artifactDir>/angles.yaml → anglesFile on web_search.",
	"Latency: tier=instant|standard with NO expander; or web-query-expander-fast (2–3 angles); or expandHeuristic:true (no LLM).",
	"tier=standard ONLY for one narrow fact or after search-deep.json exists.",
	"tier=instant ONLY when latency-critical and the question is closed-form.",
	"Set HARNESS_WEB_FAST_MODEL / HARNESS_WEB_EXPANDER_MODEL / HARNESS_WEB_QUALITY_MODEL env (provider/model-id) for web subagents (web-retrieval skill).",
	"Never run 3+ web_search calls with different queries; use one deep search instead.",
	"After deep: read <artifactDir>/search-deep.json; web_fetch with highlights:true before full scrape.",
	"bulk:true only when you need immediate markdown for top N URLs.",
	"Library docs: context7 only, not web_search.",
	"Never preflight UP_PKG, ls harness-web.py, or python3 -c import scrapling before searching.",
];

const WEB_FETCH_GUIDELINES = [
	"Prefer highlights:true + highlightQuery after deep search before full page markdown.",
	"Use web_fetch for page markdown or same-host link maps — never curl/wget the URL.",
	"Never use raw scrapling CLI for fetch; harness-web handles Scrapling bootstrap.",
	"Library API documentation → context7 only, not web_fetch.",
	"Set fast:true for static docs (example.com, raw HTML docs, localhost).",
];

const WEB_FIND_SIMILAR_GUIDELINES = [
	"Use when you have a good seed URL and want more pages like it (Exa findSimilar analog).",
	"Prefer over manually re-phrasing the same intent in multiple web_search calls.",
	"Output is search-deep.json shape; follow with web_fetch highlights on top hits.",
];

const WEB_CONTENTS_GUIDELINES = [
	"Batch-fetch URLs after deep search — pass fromSearch pointing at search-deep.json.",
	"Use after web_search(tier=deep), not instead of deep search.",
	"Set highlights:true when building an evidence bundle for web-answerer.",
];

const WebScopeSchema = Type.Optional(
	Type.String({
		description:
			"WRS workspace directory (default .web/; set HARNESS_WEB_ISOLATE=1 for per-run/session dirs)",
	}),
);

const WebCacheControlSchema = {
	refreshCache: Type.Optional(
		Type.Boolean({
			description: "Bypass pooled .web/cache and refetch from the network",
			default: false,
		}),
	),
	cacheMaxAge: Type.Optional(
		Type.Number({
			description: "Reuse cache entry only if younger than this many seconds",
			minimum: 60,
		}),
	),
};

const WebSearchSchema = Type.Object({
	query: Type.String({ description: "Search query or research intent" }),
	webScope: WebScopeSchema,
	tier: Type.Optional(
		Type.Union(
			[
				Type.Literal("instant"),
				Type.Literal("standard"),
				Type.Literal("deep"),
				Type.Literal("research"),
			],
			{
				description:
					"WRS tier: deep (default for research), standard (narrow follow-up), instant (fast fact)",
				default: "deep",
			},
		),
	),
	anglesFile: Type.Optional(
		Type.String({
			description:
				"Path to angles YAML from web-query-expander (required for tier=deep unless angles provided)",
		}),
	),
	angles: Type.Optional(
		Type.Array(Type.String(), {
			description: "Inline search queries (one per angle); skips anglesFile",
			minItems: 2,
			maxItems: 8,
		}),
	),
	category: Type.Optional(
		Type.String({
			description: "Expander hint: code|company|people|paper|news",
		}),
	),
	expandHeuristic: Type.Optional(
		Type.Boolean({
			description: "Emergency angle templates without expander (fallback only)",
			default: false,
		}),
	),
	limit: Type.Optional(
		Type.Number({
			description:
				"Max results (tier defaults: instant 5, standard 10, deep 10)",
			minimum: 1,
			maximum: 20,
		}),
	),
	output: Type.Optional(
		Type.String({
			description:
				"Output path (default .web/search-deep.json for deep, .web/search.json otherwise)",
		}),
	),
	bulk: Type.Optional(
		Type.Boolean({
			description:
				"If true, run bulk-scrape (search then scrape top URLs to output directory)",
			default: false,
		}),
	),
	...WebCacheControlSchema,
});

const WebFetchSchema = Type.Object({
	url: Type.String({ description: "URL to fetch" }),
	webScope: WebScopeSchema,
	mode: Type.Optional(
		Type.Union([Type.Literal("scrape"), Type.Literal("map")], {
			description: "scrape (markdown) or map (same-host links JSON)",
			default: "scrape",
		}),
	),
	output: Type.Optional(
		Type.String({ description: "Output file path under .web/" }),
	),
	fast: Type.Optional(
		Type.Boolean({
			description: "Use fast HTTP scrape (static/simple pages)",
			default: false,
		}),
	),
	highlights: Type.Optional(
		Type.Boolean({
			description: "Extract query-aligned excerpts to highlights JSON",
			default: false,
		}),
	),
	highlightQuery: Type.Optional(
		Type.String({
			description: "Query for highlight scoring (required if highlights)",
		}),
	),
	highlightsOutput: Type.Optional(
		Type.String({
			description: "Highlights JSON path (default .web/highlights.json)",
		}),
	),
	limit: Type.Optional(
		Type.Number({
			description: "For map mode: max links (default 100)",
			minimum: 1,
			maximum: 500,
		}),
	),
	...WebCacheControlSchema,
});

const WebFindSimilarSchema = Type.Object({
	url: Type.String({ description: "Seed URL to find similar pages for" }),
	webScope: WebScopeSchema,
	limit: Type.Optional(
		Type.Number({ description: "Max fused results", minimum: 1, maximum: 20 }),
	),
	output: Type.Optional(
		Type.String({ description: "Output JSON (default .web/search-deep.json)" }),
	),
	fast: Type.Optional(
		Type.Boolean({
			description: "Fast HTTP for seed page fetch",
			default: true,
		}),
	),
});

const WebContentsSchema = Type.Object({
	webScope: WebScopeSchema,
	urls: Type.Optional(
		Type.Array(Type.String(), {
			description: "URLs to fetch (or use fromSearch)",
		}),
	),
	fromSearch: Type.Optional(
		Type.String({
			description: "search.json or search-deep.json to read URLs from",
		}),
	),
	outputDir: Type.Optional(
		Type.String({ description: "Output directory (default .web/contents)" }),
	),
	limit: Type.Optional(
		Type.Number({ description: "Max URLs to fetch", minimum: 1, maximum: 10 }),
	),
	highlights: Type.Optional(Type.Boolean({ default: false })),
	highlightQuery: Type.Optional(Type.String()),
	evidenceBundle: Type.Optional(
		Type.String({
			description: "Write evidence-bundle.json (requires fromSearch)",
		}),
	),
	fast: Type.Optional(Type.Boolean({ default: false })),
});

function failResult(text: string) {
	return {
		content: [{ type: "text" as const, text }],
		details: { ok: false },
	};
}

function okResult(text: string, details: Record<string, unknown> = {}) {
	return {
		content: [{ type: "text" as const, text }],
		details: { ok: true, ...details },
	};
}

type WebToolCtx = {
	cwd?: string;
	sessionManager?: { getSessionId(): string };
};

function sessionCwd(ctx: WebToolCtx): string {
	return ctx.cwd ?? process.cwd();
}

function piSessionId(ctx: WebToolCtx): string {
	return ctx.sessionManager?.getSessionId?.() ?? "default";
}

function resolveScopedOutput(
	ctx: WebToolCtx,
	basename: string,
	explicitOutput?: string,
	webScope?: string,
): { output: string; artifactDir: string; scope: WebArtifactScope } {
	const cwd = sessionCwd(ctx);
	const sessionId = piSessionId(ctx);
	const resolved = resolveWebOutputPath({
		projectRoot: cwd,
		piSessionId: sessionId,
		basename,
		explicitOutput,
		webScope,
	});
	rememberSessionWebArtifactDir(sessionId, resolved.artifactDir);
	return {
		output: resolved.path,
		artifactDir: resolved.artifactDir,
		scope: resolved.scope,
	};
}

function ensureParentDir(cwd: string, filePath: string): void {
	mkdirSync(dirname(resolve(cwd, filePath)), { recursive: true });
}

function searchEngineId(): string {
	return process.env.HARNESS_WEB_SEARCH_ENGINE?.trim() || "ddg_html";
}

function cacheControlFromParams(params: {
	refreshCache?: boolean;
	cacheMaxAge?: number;
}): { refresh: boolean; maxAgeSec?: number } {
	return {
		refresh: params.refreshCache === true,
		maxAgeSec:
			typeof params.cacheMaxAge === "number" ? params.cacheMaxAge : undefined,
	};
}

function resolveTier(params: { tier?: string; bulk?: boolean }): string {
	if (params.bulk) return "standard";
	const t = String(params.tier ?? "deep").trim();
	if (["instant", "standard", "deep", "research"].includes(t)) return t;
	return "deep";
}

function executeWebSearchBulk(args: {
	ctx: any;
	cwd: string;
	webScope: string | undefined;
	query: string;
	limit: number | undefined;
	outputParam: unknown;
}) {
	const bulkScoped = resolveScopedOutput(
		args.ctx,
		"bulk",
		args.outputParam ? `${args.outputParam}` : undefined,
		args.webScope,
	);
	const output = bulkScoped.output.endsWith("/bulk")
		? bulkScoped.output
		: `${bulkScoped.artifactDir}/bulk`;
	ensureParentDir(args.cwd, output);
	const lim = args.limit ?? 3;
	const argv = [
		"bulk-scrape",
		args.query,
		"-o",
		output,
		"--limit",
		String(lim),
	];
	const run = runHarnessWeb(MODULE_URL, argv, args.cwd);
	if (!run.ok) {
		return failResult(
			`web_search bulk failed (exit ${run.exitCode}).\n${run.stderr || run.stdout}`,
		);
	}
	return okResult(
		`${run.stdout}\n\noutput: ${output}\nartifactDir: ${bulkScoped.artifactDir}`,
		{
			output,
			artifactDir: bulkScoped.artifactDir,
			query: args.query,
			bulk: true,
		},
	);
}

function resolveAnglesFile(args: {
	params: any;
	ctx: any;
	cwd: string;
	query: string;
	webScope: string | undefined;
}): string {
	let anglesFile = String(args.params.anglesFile ?? "").trim();
	if (anglesFile && !anglesFile.startsWith("/") && !anglesFile.includes("..")) {
		anglesFile = resolveScopedOutput(
			args.ctx,
			"angles.yaml",
			anglesFile,
			args.webScope,
		).output;
	}
	if (args.params.angles?.length && !anglesFile) {
		const inline = resolveScopedOutput(
			args.ctx,
			"angles-inline.yaml",
			undefined,
			args.webScope,
		);
		const tmp = resolve(args.cwd, inline.output);
		ensureParentDir(args.cwd, inline.output);
		const yaml =
			`intent: ${JSON.stringify(args.query)}\nangles:\n` +
			args.params.angles
				.map(
					(q: string, i: number) =>
						`  - id: angle_${i + 1}\n    query: ${JSON.stringify(q)}`,
				)
				.join("\n") +
			"\n";
		writeFileSync(tmp, yaml, "utf-8");
		anglesFile = inline.output;
	}
	return anglesFile;
}

function tryWebSearchCacheHit(args: {
	refreshCache: boolean;
	cwd: string;
	searchCtx: SearchCacheContext;
	maxAgeSec?: number;
	basename: string;
	scopedArtifactDir: string;
	tier: string;
	query: string;
	engine: string;
}): ReturnType<typeof okResult> | null {
	if (args.refreshCache) return null;
	const cached = lookupSearchCache(args.cwd, args.searchCtx, {
		maxAgeSec: args.maxAgeSec,
	});
	if (!(cached.hit && !cached.stale)) return null;
	const workspaceOutput = publishWorkspaceAlias(
		args.cwd,
		cached.artifactPath,
		args.basename,
	);
	const parts = [
		`[cache hit] age ${formatCacheAge(cached.ageMs)} · key ${cached.cacheKey}`,
		`cache: ${cached.entryDir}`,
	];
	const summary =
		args.tier === "deep" || args.tier === "research"
			? summarizeDeepSearchJson(workspaceOutput, args.cwd)
			: summarizeSearchJson(workspaceOutput, args.cwd);
	if (summary) parts.push("", summary);
	parts.push(
		"",
		`output: ${workspaceOutput}`,
		`artifactDir: ${args.scopedArtifactDir}`,
		`tier: ${args.tier}`,
	);
	parts.push("Read output JSON; web_fetch top URLs with highlights:true.");
	return okResult(parts.join("\n"), {
		output: workspaceOutput,
		artifactDir: args.scopedArtifactDir,
		query: args.query,
		tier: args.tier,
		engine: args.engine,
		cacheHit: true,
		cacheKey: cached.cacheKey,
		cachePath: cached.artifactPath,
		cacheAgeMs: cached.ageMs,
	});
}

function buildWebSearchArgv(args: {
	tier: string;
	query: string;
	output: string;
	resultLimit: number;
	anglesFile: string;
	expandHeuristic: boolean;
	category?: string;
	limit?: number;
}): string[] {
	if (args.tier === "deep" || args.tier === "research") {
		const argv = [
			"search-deep",
			args.query,
			"-o",
			args.output,
			"--limit",
			String(args.resultLimit),
		];
		if (args.anglesFile) {
			argv.push("--angles-file", args.anglesFile);
		} else if (args.expandHeuristic) {
			argv.push("--expand-heuristic");
		}
		if (args.category) argv.push("--category", args.category);
		return argv;
	}
	return [
		"search",
		args.query,
		"-o",
		args.output,
		"--tier",
		args.tier,
		...(args.limit != null ? ["--limit", String(args.limit)] : []),
	];
}

async function executeWebSearch(params: any, ctx: any) {
	const cwd = sessionCwd(ctx);
	const webScope = String(params.webScope ?? "").trim() || undefined;
	const query = String(params.query ?? "").trim();
	if (!query) return failResult("web_search: query is required.");

	const tier = resolveTier(params);
	const bulk = params.bulk === true;
	const limit = typeof params.limit === "number" ? params.limit : undefined;

	if (bulk) {
		return executeWebSearchBulk({
			ctx,
			cwd,
			webScope,
			query,
			limit,
			outputParam: params.output,
		});
	}

	const basename =
		tier === "deep" || tier === "research" ? "search-deep.json" : "search.json";
	const scoped = resolveScopedOutput(
		ctx,
		basename,
		params.output ? String(params.output) : undefined,
		webScope,
	);
	const output = scoped.output;
	ensureParentDir(cwd, output);
	const { refresh: refreshCache, maxAgeSec } = cacheControlFromParams(params);
	const engine = searchEngineId();
	const resultLimit = limit ?? 10;
	const category = params.category ? String(params.category) : undefined;

	const anglesFile = resolveAnglesFile({
		params,
		ctx,
		cwd,
		query,
		webScope,
	});

	if (
		(tier === "deep" || tier === "research") &&
		!anglesFile &&
		params.expandHeuristic !== true &&
		!params.angles?.length
	) {
		return failResult(
			"web_search tier=deep requires anglesFile (.web/angles.yaml from harness/web-retrieval/web-query-expander) " +
				"or expandHeuristic:true. Invoke web-retrieval skill first.",
		);
	}

	const anglesFingerprint = anglesFile
		? fingerprintFile(cwd, anglesFile)
		: undefined;

	const searchCtx: SearchCacheContext = {
		query,
		tier,
		engine,
		limit: resultLimit,
		category,
		expandHeuristic: params.expandHeuristic === true,
		anglesFingerprint,
	};

	const cacheHit = tryWebSearchCacheHit({
		refreshCache,
		cwd,
		searchCtx,
		maxAgeSec,
		basename,
		scopedArtifactDir: scoped.artifactDir,
		tier,
		query,
		engine,
	});
	if (cacheHit) return cacheHit;

	const argv = buildWebSearchArgv({
		tier,
		query,
		output,
		resultLimit,
		anglesFile,
		expandHeuristic: params.expandHeuristic === true,
		category,
		limit,
	});

	const run = runHarnessWeb(MODULE_URL, argv, cwd);
	if (!run.ok) {
		const hint =
			"\n\nHints: run /harness-setup; for searxng set HARNESS_WEB_SEARXNG_URL; " +
			"enable json in SearXNG search.formats; for deep spawn web-query-expander first.";
		return failResult(
			`web_search failed (exit ${run.exitCode}).\n${run.stderr || run.stdout}${hint}`,
		);
	}

	const cacheWrite = writeSearchCacheEntry(cwd, searchCtx, output, {
		anglesPath: anglesFile,
	});
	publishWorkspaceAlias(cwd, `${cacheWrite.entryDir}/${basename}`, basename);

	const parts = [run.stdout];
	const summary =
		tier === "deep" || tier === "research"
			? summarizeDeepSearchJson(output, cwd)
			: summarizeSearchJson(output, cwd);
	if (summary) parts.push("", summary);
	parts.push(
		"",
		`output: ${output}`,
		`artifactDir: ${scoped.artifactDir}`,
		`tier: ${tier}`,
		`cache: ${cacheWrite.entryDir}`,
	);
	parts.push("Read output JSON; web_fetch top URLs with highlights:true.");

	return okResult(parts.join("\n"), {
		output,
		artifactDir: scoped.artifactDir,
		query,
		tier,
		engine,
		cacheHit: false,
		cacheKey: cacheWrite.cacheKey,
		cachePath: `${cacheWrite.entryDir}/${basename}`,
	});
}

async function executeWebFetch(params: any, ctx: any) {
	const cwd = sessionCwd(ctx);
	const webScope = String(params.webScope ?? "").trim() || undefined;
	const url = String(params.url ?? "").trim();
	if (!url) return failResult("web_fetch: url is required.");

	const mode = params.mode === "map" ? "map" : "scrape";
	const fast = params.fast === true;
	const limit = typeof params.limit === "number" ? params.limit : 100;
	const basename = mode === "map" ? "map.json" : "page.md";
	const scoped = resolveScopedOutput(
		ctx,
		basename,
		params.output ? String(params.output) : undefined,
		webScope,
	);
	const output = scoped.output;
	ensureParentDir(cwd, output);
	const highlights = params.highlights === true;
	const hlQuery = String(params.highlightQuery ?? "").trim();
	const { refresh: refreshCache, maxAgeSec } = cacheControlFromParams(params);

	const hlScoped =
		highlights && !params.highlightsOutput
			? resolveScopedOutput(ctx, "highlights.json", undefined, webScope)
			: highlights
				? resolveScopedOutput(
						ctx,
						"highlights.json",
						String(params.highlightsOutput),
						webScope,
					)
				: undefined;
	if (hlScoped) ensureParentDir(cwd, hlScoped.output);

	const fetchCtx: FetchCacheContext = {
		url,
		mode,
		fast,
		highlightQuery: hlQuery || undefined,
		highlights,
	};

	if (!refreshCache) {
		const cached = lookupFetchCache(cwd, fetchCtx, { maxAgeSec });
		if (cached.hit && !cached.stale) {
			const workspaceBasename = highlights
				? "highlights.json"
				: mode === "map"
					? "map.json"
					: "page.md";
			const workspaceOutput = publishWorkspaceAlias(
				cwd,
				cached.artifactPath,
				workspaceBasename,
			);
			const parts = [
				`[cache hit] age ${formatCacheAge(cached.ageMs)} · key ${cached.cacheKey}`,
				`cache: ${cached.entryDir}`,
				"",
				`output: ${workspaceOutput}`,
				`artifactDir: ${scoped.artifactDir}`,
			];
			const excerpt = readTextExcerpt(workspaceOutput, cwd);
			if (excerpt) parts.push("", "--- excerpt ---", excerpt);
			return okResult(parts.join("\n"), {
				output: workspaceOutput,
				artifactDir: scoped.artifactDir,
				url,
				mode,
				highlights,
				cacheHit: true,
				cacheKey: cached.cacheKey,
				cachePath: cached.artifactPath,
			});
		}
	}

	let argv: string[];
	if (mode === "map") {
		argv = [
			"map",
			url,
			"-o",
			output,
			"--limit",
			String(limit),
			...(fast ? ["--fast"] : []),
		];
	} else {
		argv = ["scrape", url, "-o", output, ...(fast ? ["--fast"] : [])];
		if (highlights) {
			if (!hlQuery) {
				return failResult(
					"web_fetch: highlightQuery required when highlights=true",
				);
			}
			argv.push("--highlights", "--highlight-query", hlQuery);
			if (hlScoped) argv.push("--highlights-output", hlScoped.output);
		}
	}

	const run = runHarnessWeb(MODULE_URL, argv, cwd);
	if (!run.ok) {
		return failResult(
			`web_fetch failed (exit ${run.exitCode}).\n${run.stderr || run.stdout}\n` +
				"Try fast:true for static pages, or run harness-cli-verify for Scrapling install.",
		);
	}

	const cacheArtifact = highlights && hlScoped ? hlScoped.output : output;
	const cacheWrite = writeFetchCacheEntry(cwd, fetchCtx, cacheArtifact, {
		highlightsPath:
			highlights && hlScoped && hlScoped.output !== cacheArtifact
				? hlScoped.output
				: undefined,
	});
	const workspaceBasename = highlights
		? "highlights.json"
		: mode === "map"
			? "map.json"
			: "page.md";
	publishWorkspaceAlias(
		cwd,
		`${cacheWrite.entryDir}/${workspaceBasename}`,
		workspaceBasename,
	);

	const parts = [
		run.stdout,
		"",
		`output: ${output}`,
		`artifactDir: ${scoped.artifactDir}`,
		`cache: ${cacheWrite.entryDir}`,
	];
	const excerpt = readTextExcerpt(output, cwd);
	if (excerpt) parts.push("", "--- excerpt ---", excerpt);

	return okResult(parts.join("\n"), {
		output,
		artifactDir: scoped.artifactDir,
		url,
		mode,
		highlights,
		cacheHit: false,
		cacheKey: cacheWrite.cacheKey,
		cachePath: `${cacheWrite.entryDir}/${workspaceBasename}`,
	});
}

async function executeWebFindSimilar(params: any, ctx: any) {
	const cwd = sessionCwd(ctx);
	const webScope = String(params.webScope ?? "").trim() || undefined;
	const url = String(params.url ?? "").trim();
	if (!url) return failResult("web_find_similar: url is required.");

	const scoped = resolveScopedOutput(
		ctx,
		"search-deep.json",
		params.output ? String(params.output) : undefined,
		webScope,
	);
	const output = scoped.output;
	ensureParentDir(cwd, output);
	const limit = typeof params.limit === "number" ? params.limit : 10;
	const argv = [
		"find-similar",
		url,
		"-o",
		output,
		"--limit",
		String(limit),
		...(params.fast !== false ? ["--fast"] : []),
	];

	const run = runHarnessWeb(MODULE_URL, argv, cwd);
	if (!run.ok) {
		return failResult(
			`web_find_similar failed (exit ${run.exitCode}).\n${run.stderr || run.stdout}`,
		);
	}

	const parts = [run.stdout];
	const summary = summarizeDeepSearchJson(output, cwd);
	if (summary) parts.push("", summary);
	parts.push("", `output: ${output}`, `artifactDir: ${scoped.artifactDir}`);

	return okResult(parts.join("\n"), {
		output,
		artifactDir: scoped.artifactDir,
		url,
	});
}

async function executeWebContents(params: any, ctx: any) {
	const cwd = sessionCwd(ctx);
	const webScope = String(params.webScope ?? "").trim() || undefined;
	const dirScoped = resolveScopedOutput(
		ctx,
		"contents",
		params.outputDir ? String(params.outputDir) : undefined,
		webScope,
	);
	const outputDir = dirScoped.output.endsWith("/contents")
		? dirScoped.output
		: `${dirScoped.artifactDir}/contents`;
	mkdirSync(resolve(cwd, outputDir), { recursive: true });
	let fromSearch = String(params.fromSearch ?? "").trim();
	if (fromSearch && !fromSearch.startsWith("/") && !fromSearch.includes("..")) {
		fromSearch = resolveScopedOutput(
			ctx,
			"search-deep.json",
			fromSearch,
			webScope,
		).output;
	}
	const urls = (params.urls ?? [])
		.map((u: unknown) => String(u).trim())
		.filter(Boolean);
	const limit = typeof params.limit === "number" ? params.limit : 5;
	const hlQuery = String(params.highlightQuery ?? "").trim();

	const argv = [
		"contents-batch",
		"-o",
		outputDir,
		"--limit",
		String(limit),
		...(params.fast ? ["--fast"] : []),
		...(params.highlights && hlQuery
			? ["--highlights", "--highlight-query", hlQuery]
			: []),
		...urls,
	];
	if (fromSearch) {
		argv.splice(1, 0, "--from-search", fromSearch);
	}
	let evidencePath: string | undefined;
	if (params.evidenceBundle && fromSearch) {
		const bundleArg = String(params.evidenceBundle);
		evidencePath =
			bundleArg.startsWith("/") || bundleArg.includes("..")
				? bundleArg
				: resolveScopedOutput(ctx, "evidence-bundle.json", bundleArg, webScope)
						.output;
		ensureParentDir(cwd, evidencePath);
		argv.push("--evidence-bundle", evidencePath);
	}

	if (!fromSearch && !urls.length) {
		return failResult("web_contents: provide urls or fromSearch");
	}

	const run = runHarnessWeb(MODULE_URL, argv, cwd);
	if (!run.ok) {
		return failResult(
			`web_contents failed (exit ${run.exitCode}).\n${run.stderr || run.stdout}`,
		);
	}

	return okResult(
		`${run.stdout}\n\noutputDir: ${outputDir}\nartifactDir: ${dirScoped.artifactDir}` +
			(evidencePath ? `\nevidence: ${evidencePath}` : ""),
		{
			outputDir,
			artifactDir: dirScoped.artifactDir,
			fromSearch,
			evidenceBundle: evidencePath,
		},
	);
}

export default function harnessWebTools(pi: ExtensionAPI) {
	if (!claimHarnessGovernanceLoad("harness-web-tools", MODULE_URL)) return;
	pi.on("before_agent_start", async (event, ctx) => {
		const cwd = sessionCwd(ctx);
		const sessionId = piSessionId(ctx);
		const scope = resolveWebOutputPath({
			projectRoot: cwd,
			piSessionId: sessionId,
			basename: "angles.yaml",
		}).scope;
		rememberSessionWebArtifactDir(sessionId, scope.artifactDir);
		return {
			systemPrompt: `${event.systemPrompt}\n\n${harnessWebContextLine()}\n${webArtifactScopeHint(scope)}`,
		};
	});

	pi.registerTool({
		name: "web_search",
		label: "Web Search",
		description:
			"Multi-tier web retrieval (WRS). Default tier=deep for research: parallel angle queries, RRF fusion. " +
			"Use tier=standard only for narrow follow-ups. Requires anglesFile from web-query-expander for deep.",
		promptSnippet: "tier=deep + anglesFile; not bare SERP",
		promptGuidelines: WEB_SEARCH_GUIDELINES,
		parameters: WebSearchSchema,

		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeWebSearch(params as Record<string, unknown>, ctx);
		},
	});

	pi.registerTool({
		name: "web_fetch",
		label: "Web Fetch",
		description:
			"Fetch URL content via Scrapling. Prefer highlights:true after deep search before full markdown.",
		promptSnippet: "Scrape/map; highlights first after deep",
		promptGuidelines: WEB_FETCH_GUIDELINES,
		parameters: WebFetchSchema,

		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeWebFetch(params as Record<string, unknown>, ctx);
		},
	});

	pi.registerTool({
		name: "web_find_similar",
		label: "Web Find Similar",
		description:
			"Find pages similar to a seed URL (Exa findSimilar analog). Outputs fused search-deep.json.",
		promptSnippet: "Similar pages from seed URL",
		promptGuidelines: WEB_FIND_SIMILAR_GUIDELINES,
		parameters: WebFindSimilarSchema,

		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeWebFindSimilar(params as Record<string, unknown>, ctx);
		},
	});

	pi.registerTool({
		name: "web_contents",
		label: "Web Contents Batch",
		description:
			"Batch-fetch URLs from search-deep.json into markdown (+ optional highlights). Builds evidence bundle.",
		promptSnippet: "Batch fetch after deep search",
		promptGuidelines: WEB_CONTENTS_GUIDELINES,
		parameters: WebContentsSchema,

		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeWebContents(params as Record<string, unknown>, ctx);
		},
	});
}
