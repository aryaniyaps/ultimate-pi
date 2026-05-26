# Harness Web Retrieval Stack (WRS)

Internal reference for multi-angle search, fusion, and agent workflows. User-facing procedures: **web-retrieval** skill (install + env).

## Outcomes (Exa analog)

| Outcome | Primitive |
|---------|-----------|
| Discovery / recall | `search-deep` + RRF |
| Precision | Multi-angle + optional `HARNESS_WEB_RERANK=lexical` |
| Evidence / highlights | `web_fetch(highlights)` |
| Similar pages | `find-similar` CLI / `web_find_similar` |
| Synthesis | `evidence-bundle` + `web-answerer` |

## CLI

```bash
python3 .pi/scripts/harness-web.py search-deep "query" \
  --angles-file .web/angles.yaml -o .web/search-deep.json
python3 .pi/scripts/harness-web.py search-deep "query" --expand-heuristic -o .web/search-deep.json
python3 .pi/scripts/harness-web.py find-similar "https://example.com" -o .web/search-deep.json
python3 .pi/scripts/harness-web.py contents-batch --from-search .web/search-deep.json -o .web/contents/
```

## Python modules

- `harness_web/query_angles.py` — parse expander YAML
- `harness_web/multi_search.py` — parallel per-angle SERP
- `harness_web/rank.py` — normalize URL, RRF, lexical rerank
- `harness_web/deep_search.py` — orchestration
- `harness_web/highlights.py` — excerpt scoring
- `harness_web/evidence_bundle.py` — merge for answerer

## Artifacts

**Cache** (pooled): `.web/cache/<kind>/<cacheKey>/` with `meta.json` (search context, `createdAt`, `expiresAt`, `hitCount`).

**Workspace** (default `.web/`): tool aliases agents read. `web_search` / `web_fetch` set `cacheHit`, `cacheKey`, `cachePath` in details.

| Env / param | Effect |
|-------------|--------|
| `HARNESS_WEB_CACHE_TTL_SEC` | Default TTL (86400) |
| `HARNESS_WEB_CACHE=0` | Disable cache |
| `refreshCache: true` | Bypass cache |
| `cacheMaxAge` | Max reuse age (seconds) |
| `HARNESS_WEB_ISOLATE=1` | Per-run/session dirs (legacy) |

| File | Content |
|------|---------|
| `angles.yaml` | Expander output |
| `search-deep.json` | Fused SERP + scores + `angle_ids` |
| `evidence-bundle.json` | URLs + snippets + highlights |
| `answer.md` | Cited synthesis |

## Subagents (`.pi/agents/harness/web-retrieval/`)

| Spawn id | Role |
|----------|------|
| `harness/web-retrieval/web-query-expander` | Angles YAML (default research) |
| `harness/web-retrieval/web-query-expander-fast` | 2–3 angles (latency) |
| `harness/web-retrieval/web-gap-analyzer` | Follow-up angles |
| `harness/web-retrieval/web-answerer` | Cited answer |
| `harness/web-retrieval/web-summarizer` | Single-page digest |
| `harness/web-retrieval/web-criteria-verifier` | Criteria scoring |

## Heuristic angles config (user-extensible)

Emergency templates for `expandHeuristic:true` / `--expand-heuristic` load from YAML:

| File | Role |
|------|------|
| `<package>/.pi/harness/web-heuristic-angles.yaml` | Built-in defaults (code → github, stackoverflow, …) |
| `<project>/.pi/harness/web-heuristic-angles.yaml` | **Your** extensions (merged on top) |

Copy [examples/web-heuristic-angles.project.yaml](../examples/web-heuristic-angles.project.yaml) into an external project’s `.pi/harness/` to add sites per category or define new categories (use `category` on `web_search`).

Query templates use `{query}` as the user search string. Same `id` in a category replaces the package angle.

Optional: `HARNESS_WEB_HEURISTIC_ANGLES_FILE=/path/to/custom.yaml` (merged last).

## Environment

| Variable | Default |
|----------|---------|
| `HARNESS_WEB_SEARCH_ENGINE` | `ddg_html` |
| `HARNESS_WEB_DEEP_CONCURRENCY` | `4` |
| `HARNESS_WEB_RERANK` | `off` |
| `HARNESS_WEB_FAST_MODEL` | expander-fast, summarizer, gap-analyzer |
| `HARNESS_WEB_EXPANDER_MODEL` | full query expander |
| `HARNESS_WEB_QUALITY_MODEL` | answerer, criteria-verifier |
| `HARNESS_WEB_HEURISTIC_ANGLES_FILE` | Extra heuristic angles YAML (merged last) |
| `HARNESS_PROJECT_ROOT` | Project root for `.pi/harness/web-heuristic-angles.yaml` |
| `HARNESS_PKG_ROOT` | Package root for default heuristic YAML |

Values use Pi `provider/model-id` format (any provider your install supports). Unset → subagent inherits parent session model. See **web-retrieval** skill.

ADR: [0050-web-retrieval-retrieval-stack.md](adrs/0050-web-retrieval-retrieval-stack.md)
