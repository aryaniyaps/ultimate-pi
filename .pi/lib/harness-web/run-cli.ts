import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveHarnessScript } from "../harness-paths.js";

export interface RunHarnessWebResult {
	ok: boolean;
	exitCode: number;
	stdout: string;
	stderr: string;
}

export function runHarnessWeb(
	moduleUrl: string,
	args: string[],
	cwd: string,
): RunHarnessWebResult {
	const script = resolveHarnessScript(moduleUrl, "harness-web.py");
	const result = spawnSync("python3", [script, ...args], {
		cwd,
		env: process.env,
		encoding: "utf-8",
		maxBuffer: 16 * 1024 * 1024,
	});
	return {
		ok: result.status === 0,
		exitCode: result.status ?? 1,
		stdout: (result.stdout ?? "").trim(),
		stderr: (result.stderr ?? "").trim(),
	};
}

export function readTextExcerpt(
	filePath: string,
	cwd: string,
	maxChars = 2000,
): string {
	const full = resolve(cwd, filePath);
	if (!existsSync(full)) return "";
	const text = readFileSync(full, "utf-8");
	if (text.length <= maxChars) return text;
	return `${text.slice(0, maxChars)}\n… (truncated; use read tool for full file)`;
}

export interface SearchHit {
	url: string;
	title: string;
	description: string;
	score?: number;
	angle_ids?: string[];
}

export function summarizeSearchJson(filePath: string, cwd: string): string {
	const full = resolve(cwd, filePath);
	if (!existsSync(full)) return "";
	try {
		const data = JSON.parse(readFileSync(full, "utf-8")) as {
			query?: string;
			engine?: string;
			tier?: string;
			mode?: string;
			data?: { web?: SearchHit[] };
		};
		const hits = data.data?.web ?? [];
		const tier = data.tier ?? data.mode ?? "standard";
		const lines = [
			`engine: ${data.engine ?? "unknown"}`,
			`tier: ${tier}`,
			`query: ${data.query ?? ""}`,
			`results: ${hits.length}`,
			"",
		];
		for (const [i, hit] of hits.entries()) {
			lines.push(`${i + 1}. ${hit.title || "(no title)"}`);
			lines.push(`   ${hit.url}`);
			if (hit.score != null) {
				lines.push(`   score: ${hit.score}`);
			}
			if (hit.angle_ids?.length) {
				lines.push(`   angles: ${hit.angle_ids.join(", ")}`);
			}
			if (hit.description) {
				const snip =
					hit.description.length > 120
						? `${hit.description.slice(0, 120)}…`
						: hit.description;
				lines.push(`   ${snip}`);
			}
		}
		return lines.join("\n");
	} catch {
		return "";
	}
}

export function summarizeDeepSearchJson(filePath: string, cwd: string): string {
	const full = resolve(cwd, filePath);
	if (!existsSync(full)) return "";
	try {
		const data = JSON.parse(readFileSync(full, "utf-8")) as {
			query?: string;
			angles?: Array<{ id: string; query: string }>;
			data?: { web?: SearchHit[] };
		};
		const lines = [
			summarizeSearchJson(filePath, cwd),
			"",
			`angles: ${data.angles?.length ?? 0}`,
		];
		for (const a of data.angles ?? []) {
			lines.push(`  - ${a.id}: ${a.query}`);
		}
		lines.push("");
		lines.push("Prefer URLs with multiple angle_ids. Use web_fetch highlights on top 3.");
		return lines.join("\n");
	} catch {
		return summarizeSearchJson(filePath, cwd);
	}
}

export function harnessWebContextLine(): string {
	const engine = process.env.HARNESS_WEB_SEARCH_ENGINE?.trim() || "ddg_html";
	const searx = process.env.HARNESS_WEB_SEARXNG_URL?.trim();
	const searxPart = searx ? ` searxng_url=${searx}` : "";
	return (
		`[HarnessWeb] engine=${engine}${searxPart} | research: tier=deep + web-query-expander | ` +
		"latency: tier=instant|standard or web-query-expander-fast | " +
		"artifacts: .web/runs/<run_id>/ or .web/sessions/<session_id>/ (not flat .web/answer.md) | " +
		"models: HARNESS_WEB_*_MODEL env (provider/model-id) | " +
		"skill: web-retrieval"
	);
}
