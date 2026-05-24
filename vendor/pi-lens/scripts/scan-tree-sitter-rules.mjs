#!/usr/bin/env node
/**
 * scan-tree-sitter-rules.mjs
 * Runs all tree-sitter query rules over a directory and prints diagnostics.
 * Usage: node scripts/scan-tree-sitter-rules.mjs [dir]  (default: clients/)
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");
const scanDir = resolve(root, process.argv[2] ?? "clients");

// Bootstrap tree-sitter
const { TreeSitterClient } = await import("../clients/tree-sitter-client.js");
const { queryLoader } = await import("../clients/tree-sitter-query-loader.js");

const client = new TreeSitterClient();
await client.init();
await queryLoader.loadQueries(root);

const allQueries = queryLoader.getAllQueries();
console.log(`Loaded ${allQueries.length} queries`);

// Language detection
function getLangId(filePath) {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".ts": case ".tsx": return "typescript";
    case ".js": case ".jsx": return "javascript";
    case ".py": return "python";
    case ".go": return "go";
    case ".rb": return "ruby";
    case ".rs": return "rust";
    default: return null;
  }
}

// File walker
const SKIP = new Set(["node_modules", ".git", "dist", "build", "coverage"]);
function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx|js|jsx|py|go|rb|rs)$/.test(entry.name)) yield full;
  }
}

// Scan
const hits = new Map(); // ruleId → [{file, line, message}]
let fileCount = 0;

console.log(`Scanning ${scanDir} ...\n`);

for (const filePath of walk(scanDir)) {
  const langId = getLangId(filePath);
  if (!langId) continue;

  const langQueries = allQueries.filter(
    (q) => q.language === langId || (langId === "javascript" && q.language === "typescript")
  );
  if (!langQueries.length) continue;

  fileCount++;

  for (const queryDef of langQueries) {
    let matches;
    try {
      matches = await client.runQueryOnFile(queryDef, filePath, langId, { maxResults: 20 });
    } catch {
      continue;
    }
    if (!matches?.length) continue;

    const bucket = hits.get(queryDef.id) ?? [];
    const relFile = relative(root, filePath);

    // Rules that are structural (one hit per chain/nesting level) — deduplicate to one hit per file
    const DEDUP_PER_FILE = new Set(["deep-promise-chain", "deep-nesting"]);
    if (DEDUP_PER_FILE.has(queryDef.id)) {
      if (!bucket.some((h) => h.file === relFile)) {
        bucket.push({ file: relFile, line: matches[0].line ?? "?", severity: queryDef.severity, message: queryDef.message });
      }
    } else {
      for (const m of matches) {
        bucket.push({ file: relFile, line: m.line ?? "?", severity: queryDef.severity, message: queryDef.message });
      }
    }
    hits.set(queryDef.id, bucket);
  }
}

// Output
console.log(`Scanned ${fileCount} files\n`);

let total = 0;
const sorted = [...hits.entries()].sort((a, b) => b[1].length - a[1].length);

for (const [ruleId, matches] of sorted) {
  const sev = matches[0]?.severity ?? "warning";
  console.log(`── ${ruleId} [${sev}] (${matches.length}) ──`);
  console.log(`   ${matches[0]?.message ?? ""}`);
  for (const m of matches.slice(0, 8)) {
    console.log(`   ${m.file}:${m.line}`);
  }
  if (matches.length > 8) console.log(`   ... and ${matches.length - 8} more`);
  console.log();
  total += matches.length;
}

const zeroRules = allQueries
  .filter((q) => ["typescript", "javascript", "python", "go", "ruby", "rust"].includes(q.language))
  .filter((q) => !hits.has(q.id))
  .map((q) => q.id);

if (zeroRules.length) {
  console.log(`── No hits (${zeroRules.length} rules) ──`);
  console.log(`   ${zeroRules.join(", ")}`);
  console.log();
}

console.log(`Total: ${total} hit(s) across ${hits.size} rule(s)`);
