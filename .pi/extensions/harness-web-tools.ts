/**
 * harness-web-tools — web_search + web_fetch pi tools wrapping harness-web.py.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
	harnessWebContextLine,
	readTextExcerpt,
	runHarnessWeb,
	summarizeSearchJson,
} from "./lib/harness-web/run-cli.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

const WEB_SEARCH_GUIDELINES = [
	"Use web_search for open-web SERP — never preflight UP_PKG, ls harness-web.py, or python3 -c import scrapling.",
	"Never use Firecrawl, curl/wget for search, or scrapling CLI for SERP.",
	"After search, use web_fetch on URLs or read the output JSON under .web/.",
	"Use bulk:true only when you need search plus multi-page scrape in one step.",
];

const WEB_FETCH_GUIDELINES = [
	"Use web_fetch for page markdown or same-host link maps — never curl/wget the URL.",
	"Never use raw scrapling CLI for fetch; harness-web handles Scrapling bootstrap.",
	"Library API documentation → context7 only, not web_fetch.",
	"Set fast:true for static docs (example.com, raw HTML docs, localhost).",
];

const WebSearchSchema = Type.Object({
	query: Type.String({ description: "Search query" }),
	limit: Type.Optional(
		Type.Number({ description: "Max results (default 5)", minimum: 1, maximum: 20 }),
	),
	output: Type.Optional(
		Type.String({
			description: "Output path (default .web/search.json or .web/bulk for bulk)",
		}),
	),
	bulk: Type.Optional(
		Type.Boolean({
			description:
				"If true, run bulk-scrape (search then scrape top URLs to output directory)",
			default: false,
		}),
	),
});

const WebFetchSchema = Type.Object({
	url: Type.String({ description: "URL to fetch" }),
	mode: Type.Optional(
		Type.Union([Type.Literal("scrape"), Type.Literal("map")], {
			description: "scrape (markdown) or map (same-host links JSON)",
			default: "scrape",
		}),
	),
	output: Type.Optional(Type.String({ description: "Output file path under .web/" })),
	fast: Type.Optional(
		Type.Boolean({
			description: "Use fast HTTP scrape (static/simple pages)",
			default: false,
		}),
	),
	limit: Type.Optional(
		Type.Number({
			description: "For map mode: max links (default 100)",
			minimum: 1,
			maximum: 500,
		}),
	),
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

function sessionCwd(ctx: { cwd?: string }): string {
	return ctx.cwd ?? process.cwd();
}

export default function harnessWebTools(pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event) => {
		return {
			systemPrompt: `${event.systemPrompt}\n\n${harnessWebContextLine()}`,
		};
	});

	pi.registerTool({
		name: "web_search",
		label: "Web Search",
		description:
			"Search the web via harness-web (DuckDuckGo HTML or self-hosted SearXNG from .env). Returns result summaries and output path.",
		promptSnippet: "SERP via configured engine (ddg_html or searxng from .env)",
		promptGuidelines: WEB_SEARCH_GUIDELINES,
		parameters: WebSearchSchema,

		async execute(_id, params, _signal, _onUpdate, ctx) {
			const cwd = sessionCwd(ctx);
			const query = String(params.query ?? "").trim();
			if (!query) return failResult("web_search: query is required.");

			const limit = typeof params.limit === "number" ? params.limit : 5;
			const bulk = params.bulk === true;
			const output = String(
				params.output ?? (bulk ? ".web/bulk" : ".web/search.json"),
			);

			const argv = bulk
				? ["bulk-scrape", query, "-o", output, "--limit", String(limit)]
				: ["search", query, "-o", output, "--limit", String(limit)];

			const run = runHarnessWeb(MODULE_URL, argv, cwd);
			if (!run.ok) {
				const hint =
					"\n\nHints: run /harness-setup; for searxng set HARNESS_WEB_SEARXNG_URL; " +
					"enable json in SearXNG search.formats.";
				return failResult(
					`web_search failed (exit ${run.exitCode}).\n${run.stderr || run.stdout}${hint}`,
				);
			}

			const parts = [run.stdout];
			if (!bulk) {
				const summary = summarizeSearchJson(output, cwd);
				if (summary) {
					parts.push("", summary);
				}
			}
			parts.push("", `output: ${output}`);
			parts.push("Use read tool for full JSON, or web_fetch on result URLs.");

			return okResult(parts.join("\n"), { output, query, bulk, engine: process.env.HARNESS_WEB_SEARCH_ENGINE });
		},
	});

	pi.registerTool({
		name: "web_fetch",
		label: "Web Fetch",
		description:
			"Fetch a URL via harness-web/Scrapling (scrape to markdown or map same-host links).",
		promptSnippet: "Scrape/map URL via Scrapling (harness-web)",
		promptGuidelines: WEB_FETCH_GUIDELINES,
		parameters: WebFetchSchema,

		async execute(_id, params, _signal, _onUpdate, ctx) {
			const cwd = sessionCwd(ctx);
			const url = String(params.url ?? "").trim();
			if (!url) return failResult("web_fetch: url is required.");

			const mode = params.mode === "map" ? "map" : "scrape";
			const fast = params.fast === true;
			const limit = typeof params.limit === "number" ? params.limit : 100;
			const defaultOut = mode === "map" ? ".web/map.json" : ".web/page.md";
			const output = String(params.output ?? defaultOut);

			const argv =
				mode === "map"
					? ["map", url, "-o", output, "--limit", String(limit), ...(fast ? ["--fast"] : [])]
					: ["scrape", url, "-o", output, ...(fast ? ["--fast"] : [])];

			const run = runHarnessWeb(MODULE_URL, argv, cwd);
			if (!run.ok) {
				return failResult(
					`web_fetch failed (exit ${run.exitCode}).\n${run.stderr || run.stdout}\n` +
						"Try fast:true for static pages, or run harness-cli-verify for Scrapling install.",
				);
			}

			const parts = [run.stdout, "", `output: ${output}`];
			const excerpt = readTextExcerpt(output, cwd);
			if (excerpt) {
				parts.push("", "--- excerpt ---", excerpt);
			}

			return okResult(parts.join("\n"), { output, url, mode });
		},
	});
}
