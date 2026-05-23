import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import assert from "node:assert/strict";

const ROOT = new URL("..", import.meta.url).pathname;
const SCRIPT = join(ROOT, ".pi/scripts/graphify-kb-updater.mjs");

function tmpRepo() {
	const dir = mkdtempSync(join(tmpdir(), "graphify-kb-updater-"));
	mkdirSync(join(dir, "data", "books"), { recursive: true });
	mkdirSync(join(dir, "data", "youtube-transcripts"), { recursive: true });
	mkdirSync(join(dir, "graphify-out"), { recursive: true });
	writeFileSync(join(dir, "graphify-out", "GRAPH_REPORT.md"), "# Graph\n");
	return dir;
}

function run(args, cwd = ROOT, env = {}) {
	const res = spawnSync("node", [SCRIPT, "--project-root", cwd, ...args], { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env } });
	if (res.status !== 0) throw new Error(`${res.stderr}\n${res.stdout}`);
	return JSON.parse(res.stdout);
}

function writeConfig(dir, body) {
	const path = join(dir, "config.json");
	writeFileSync(path, JSON.stringify(body, null, 2));
	return path;
}

function countFiles(dir) {
	if (!existsSync(dir)) return 0;
	let n = 0;
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) n += countFiles(p);
		else n++;
	}
	return n;
}

function approvedRights() {
	return { license: "public page", access: "public", approved_by: "tester", approved_at: "2026-05-23" };
}

test("dry-run reports candidates and no-refresh graph skip without corpus or state mutation", () => {
	const dir = tmpRepo();
	const cfg = writeConfig(dir, {
		article_queries: ["agent harness news"],
		paper_feeds: [{ title: "agent paper feed", url: "https://arxiv.org/search/?query=agents" }],
		local_books: [{ path: "data/books" }],
		local_transcripts: [{ path: "data/youtube-transcripts" }],
		youtube_candidates: [{ title: "yt", url: "https://youtube.com/watch?v=abc" }],
	});
	writeFileSync(join(dir, "data", "books", "book.txt"), "book");
	writeFileSync(join(dir, "data", "youtube-transcripts", "talk.txt"), "talk");
	const beforeRaw = countFiles(join(dir, "raw"));
	const beforeState = countFiles(join(dir, "state"));
	const out = run(["--dry-run", "--config", cfg, "--state-dir", "state", "--raw-dir", "raw/kb", "--data-dir", "data", "--graph-dir", "graphify-out", "--pilot-report"], dir);
	assert.equal(out.mode, "dry-run");
	assert.equal(out.candidate_count, 5);
	assert.equal(out.promoted_count, 0);
	assert.equal(out.graph.action, "skipped_noop");
	assert.equal(countFiles(join(dir, "raw")), beforeRaw);
	assert.equal(countFiles(join(dir, "state")), beforeState);
});

test("unsafe classes remain blocked without complete approval metadata", () => {
	const dir = tmpRepo();
	writeFileSync(join(dir, "data", "books", "no-rights.txt"), "book");
	writeFileSync(join(dir, "data", "youtube-transcripts", "no-rights.txt"), "talk");
	const cfg = writeConfig(dir, { review_queue: [{ title: "unknown", url: "https://unknown.example/x" }], local_books: [{ path: "data/books" }], local_transcripts: [{ path: "data/youtube-transcripts" }], youtube_candidates: [{ title: "yt", url: "https://youtube.com/watch?v=abc" }] });
	const out = run(["--apply", "--config", cfg, "--state-dir", "state", "--raw-dir", "raw/kb", "--graph-dir", "graphify-out"], dir);
	assert.equal(out.promoted_count, 0);
	assert.equal(out.blocked_count, 4);
	assert.ok(out.blocked.every((b) => ["missing_rights_access_approval", "manual_approval_required"].includes(b.reason)));
});

test("approved allowlisted source promotion refreshes graph exactly once and writes provenance", () => {
	const dir = tmpRepo();
	const bin = join(dir, "bin");
	mkdirSync(bin, { recursive: true });
	const spy = join(dir, "graphify-spy.log");
	const graphify = join(bin, "graphify");
	writeFileSync(graphify, `#!/bin/sh\necho "$@" >> "${spy}"\nexit 0\n`);
	chmodSync(graphify, 0o755);
	const cfg = writeConfig(dir, {
		auto_promote_allowlist: true,
		allowlist: [{ domain: "openai.com", approved: true, approved_by: "tester", approved_at: "2026-05-23" }],
		local_books: [], local_transcripts: [], article_queries: [], paper_feeds: [], youtube_candidates: [],
		review_queue: [{ kind: "article", title: "OpenAI harness note", url: "https://openai.com/a", approved: true, rights_access: approvedRights() }]
	});
	const out = run(["--apply", "--refresh-graph", "--config", cfg, "--state-dir", "state", "--raw-dir", "raw/kb", "--graph-dir", "graphify-out"], dir, { PATH: `${bin}:${process.env.PATH}` });
	assert.equal(out.promoted_count, 1);
	assert.equal(out.graph.action, "graphify_update");
	assert.equal(readFileSync(spy, "utf8").trim(), "update .");
	assert.ok(existsSync(join(dir, out.promoted[0].path)));
	const md = readFileSync(join(dir, out.promoted[0].path), "utf8");
	assert.match(md, /rights_license: public page/);
});

