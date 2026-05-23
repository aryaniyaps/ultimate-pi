#!/usr/bin/env node
/** Package-wide web-policy guard.
 * Rejects raw HTTP shell/client paths unless they are in approved harness/API
 * abstraction files. This is a static smoke guard; runtime blocking remains in
 * .pi/extensions/harness-web-guard.ts.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const ALLOWED_FILES = new Set([
	".pi/extensions/harness-web-guard.ts",
	".pi/extensions/harness-web-tools.ts",
	".pi/extensions/lib/harness-web/run-cli.ts",
	".pi/extensions/harness-run-context.ts",
	".pi/extensions/lib/ask-user/schema.ts",
	".pi/scripts/harness-web.py",
	".pi/scripts/harness-web-search.md",
	".pi/scripts/harness-web-policy-guard.mjs",
	".agents/skills/scrapling-web/SKILL.md",
	".pi/scripts/harness-cli-verify.sh",
	".pi/scripts/harness_web/output.py",
	"AGENTS.md",
]);
const SKIP_DIRS = new Set([".git", "node_modules", "vendor", "graphify-out", "graphify-books-out", ".web", ".cocoindex_code", ".agents", ".cursor", "raw"]);
const TEXT_EXTS = new Set([".js", ".mjs", ".ts", ".tsx", ".json", ".yaml", ".yml", ".py", ".sh", ".toml", ".example", ".template"]);
const NEEDLES = [
	{ name: "raw curl/wget URL", re: /\b(?:curl|wget)\b[^\n]*https?:\/\//i },
	{ name: "raw Node HTTP client", re: /\b(?:fetch|request|get)\s*\(\s*[`'"]https?:\/\//i },
	{ name: "raw Python HTTP client", re: /\brequests\.(?:get|post|put|delete|head)\s*\(\s*[`'"]https?:\/\//i },
	{ name: "Firecrawl path", re: /\bfirecrawl\b/i },
];

function ext(path) {
	const i = path.lastIndexOf(".");
	return i >= 0 ? path.slice(i) : "";
}

function walk(dir, out = []) {
	for (const name of readdirSync(dir)) {
		const abs = join(dir, name);
		const r = relative(ROOT, abs);
		if (SKIP_DIRS.has(name) || r.startsWith(".pi/harness/runs/") || r.startsWith(".pi/agents/") || r.startsWith(".pi/skills/") || r.startsWith(".pi/prompts/") || r.startsWith(".pi/harness/docs/")) continue;
		const st = statSync(abs);
		if (st.isDirectory()) walk(abs, out);
		else if (TEXT_EXTS.has(ext(name)) || name.includes("template") || name.includes("example")) out.push(abs);
	}
	return out;
}

const hits = [];
for (const abs of walk(ROOT)) {
	const r = relative(ROOT, abs);
	if (ALLOWED_FILES.has(r)) continue;
	let text = "";
	try { text = readFileSync(abs, "utf8"); } catch { continue; }
	for (const needle of NEEDLES) {
		const m = text.match(needle.re);
		if (m) hits.push({ file: r, rule: needle.name, match: m[0].slice(0, 140) });
	}
}

if (hits.length) {
	console.error(JSON.stringify({ ok: false, hits }, null, 2));
	process.exit(1);
}
console.log(JSON.stringify({ ok: true, scanned_root: ROOT }, null, 2));
