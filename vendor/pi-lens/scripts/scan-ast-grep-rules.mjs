#!/usr/bin/env node
/**
 * scan-ast-grep-rules.mjs
 * Runs a subset of ast-grep YAML rules via @ast-grep/napi across the codebase.
 * Usage: node scripts/scan-ast-grep-rules.mjs [--rules rule1,rule2,...] [dir]
 *
 * Examples:
 *   node scripts/scan-ast-grep-rules.mjs                      # all new rules, scan clients/
 *   node scripts/scan-ast-grep-rules.mjs .                    # all new rules, scan entire repo
 *   node scripts/scan-ast-grep-rules.mjs --rules prefer-structured-clone .
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { load as yamlLoad } from "js-yaml";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let ruleFilter = null;
let scanDir = join(repoRoot, "clients");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--rules" && args[i + 1]) {
    ruleFilter = new Set(args[++i].split(",").map((r) => r.trim()));
  } else {
    scanDir = resolve(args[i]);
  }
}

// ── New rule IDs to scan ──────────────────────────────────────────────────────
const NEW_RULE_IDS = new Set([
  "no-negation-in-equality-check",
  "no-await-expression-member",
  "no-instanceof-builtins",
  "no-instanceof-array",
  "no-await-in-promise-methods",
  "no-useless-promise-resolve-reject",
  "consistent-existence-index-check",
  "prefer-string-trim-start-end",
  "prefer-array-flat-map",
  "prefer-structured-clone",
  "prefer-date-now",
  "prefer-math-min-max",
  "prefer-number-properties",
  "prefer-string-starts-ends-with",
  "prefer-string-slice",
  "prefer-array-find",
  "prefer-array-some",
  "prefer-prototype-methods",
  "no-single-promise-in-promise-methods",
  "throw-new-error",
  "no-typeof-undefined",
  "no-array-sort-without-comparator",
  "no-useless-rest-spread",
  "no-unnecessary-array-flat-depth",
  "prefer-dom-node-text-content",
  "prefer-dom-node-append",
  "prefer-query-selector",
  "prefer-keyboard-event-key",
  "no-useless-length-check",
  "prefer-at",
  "no-absolute-path-import",
  "prefer-async-await",
  "no-this-in-static",
  "enforce-node-protocol",
  "prefer-string-raw",
  "no-array-reverse-mutation",
]);

const activeIds = ruleFilter ?? NEW_RULE_IDS;

// ── Load NAPI ────────────────────────────────────────────────────────────────
let sg;
try {
  sg = await import("@ast-grep/napi");
} catch (e) {
  console.error("@ast-grep/napi not available:", e.message);
  process.exit(1);
}

// ── Load YAML rules ──────────────────────────────────────────────────────────
const rulesDir = join(repoRoot, "rules", "ast-grep-rules", "rules");
const allRuleFiles = readdirSync(rulesDir).filter((f) => f.endsWith(".yml"));

const rules = [];
for (const file of allRuleFiles) {
  if (file.endsWith("-js.yml")) continue; // skip JS variants — we scan .ts files only
  const id = file.replace(/\.yml$/, "");
  const baseId = id;
  if (!activeIds.has(baseId)) continue;

  const raw = readFileSync(join(rulesDir, file), "utf-8");
  let parsed;
  try {
    parsed = yamlLoad(raw);
  } catch (e) {
    console.error(`Failed to parse ${file}: ${e.message}`);
    continue;
  }
  rules.push({ id, baseId, file, parsed });
}

console.log(`Loaded ${rules.length} rule variants for ${activeIds.size} rules`);

// ── Language mapping ─────────────────────────────────────────────────────────
function getLang(filePath) {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".ts": return sg.ts;
    case ".tsx": return sg.tsx;
    case ".js": case ".jsx": return sg.js;
    default: return null;
  }
}

function fileMatchesRule(filePath, ruleObj) {
  const ext = extname(filePath).toLowerCase();
  const lang = ruleObj.parsed?.language?.toLowerCase() ?? "";
  const isJs = ext === ".js" || ext === ".jsx";
  const isTs = ext === ".ts" || ext === ".tsx";
  if (lang === "javascript" && !isJs) return false;
  if (lang === "typescript" && !isTs) return false;
  return isJs || isTs;
}

// ── File walker ───────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage"]);

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full);
    } else if (/\.tsx?$/.test(entry.name)) {
      yield full;
    }
  }
}

// ── Pattern matching via NAPI ─────────────────────────────────────────────────
function matchPattern(sgRoot, pattern) {
  if (!pattern || typeof pattern !== "string") return [];
  try {
    return sgRoot.findAll({ rule: { pattern } });
  } catch {
    return [];
  }
}

function matchRule(sgRoot, ruleSpec, constraints) {
  try {
    const config = { rule: ruleSpec };
    if (constraints && Object.keys(constraints).length) config.constraints = constraints;
    return sgRoot.findAll(config);
  } catch {
    return [];
  }
}

// ── Main scan ────────────────────────────────────────────────────────────────
const hits = new Map(); // ruleBaseId → [{file, line, message}]
let fileCount = 0;

console.log(`Scanning ${scanDir} ...\n`);

for (const filePath of walkFiles(scanDir)) {
  fileCount++;
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    continue;
  }

  const lang = getLang(filePath);
  if (!lang) continue;

  let sgRoot;
  try {
    sgRoot = lang.parse(content).root();
  } catch {
    continue;
  }

  for (const rule of rules) {
    if (!fileMatchesRule(filePath, rule)) continue;

    let matches;
    try {
      matches = matchRule(sgRoot, rule.parsed?.rule ?? {}, rule.parsed?.constraints);
    } catch {
      continue;
    }

    if (!matches.length) continue;

    const bucket = hits.get(rule.baseId) ?? [];
    for (const m of matches) {
      const range = m.range();
      bucket.push({
        file: relative(repoRoot, filePath),
        line: range.start.line + 1,
        col: range.start.column + 1,
        text: m.text().slice(0, 80).replace(/\n/g, "↵"),
      });
    }
    hits.set(rule.baseId, bucket);
  }
}

// ── Output ────────────────────────────────────────────────────────────────────
console.log(`Scanned ${fileCount} files\n`);

let totalHits = 0;
const hitRules = [...hits.entries()].sort((a, b) => b[1].length - a[1].length);

for (const [ruleId, matches] of hitRules) {
  // Find message from TS variant
  const ruleObj = rules.find((r) => r.baseId === ruleId && !r.id.endsWith("-js"));
  const message = ruleObj?.parsed?.message ?? ruleId;

  console.log(`── ${ruleId} (${matches.length}) ──`);
  console.log(`   ${message}`);
  for (const m of matches.slice(0, 10)) {
    console.log(`   ${m.file}:${m.line}  ${m.text}`);
  }
  if (matches.length > 10) {
    console.log(`   ... and ${matches.length - 10} more`);
  }
  console.log();
  totalHits += matches.length;
}

const zeroRules = [...activeIds].filter((id) => !hits.has(id));
if (zeroRules.length) {
  console.log(`── No hits (${zeroRules.length} rules) ──`);
  console.log(`   ${zeroRules.join(", ")}`);
  console.log();
}

console.log(`Total: ${totalHits} hit(s) across ${hitRules.length} rule(s)`);