test("apply runs are duplicate-safe idempotent and changed same-path content is detected", () => {
	const dir = tmpRepo();
	const file = join(dir, "data", "books", "approved.txt");
	writeFileSync(file, "v1");
	writeFileSync(`${file}.rights.json`, JSON.stringify({ license: "owned", access: "local", approved_by: "tester", approved_at: "2026-05-23" }));
	const cfg = writeConfig(dir, { local_books: [{ path: "data/books" }], local_transcripts: [], article_queries: [], paper_feeds: [], youtube_candidates: [], review_queue: [] });
	const first = run(["--apply", "--config", cfg, "--state-dir", "state", "--raw-dir", "raw/kb", "--graph-dir", "graphify-out"], dir);
	assert.equal(first.promoted_count, 0, "books require explicit approved true even with rights");
	const second = run(["--apply", "--config", cfg, "--state-dir", "state", "--raw-dir", "raw/kb", "--graph-dir", "graphify-out"], dir);
	assert.equal(second.promoted_count, 0);
	writeFileSync(file, "v2");
	const third = run(["--apply", "--config", cfg, "--state-dir", "state", "--raw-dir", "raw/kb", "--graph-dir", "graphify-out"], dir);
	assert.equal(third.changed_existing_count, 1);
});

test("scheduler smoke and GRAPHIFY_KB_ARGS env template enforce daily bounded locked explicit-env logging", () => {
	const out = run(["--scheduler-smoke"], ROOT);
	assert.equal(out.ok, true);
	assert.equal(out.checks.working_directory, true);
	assert.equal(out.checks.graphify_kb_args_template, true);
	const timer = readFileSync(join(ROOT, ".pi/harness/corpus/systemd/graphify-kb-updater.timer"), "utf8");
	const cron = readFileSync(join(ROOT, ".pi/harness/corpus/cron.example"), "utf8");
	const envTemplate = readFileSync(join(ROOT, ".pi/harness/corpus/systemd/graphify-kb-updater.env.template"), "utf8");
	assert.match(timer, /OnCalendar=\*-\*-\* 08:30:00/);
	assert.match(cron, /^30 8 \* \* \*/m);
	assert.match(envTemplate, /^GRAPHIFY_KB_ARGS=--apply --refresh-graph --pilot-report --max-promotions 25$/m);
});

test("repo release policy gate uses explicit taxonomy and allowlist source classes", () => {
	const dir = tmpRepo();
	const cfg = writeConfig(dir, {
		source_taxonomy: {
			repo: { category: "public_repo_metadata", risk_class: "low" },
			release: { category: "public_release_metadata", risk_class: "low" }
		},
		auto_promote_allowlist: true,
		allowlist: [{ domain: "github.com", approved: true, approved_by: "tester", approved_at: "2026-05-23", allowed_source_classes: ["release"] }],
		local_books: [], local_transcripts: [], article_queries: [], paper_feeds: [], youtube_candidates: [],
		repo_sources: [{ title: "Repo metadata", url: "https://github.com/example/repo", approved: false, rights_access: approvedRights() }],
		release_feeds: [{ title: "Release metadata", url: "https://github.com/example/repo/releases", approved: true, rights_access: approvedRights() }],
		review_queue: []
	});
	const out = run(["--dry-run", "--config", cfg, "--state-dir", "state", "--raw-dir", "raw/kb", "--graph-dir", "graphify-out"], dir);
	assert.equal(out.counts.by_kind.repo, 1);
	assert.equal(out.counts.by_kind.release, 1);
	assert.equal(out.planned_promotions, 1, "release is allowlisted for auto-promotion");
	assert.equal(out.staged_count, 1, "repo stages because allowlist does not authorize repo class");
	assert.equal(out.review_queue[0].kind, "repo");
	assert.equal(out.review_queue[0].reason, "manual_approval_required");
});

test("reports include taxonomy, provenance, allowlist, competitor, stale, graph, and failure fields", () => {
	const dir = tmpRepo();
	const cfg = writeConfig(dir, {
		source_taxonomy: { article: { category: "public_article", risk_class: "low" } },
		competitor_taxonomy: { ai_coding_agents: { keywords: ["codex"] } },
		auto_promote_allowlist: true,
		allowlist: [{ domain: "openai.com", approved: true, approved_by: "tester", approved_at: "2026-05-23" }],
		local_books: [], local_transcripts: [], article_queries: [], paper_feeds: [], youtube_candidates: [],
		review_queue: [{ kind: "article", title: "Codex update", url: "https://openai.com/codex", approved: true, rights_access: approvedRights() }]
	});
	const out = run(["--dry-run", "--config", cfg, "--state-dir", "state", "--raw-dir", "raw/kb", "--graph-dir", "graphify-out"], dir);
	assert.equal(out.counts.by_kind.article, 1);
	assert.equal(out.counts.by_competitor_label.ai_coding_agents, 1);
	assert.equal(out.counts.allowlisted, 1);
	assert.ok(Array.isArray(out.stale_warnings));
	assert.equal(out.failure_count, 0);
	assert.equal(out.staged_count, 0);
	assert.equal(out.review_queue_count, 0);
	assert.equal(out.graph.action, "skipped_noop");
});

test("runbook web policy guard rejects raw HTTP paths outside approved harness abstraction", () => {
	const res = spawnSync("node", [".pi/scripts/harness-web-policy-guard.mjs"], { cwd: ROOT, encoding: "utf8" });
	assert.equal(res.status, 0, res.stderr || res.stdout);
	const out = JSON.parse(res.stdout);
	assert.equal(out.ok, true);
});
