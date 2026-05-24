/**
 * scan-fact-rules.mjs
 * Runs fact providers + fact rules over a directory and prints diagnostics.
 * Usage: node scripts/scan-fact-rules.mjs [dir]  (default: clients/)
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");
const scanDir = resolve(root, process.argv[2] ?? "clients");

// --- Bootstrap the dispatch system (registers all providers + rules) ---
// Import integration.ts compiled output
const { createDispatchContext } = await import("../clients/dispatch/dispatcher.js");
const { runProviders } = await import("../clients/dispatch/fact-runner.js");
const { evaluateRules } = await import("../clients/dispatch/fact-rule-runner.js");
const { FactStore } = await import("../clients/dispatch/fact-store.js");

// Side-effect import — registers all providers and rules
await import("../clients/dispatch/integration.js");

// --- Collect .ts files ---
function walk(dir) {
	const results = [];
	for (const entry of readdirSync(dir)) {
		if (entry === "node_modules" || entry.startsWith(".")) continue;
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) results.push(...walk(full));
		else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) results.push(full);
	}
	return results;
}

const files = walk(scanDir);
console.log(`Scanning ${files.length} TypeScript files in ${relative(root, scanDir)}/\n`);

// --- Stub PiAgentAPI ---
const pi = { getFlag: () => undefined };

// --- Session-level FactStore (shared across files for session facts) ---
const sessionFacts = new FactStore();

// --- Run ---
const allDiagnostics = [];

for (const filePath of files) {
	const ctx = createDispatchContext(filePath, root, pi, sessionFacts);

	// Run fact providers to populate the store
	await runProviders(ctx);

	// Evaluate fact rules
	const diagnostics = evaluateRules(ctx);
	allDiagnostics.push(...diagnostics);
}

// --- Report ---
if (allDiagnostics.length === 0) {
	console.log("No issues found.");
	process.exit(0);
}

// Group by rule
const byRule = new Map();
for (const d of allDiagnostics) {
	const rule = d.rule ?? d.tool ?? "unknown";
	if (!byRule.has(rule)) byRule.set(rule, []);
	byRule.get(rule).push(d);
}

for (const [rule, diags] of [...byRule.entries()].sort()) {
	console.log(`\n── ${rule} (${diags.length}) ──`);
	for (const d of diags.sort((a, b) => (a.filePath + a.line) < (b.filePath + b.line) ? -1 : 1)) {
		const rel = relative(root, d.filePath);
		console.log(`  ${rel}:${d.line ?? "?"} — ${d.message}`);
	}
}

console.log(`\nTotal: ${allDiagnostics.length} diagnostic(s) across ${byRule.size} rule(s)`);
