# ADR 0050: Agentic Web Retrieval Stack (WRS)

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** ultimate-pi harness team

## Context

Harness agents treated `web_search` as single-query SERP, yielding poor recall on ambiguous research questions. Exa-style outcomes (multi-angle discovery, fusion, evidence, synthesis) are needed without Exa API, MCP, or a neural index at Exa scale.

## Decision

Introduce **WRS** as the default non-API web layer:

1. **Tiers** on `web_search`: `instant`, `standard`, **`deep`** (default for research), `research`.
2. **Planning subagents** under `.pi/agents/harness/web-retrieval/` — e.g. `harness/web-retrieval/web-query-expander` produces `.web/angles.yaml`; parent runs `web_search(tier=deep, anglesFile=…)`.
3. **Python fusion**: parallel metasearch per angle (DDG HTML or SearXNG) + RRF (`k=60`) + optional lexical rerank.
4. **Extension tools**: `web_find_similar`, `web_contents`, `web_fetch` highlights.
5. **Synthesis subagents** (same directory): `web-answerer`, `web-gap-analyzer`, `web-criteria-verifier`, `web-summarizer`, `web-query-expander-fast`.
6. **web-retrieval** skill as canonical workflow; **SYSTEM.md** mandates deep default and anti-patterns.
7. **context7** remains sole path for library API documentation.
8. **User model routing:** env vars `HARNESS_WEB_FAST_MODEL`, `HARNESS_WEB_EXPANDER_MODEL`, `HARNESS_WEB_QUALITY_MODEL` (any Pi `provider/model-id`); else parent session or agent `model:` override.
9. **Pooled local cache:** `.web/cache/` keyed by search/fetch context with TTL (`HARNESS_WEB_CACHE_TTL_SEC`); workspace aliases under `.web/`. Optional `HARNESS_WEB_ISOLATE=1` for per-run/session dirs.

Subagents are **not** spawned inside tool `execute()`; parent orchestrates expander → deep → fetch.

## Consequences

### Positive

- Higher recall on landscape / prior-art questions without paid search APIs.
- Path-first `.web/` artifacts for harness-plan debate.
- Contract checks in `harness-verify.mjs` keep guidance aligned with tools.

### Negative / trade-offs

- Deep search is slower (N parallel SERP calls).
- Heuristic `--expand-heuristic` is weaker than expander subagent (templates from mergeable `.pi/harness/web-heuristic-angles.yaml`; projects extend via same path under their repo).
- No embedding index; O3 precision is approximate vs Exa neural search.

## References

- `.pi/harness/docs/harness-web-search.md`
- `.agents/skills/web-retrieval/SKILL.md`
- `.pi/extensions/harness-web-tools.ts`
- Plan: `.cursor/plans/exa-style_harness_web_fd231183.plan.md`
