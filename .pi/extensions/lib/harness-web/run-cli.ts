import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
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
}

export function summarizeSearchJson(filePath: string, cwd: string): string {
	const full = resolve(cwd, filePath);
	if (!existsSync(full)) return "";
	try {
		const data = JSON.parse(readFileSync(full, "utf-8")) as {
			query?: string;
			engine?: string;
			data?: { web?: SearchHit[] };
		};
		const hits = data.data?.web ?? [];
		const lines = [
			`engine: ${data.engine ?? "unknown"}`,
			`query: ${data.query ?? ""}`,
			`results: ${hits.length}`,
			"",
		];
		for (const [i, hit] of hits.entries()) {
			lines.push(`${i + 1}. ${hit.title || "(no title)"}`);
			lines.push(`   ${hit.url}`);
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

export function harnessWebContextLine(): string {
	const engine =
		process.env.HARNESS_WEB_SEARCH_ENGINE?.trim() || "ddg_html";
	const searx = process.env.HARNESS_WEB_SEARXNG_URL?.trim();
	const searxPart = searx ? ` searxng_url=${searx}` : "";
	return (
		`[HarnessWeb] search_engine=${engine}${searxPart} — use web_search / web_fetch tools; ` +
		"never resolve UP_PKG, ls harness-web.py, or python3 -c import scrapling before searching."
	);
}
