#!/usr/bin/env node
/**
 * graphify-kb-updater — conservative local updater for Graphify source corpus.
 *
 * Daily automation may auto-promote only explicitly approved allowlisted public
 * sources with complete provenance and rights/access metadata. Risky or unclear
 * classes (books, transcripts, YouTube, paid/mirrored/unknown content) remain
 * staged until manually approved.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

let ROOT = resolve(new URL("../..", import.meta.url).pathname);
const DEFAULT_CONFIG = ".pi/harness/corpus/graphify-kb-updater.config.json";
const DEFAULT_STATE_DIR = ".pi/harness/corpus/graphify-kb-updater-state";
const DEFAULT_RAW_DIR = "raw/graphify-kb-updates";
const DEFAULT_DATA_DIR = "data";
const DEFAULT_GRAPH_DIR = "graphify-out";
const REQUIRED_RIGHTS = ["license", "access", "approved_by", "approved_at"];
const RISKY_KINDS = new Set(["book", "transcript", "youtube"]);

function parseArgs(argv) {
	const args = {
		dryRun: true,
		apply: false,
		config: DEFAULT_CONFIG,
		stateDir: DEFAULT_STATE_DIR,
		rawDir: DEFAULT_RAW_DIR,
		dataDir: DEFAULT_DATA_DIR,
		graphDir: DEFAULT_GRAPH_DIR,
		refreshGraph: false,
		skipGraph: false,
		pilotReport: false,
		schedulerSmoke: false,
		maxPromotions: 25,
		projectRoot: ROOT,
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--dry-run") args.dryRun = true;
		else if (a === "--apply") { args.apply = true; args.dryRun = false; }
		else if (a === "--refresh-graph") args.refreshGraph = true;
		else if (a === "--skip-graph") args.skipGraph = true;
		else if (a === "--pilot-report") args.pilotReport = true;
		else if (a === "--scheduler-smoke") args.schedulerSmoke = true;
		else if (a === "--config") args.config = argv[++i];
		else if (a === "--state-dir") args.stateDir = argv[++i];
		else if (a === "--raw-dir") args.rawDir = argv[++i];
		else if (a === "--data-dir") args.dataDir = argv[++i];
		else if (a === "--graph-dir") args.graphDir = argv[++i];
		else if (a === "--project-root") args.projectRoot = argv[++i];
		else if (a === "--max-promotions") args.maxPromotions = Number(argv[++i]);
		else if (a === "--help") usage(0);
		else throw new Error(`unknown argument: ${a}`);
	}
	return args;
}

function usage(code) {
	console.log(`Usage: node .pi/scripts/graphify-kb-updater.mjs [--dry-run|--apply] [options]\n\nOptions:\n  --config PATH          JSON source policy config\n  --state-dir PATH       durable registry/run-log directory\n  --raw-dir PATH         stable promoted source corpus root\n  --data-dir PATH        local books/transcripts root\n  --project-root PATH    root used for corpus/state paths\n  --refresh-graph        run graphify update . after promotions\n  --skip-graph           never run graphify\n  --pilot-report         print frontier recall/precision/noise/graph proxy metrics\n  --scheduler-smoke      validate scheduler-oriented env without promotion\n  --max-promotions N     cap apply promotions per run (default 25)`);
	process.exit(code);
}

function readJson(path, fallback) {
	if (!existsSync(path)) return fallback;
	return JSON.parse(readFileSync(path, "utf8"));
}

function sortDeep(value) {
	if (Array.isArray(value)) return value.map(sortDeep);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortDeep(value[k])]));
}

function stableJson(obj) { return `${JSON.stringify(sortDeep(obj), null, 2)}\n`; }
function sha256(text) { return createHash("sha256").update(text).digest("hex"); }
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "source"; }
function nowIso() { return new Date().toISOString(); }
function rel(path) { return relative(ROOT, path) || "."; }

function loadConfig(args) {
	const path = resolve(ROOT, args.config);
	const cfg = readJson(path, {});
	return {
		schemaVersion: cfg.schema_version ?? "1.0.0",
		policy: cfg.policy ?? "conservative-staged-review",
		sourceTaxonomy: cfg.source_taxonomy ?? {},
		competitorTaxonomy: cfg.competitor_taxonomy ?? {},
		allowlist: (cfg.allowlist ?? []).map((entry) => typeof entry === "string" ? { domain: entry, approved: true } : entry),
		reviewQueue: cfg.review_queue ?? [],
		articleQueries: cfg.article_queries ?? [],
		paperFeeds: cfg.paper_feeds ?? [],
		localBooks: cfg.local_books ?? [{ path: "data/books" }],
		localTranscripts: cfg.local_transcripts ?? [{ path: "data/youtube-transcripts" }],
		youtubeCandidates: cfg.youtube_candidates ?? [],
		autoPromoteAllowlist: cfg.auto_promote_allowlist === true,
		path,
	};
}

function walkFiles(root, exts, max = 200) {
	const out = [];
	function walk(dir) {
		if (out.length >= max || !existsSync(dir)) return;
		for (const name of readdirSync(dir)) {
			const p = join(dir, name);
			const st = statSync(p);
			if (st.isDirectory()) walk(p);
			else if (exts.includes(extname(name).toLowerCase())) out.push(p);
			if (out.length >= max) break;
		}
	}
	walk(root);
	return out;
}

function rightsFromSidecar(file) {
	const json = `${file}.rights.json`;
	if (existsSync(json)) return readJson(json, null);
	const metaJson = file.replace(/\.[^.]+$/, ".meta.json");
	if (existsSync(metaJson)) return readJson(metaJson, null)?.rights_access ?? null;
	return null;
}

function hasRightsApproval(candidate) {
	const r = candidate.rights_access;
	return Boolean(r && REQUIRED_RIGHTS.every((k) => typeof r[k] === "string" && r[k].trim()));
}

function urlDomain(url) {
	try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function allowlistEntry(cfg, domain) {
	return cfg.allowlist.find((entry) => entry.domain === domain || domain.endsWith(`.${entry.domain}`));
}

function competitorLabels(cfg, candidate) {
	const haystack = `${candidate.title ?? ""} ${candidate.url ?? ""} ${candidate.path ?? ""}`.toLowerCase();
	const labels = [];
	for (const [category, spec] of Object.entries(cfg.competitorTaxonomy ?? {})) {
		const terms = Array.isArray(spec) ? spec : (spec.keywords ?? []);
		if (terms.some((term) => haystack.includes(String(term).toLowerCase()))) labels.push(category);
	}
	return labels;
}

function candidateId(candidate) {
	return sha256([candidate.kind, candidate.source_type, candidate.url ?? candidate.path ?? candidate.query ?? "", candidate.title ?? ""].join("\n")).slice(0, 16);
}

function normalizeCandidate(cfg, raw) {
	const domain = raw.domain ?? urlDomain(raw.url);
	const allow = domain ? allowlistEntry(cfg, domain) : null;
	const taxonomy = cfg.sourceTaxonomy?.[raw.kind] ?? {};
	const candidate = {
		...raw,
		domain,
		category: raw.category ?? taxonomy.category ?? raw.kind,
		risk_class: raw.risk_class ?? taxonomy.risk_class ?? (RISKY_KINDS.has(raw.kind) ? "high" : "medium"),
		provenance: raw.provenance ?? { origin: raw.source_type, discovered_by: "graphify-kb-updater", locator: raw.url ?? raw.path ?? raw.query ?? null },
		rights_access: raw.rights_access ?? null,
		allowlist_state: allow ? { allowed: true, domain: allow.domain, approved: allow.approved === true, approved_by: allow.approved_by ?? null, approved_at: allow.approved_at ?? null } : { allowed: false },
		approval_state: raw.approved === true ? "approved" : "not_approved",
	};
	candidate.competitor_labels = raw.competitor_labels ?? competitorLabels(cfg, candidate);
	candidate.id = raw.id ?? candidateId(candidate);
	candidate.content_hash = sha256(sourceBody(candidate));
	return candidate;
}

function discoverCandidates(cfg, args) {
	const candidates = [];
	for (const query of cfg.articleQueries) candidates.push({ kind: "article", source_type: "web_search_query", title: query, query, review_required: true, promotion_policy: "stage_only" });
	for (const feed of cfg.paperFeeds) candidates.push({ kind: "paper", source_type: "feed", title: feed.title ?? feed.url, url: feed.url, rights_access: feed.rights_access ?? null, review_required: true, promotion_policy: "stage_only", provenance: feed.provenance });
	for (const entry of cfg.reviewQueue) {
		const domain = urlDomain(entry.url);
		const allow = allowlistEntry(cfg, domain);
		const explicit = cfg.autoPromoteAllowlist && allow?.approved === true && entry.approved === true;
		candidates.push({ ...entry, kind: entry.kind ?? "article", source_type: "review_queue", domain, review_required: !explicit, promotion_policy: explicit ? "allowlist_auto_promote" : "manual_review", rights_access: entry.rights_access ?? null });
	}
	for (const spec of cfg.localBooks) for (const file of walkFiles(resolve(ROOT, spec.path), [".md", ".txt", ".pdf"], spec.max_files ?? 50)) candidates.push({ kind: "book", source_type: "local_file", title: basename(file), path: rel(file), rights_access: rightsFromSidecar(file), review_required: true, promotion_policy: "manual_review" });
	for (const spec of cfg.localTranscripts) for (const file of walkFiles(resolve(ROOT, spec.path), [".md", ".txt", ".vtt"], spec.max_files ?? 80)) candidates.push({ kind: "transcript", source_type: "local_file", title: basename(file), path: rel(file), rights_access: rightsFromSidecar(file), review_required: true, promotion_policy: "manual_review" });
	for (const yt of cfg.youtubeCandidates) candidates.push({ ...yt, kind: "youtube", source_type: "youtube_candidate", review_required: true, promotion_policy: "manual_review", rights_access: yt.rights_access ?? null });
	return candidates.map((c) => normalizeCandidate(cfg, c));
}

function loadRegistry(args) {
	const dir = resolve(ROOT, args.stateDir);
	return readJson(join(dir, "registry.json"), { schema_version: "1.1.0", candidates: {}, runs: [] });
}

function writeRegistry(args, registry) {
	const dir = resolve(ROOT, args.stateDir);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "registry.json"), stableJson(registry));
}

function sourceBody(candidate) {
	if (candidate.source_type === "local_file" && candidate.path) {
		const abs = resolve(ROOT, candidate.path);
		if (existsSync(abs) && extname(abs).toLowerCase() !== ".pdf") return readFileSync(abs, "utf8");
	}
	return `# ${candidate.title ?? candidate.id}\n\nSource staged by graphify-kb-updater. Fetch/parse content via approved harness web/API workflow before broad use.\n`;
}

function promotionAllowed(candidate) {
	if (!hasRightsApproval(candidate)) return { ok: false, reason: "missing_rights_access_approval" };
	if (RISKY_KINDS.has(candidate.kind) && candidate.approved !== true) return { ok: false, reason: "manual_approval_required" };
	if (candidate.source_type === "review_queue" && candidate.promotion_policy === "allowlist_auto_promote" && candidate.allowlist_state.allowed && candidate.allowlist_state.approved) return { ok: true };
	return candidate.approved === true ? { ok: true } : { ok: false, reason: "manual_approval_required" };
}

function promote(candidate, args) {
	const body = sourceBody(candidate);
	const contentHash = sha256(body);
	const dir = resolve(ROOT, args.rawDir, candidate.kind);
	const base = `${new Date().toISOString().slice(0, 10)}-${slugify(candidate.title ?? candidate.id)}-${contentHash.slice(0, 8)}`;
	const md = join(dir, `${base}.md`);
	const prov = join(dir, `${base}.provenance.json`);
	mkdirSync(dir, { recursive: true });
	const header = `---\nsource_id: ${candidate.id}\nkind: ${candidate.kind}\ncategory: ${candidate.category}\ncontent_sha256: ${contentHash}\nrights_license: ${candidate.rights_access.license}\nrights_access: ${candidate.rights_access.access}\napproved_by: ${candidate.rights_access.approved_by}\napproved_at: ${candidate.rights_access.approved_at}\ncompetitor_labels: ${JSON.stringify(candidate.competitor_labels)}\n---\n\n`;
	writeFileSync(md, header + body);
	writeFileSync(prov, stableJson({ ...candidate, content_sha256: contentHash, promoted_path: rel(md), promoted_at: nowIso() }));
	return { path: rel(md), provenance_path: rel(prov), content_hash: contentHash };
}

function refreshGraph(args, changedCount) {
	if (args.skipGraph) return { action: "skipped_by_flag" };
	if (!args.refreshGraph) return { action: changedCount > 0 ? "planned" : "skipped_noop" };
	if (changedCount === 0) return { action: "skipped_noop" };
	const run = spawnSync("graphify", ["update", "."], { cwd: ROOT, encoding: "utf8", timeout: 20 * 60 * 1000 });
	const report = resolve(ROOT, args.graphDir, "GRAPH_REPORT.md");
	return { action: "graphify_update", exit_status: run.status, ok: run.status === 0 && existsSync(report), report: rel(report), stderr: (run.stderr ?? "").slice(0, 1200) };
}

function appendRunLog(args, summary) {
	const dir = resolve(ROOT, args.stateDir, "logs");
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, `${summary.run_id}.json`), stableJson(summary));
	const line = `${JSON.stringify(summary)}\n`;
	const jsonl = join(dir, "runs.jsonl");
	writeFileSync(jsonl, existsSync(jsonl) ? readFileSync(jsonl, "utf8") + line : line);
}

function byCount(items, keyFn) {
	const out = {};
	for (const item of items) for (const key of [keyFn(item)].flat().filter(Boolean)) out[key] = (out[key] ?? 0) + 1;
	return out;
}

function pilotMetrics(summary) {
	const considered = Math.max(summary.candidate_count, 1);
	const promoted = summary.promoted_count;
	const duplicates = summary.duplicate_skips;
	return {
		frontier_recall_proxy: Number(((summary.candidate_count - duplicates) / considered).toFixed(3)),
		promoted_precision_proxy: promoted === 0 ? 1 : Number((promoted / Math.max(promoted + summary.failure_count, 1)).toFixed(3)),
		duplicate_noise_rate: Number((duplicates / considered).toFixed(3)),
		graphify_success: ["skipped_noop", "planned", "skipped_by_flag"].includes(summary.graph.action) || summary.graph.ok === true,
	};
}

function schedulerSmoke() {
	const service = readFileSync(resolve(ROOT, ".pi/harness/corpus/systemd/graphify-kb-updater.service"), "utf8");
	const timer = readFileSync(resolve(ROOT, ".pi/harness/corpus/systemd/graphify-kb-updater.timer"), "utf8");
	const cron = readFileSync(resolve(ROOT, ".pi/harness/corpus/cron.example"), "utf8");
	const checks = {
		systemd_daily: /OnCalendar=\*-\*-\*\s+08:30:00|OnCalendar=daily/i.test(timer),
		cron_daily: /^30\s+8\s+\*\s+\*\s+\*/m.test(cron),
		bounded_timeout: /timeout 45m/.test(service) && /timeout 45m/.test(cron),
		locked_no_overlap: /flock -n/.test(service) && /flock -n/.test(cron),
		explicit_env: /EnvironmentFile/.test(service) && /UP_ROOT/.test(cron),
		logged: /StandardOutput=append/.test(service) && /HARNESS_GRAPHIFY_KB_LOG/.test(cron),
		refresh_intent: /--refresh-graph/.test(cron),
	};
	const ok = Object.values(checks).every(Boolean);
	console.log(JSON.stringify({ ok, checks }, null, 2));
	process.exit(ok ? 0 : 1);
}

