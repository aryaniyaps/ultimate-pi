---
name: web-retrieval
description: |
  Agentic Web Retrieval Stack (WRS) — tiered web_search/web_fetch/web_contents (harness-web.py +
  Scrapling). Default tier=deep with web-query-expander angles. Use for search, scrape, landscape,
  prior art, comparisons, planning pre-research, cited answers, similar URLs, websets scoring.
  Triggers on non-API web research, scrape URL, web_search, web_fetch, .web/ artifacts.
  Library API docs → context7 only. Install: /harness-setup or harness-cli-verify.
allowed-tools: Read Write web_search web_fetch web_find_similar web_contents
---

# web-retrieval (WRS)

Maps user intent → **tier** + pipeline. Pi tools: `web_search`, `web_fetch`, `web_find_similar`, `web_contents` (wrap `harness-web.py`). **Pooled cache** under `.web/cache/`; workspace aliases under `.web/`.

**Never before search/fetch:** `UP_PKG` resolution, `ls harness-web.py`, `python3 -c "import scrapling"`, Firecrawl, curl/wget, or scrapling CLI for SERP/fetch.

## Workspace + cache (default)

| Layer | Path | Role |
|-------|------|------|
| **Cache** | `.web/cache/<kind>/<cacheKey>/` | Pooled SERP + fetch payloads with `meta.json` (query, tier, angles fingerprint, TTL) |
| **Workspace** | `.web/` (`angles.yaml`, `search-deep.json`, `page.md`, …) | Stable paths agents read/write; refreshed from cache on hit |

`web_search` / `web_fetch` return **`cacheHit`**, **`cacheKey`**, **`cachePath`** when reusing pooled results. Same intent + angles skips network until TTL expires.

| Control | Meaning |
|---------|---------|
| `HARNESS_WEB_CACHE_TTL_SEC` | Default freshness (86400 = 24h) |
| `HARNESS_WEB_CACHE=0` | Disable pooling |
| `refreshCache: true` on tool | Force network |
| `cacheMaxAge` on tool | Stricter max age (seconds) |

**Optional isolation** (parallel mutable synthesis): `HARNESS_WEB_ISOLATE=1` → `.web/runs/<run_id>/` or `.web/sessions/<pi_session_id>/` for `answer.md` / evidence when sessions must not share workspace files.

`web_search` responses include **`artifactDir`** (usually `.web`). Spawn web-retrieval subagents with `HARNESS_WEB_ARTIFACT_DIR` or `artifactDir` in the task.

## Tier table

| User intent | Tier | Steps |
|-------------|------|-------|
| One narrow fact (scoped) | `instant` or `standard` | `web_search({ query, tier })` — **no subagent** |
| Fast open-web with angles | `standard` or `deep` + heuristic | `web-query-expander-fast` **or** `expandHeuristic:true` |
| "What is X?" needs sources | `deep` | `web-query-expander` → deep → highlights |
| Landscape / how / compare | `deep` | `web-query-expander` → deep → `web_fetch` highlights top 3 |
| Answer with citations | `research` | deep → `web_contents` → `web-answerer` |
| Qualified list (Websets analog) | `research` + verifier | deep → `web-criteria-verifier` → CSV |
| More like this URL | — | `web_find_similar` |
| Library API docs | — | **context7** (not WRS) |

## Latency vs quality routing

| Priority | Search / subagent | Model / thinking |
|----------|-------------------|------------------|
| **Latency** | No expander: `tier=instant` or `standard` only | Parent session (pick a fast model in UI) |
| **Latency + angles** | `harness/web-retrieval/web-query-expander-fast` → `tier=deep` | `HARNESS_WEB_FAST_MODEL` (optional) |
| **Emergency angles (no LLM)** | `web_search({ tier: "deep", expandHeuristic: true, category? })` | Templates from `.pi/harness/web-heuristic-angles.yaml` (project file merges on top) |
| **Default research** | `harness/web-retrieval/web-query-expander` → `tier=deep` | `HARNESS_WEB_EXPANDER_MODEL` or parent |
| **Gap fill** | `harness/web-retrieval/web-gap-analyzer` | `HARNESS_WEB_FAST_MODEL` or parent |
| **Cited answer** | `harness/web-retrieval/web-answerer` | `HARNESS_WEB_QUALITY_MODEL` or parent |
| **Page digest** | `harness/web-retrieval/web-summarizer` | `HARNESS_WEB_FAST_MODEL` or parent |
| **Criteria scoring** | `harness/web-retrieval/web-criteria-verifier` | `HARNESS_WEB_QUALITY_MODEL` or parent |

## Configuring models (env vars)

WRS subagents need a **concrete** `provider/model-id` (same format as Pi — any provider your install supports). Set in shell, `.env`, or harness-synced project env:

| Variable | Applies to |
|----------|------------|
| `HARNESS_WEB_FAST_MODEL` | `web-query-expander-fast`, `web-summarizer`, `web-gap-analyzer` |
| `HARNESS_WEB_EXPANDER_MODEL` | `web-query-expander` |
| `HARNESS_WEB_QUALITY_MODEL` | `web-answerer`, `web-criteria-verifier` |

Example (use **your** provider/model ids):

```bash
export HARNESS_WEB_FAST_MODEL=your-provider/cheap-model
export HARNESS_WEB_EXPANDER_MODEL=your-provider/balanced-model
export HARNESS_WEB_QUALITY_MODEL=your-provider/strong-model
```

If unset for an agent, the subagent inherits the **parent session model** (pick a fast model in Pi when latency matters).

Optional per-agent override: `model:` in agent `.md` frontmatter or project `.pi/agents.policy.yaml` (before parent fallback).

## Deep pipeline (default for research)

1. `subagent` **`harness/web-retrieval/web-query-expander`** → parent saves `.web/angles.yaml`
2. `web_search({ query: "<intent>", tier: "deep", anglesFile: ".web/angles.yaml" })` — repeats hit cache when context unchanged
3. `read` `.web/search-deep.json` — prefer URLs with multiple `angle_ids`
5. `web_fetch({ url, highlights: true, highlightQuery: "<intent>" })` on top 3–5
6. Optional gap pass: `harness/web-retrieval/web-gap-analyzer` → new angles → second `web_search` deep

**Anti-patterns:** bare `web_search({ query })` for open questions; 3+ manual SERP loops; `bulk: true` without need.

## Research profile (`tier=research`)

After deep + highlight fetches:

```bash
python3 "$UP_PKG/.pi/scripts/harness-web.py" contents-batch \
  --from-search "$ARTIFACT_DIR/search-deep.json" \
  --evidence-bundle "$ARTIFACT_DIR/evidence-bundle.json" --limit 5
```

Spawn **`harness/web-retrieval/web-answerer`** with `artifactDir` / `answerPath: $ARTIFACT_DIR/answer.md`.

## Websets profile

Spawn **`harness/web-retrieval/web-criteria-verifier`** with NL criteria + `search-deep.json` candidates → `.web/webset-reasoning.yaml` / CSV manifest.

## Bash fallback (no pi tools)

```bash
python3 "$UP_PKG/.pi/scripts/harness-web.py" search-deep "query" \
  --expand-heuristic -o .web/search-deep.json --limit 10
```

## Subagents

| Agent | Role |
|-------|------|
| `harness/web-retrieval/web-query-expander` | Angles YAML (research / recall) |
| `harness/web-retrieval/web-query-expander-fast` | 2–3 angles (latency) |
| `harness/web-retrieval/web-gap-analyzer` | Follow-up angles |
| `harness/web-retrieval/web-answerer` | Cited answer |
| `harness/web-retrieval/web-summarizer` | Single-page digest |
| `harness/web-retrieval/web-criteria-verifier` | Criteria scoring |

## Heuristic angle templates (no LLM expander)

Package defaults: `.pi/harness/web-heuristic-angles.yaml` (`max_angles: 8`). Categories include targeted `site:` angles — e.g. **code**: GitHub, Stack Overflow, Stack Exchange, Read the Docs, MDN, npm/PyPI/Go/Rust registries, Microsoft Learn, HN; **paper**: arXiv, Semantic Scholar, Papers with Code, OpenReview; **security**: NVD, OWASP, CWE; plus **news**, **company**, **people**, **default**.

`web_search({ tier: "deep", expandHeuristic: true, category: "code" })`

**External projects:** copy `.pi/harness/examples/web-heuristic-angles.project.yaml` → `<project>/.pi/harness/web-heuristic-angles.yaml` and add or override angle ids. Use `{query}` in templates.

## Install (setup / humans only)

```bash
command -v uv &>/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh
uv tool install "scrapling[fetchers]"
scrapling install   # browser binaries for stealth scrape
bash "$UP_PKG/.pi/scripts/harness-cli-verify.sh"
```

Diagnostics: `python3 "$UP_PKG/.pi/scripts/harness-web.py" status` (JSON).

## Env

| Variable | Default | Purpose |
|----------|---------|---------|
| `HARNESS_WEB_FETCH_MODE` | `stealth` | `stealth` \| `fast` \| `auto` |
| `HARNESS_WEB_SEARCH_ENGINE` | `ddg_html` | `ddg_html` \| `searxng` (+ `HARNESS_WEB_SEARXNG_URL`) |
| `HARNESS_WEB_CACHE_TTL_SEC` | `86400` | Pooled cache TTL |
| `HARNESS_WEB_CACHE` | on | Set `0` to disable cache |
| `HARNESS_WEB_ISOLATE` | off | Set `1` for per-run/session workspace dirs |
| `HARNESS_WEB_RERANK` | — | `off` \| `lexical` |
| `HARNESS_WEB_DEEP_CONCURRENCY` | `4` | Parallel angle SERP |
| `HARNESS_WEB_HEURISTIC_ANGLES_FILE` | — | Extra heuristic angles YAML |
| `HARNESS_WEB_FAST_MODEL` / `EXPANDER` / `QUALITY` | — | Web subagent models |

Internal implementation notes are package-maintainer-only; this skill already contains the external-facing operating guidance.