function main() {
	const started = Date.now();
	const args = parseArgs(process.argv.slice(2));
	ROOT = resolve(args.projectRoot);
	if (args.schedulerSmoke) schedulerSmoke();
	const cfg = loadConfig(args);
	const registry = loadRegistry(args);
	const candidates = discoverCandidates(cfg, args);
	let duplicates = 0, promoted = 0, failed = 0, changedExisting = 0;
	const planned = [], blocked = [], promotedRefs = [], skipped = [];
	const runAt = nowIso();

	for (const c of candidates) {
		const prior = registry.candidates[c.id];
		const contentChanged = Boolean(prior?.content_hash && prior.content_hash !== c.content_hash);
		if (prior?.status === "promoted" && !contentChanged) {
			duplicates++;
			registry.candidates[c.id] = { ...prior, last_seen_at: runAt, content_state: "unchanged" };
			skipped.push({ id: c.id, reason: "duplicate_unchanged", content_state: "unchanged" });
			continue;
		}
		if (contentChanged) changedExisting++;
		const gate = promotionAllowed(c);
		registry.candidates[c.id] = { ...(prior ?? {}), ...c, first_seen_at: prior?.first_seen_at ?? runAt, last_seen_at: runAt, status: gate.ok ? "promotable" : "review_required", block_reason: gate.reason ?? null, content_state: contentChanged ? "changed" : "new" };
		if (!gate.ok) { blocked.push({ id: c.id, title: c.title, reason: gate.reason, allowlist_state: c.allowlist_state, category: c.category, competitor_labels: c.competitor_labels }); continue; }
		planned.push(c);
	}

	if (args.apply) {
		for (const c of planned.slice(0, args.maxPromotions)) {
			try {
				const ref = promote(c, args);
				registry.candidates[c.id] = { ...registry.candidates[c.id], ...ref, status: "promoted", promoted_at: nowIso() };
				promotedRefs.push(ref); promoted++;
			} catch (err) {
				failed++;
				registry.candidates[c.id] = { ...registry.candidates[c.id], status: "failed", error: String(err?.message ?? err) };
			}
		}
		for (const c of planned.slice(args.maxPromotions)) skipped.push({ id: c.id, reason: "max_promotions_cap" });
	}

	const graph = refreshGraph(args, promoted);
	const stale = registry.runs.at?.(-1)?.run_id ? [] : ["no_prior_apply_run_recorded"];
	const summary = {
		run_id: `kb-${Date.now()}`,
		last_run_at: runAt,
		mode: args.dryRun ? "dry-run" : "apply",
		candidate_count: candidates.length,
		planned_promotions: planned.length,
		promoted_count: promoted,
		duplicate_skips: duplicates,
		blocked_count: blocked.length,
		skipped_count: skipped.length,
		failure_count: failed,
		changed_existing_count: changedExisting,
		runtime_ms: Date.now() - started,
		counts: { by_kind: byCount(candidates, (c) => c.kind), by_source_type: byCount(candidates, (c) => c.source_type), by_competitor_label: byCount(candidates, (c) => c.competitor_labels), allowlisted: candidates.filter((c) => c.allowlist_state.allowed).length },
		stale_warnings: stale,
		graph,
		exit_status: failed || graph.ok === false ? 1 : 0,
		promoted: promotedRefs,
		blocked: blocked.slice(0, 50),
		skipped: skipped.slice(0, 50),
		config: rel(cfg.path),
	};
	if (args.pilotReport) summary.pilot = pilotMetrics(summary);
	registry.runs.push(summary);
	if (args.apply) { writeRegistry(args, registry); appendRunLog(args, summary); }
	console.log(JSON.stringify(summary, null, 2));
	process.exit(summary.exit_status);
}

try { main(); } catch (err) { console.error(`graphify-kb-updater: ${err.stack ?? err}`); process.exit(2); }
