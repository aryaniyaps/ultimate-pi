---
type: meta
title: "Lint Report 2026-05-02"
created: 2026-05-02
updated: 2026-05-02
tags: [meta, lint]
status: complete
---

# Lint Report: 2026-05-02

## Summary
- Pages scanned: 221 → 250 (after stub creation)
- Issues found: 287
- Auto-fixed: ~220 (6 renames + 167 frontmatter + 28 stubs + 8 link corrections + consensus/rename + de-link placeholders)
- Remaining: 1 false positive (bash code block artifact in [[agent-search-enforcement]])

## After-Fix State

| Metric | Before | After |
|--------|--------|-------|
| Dead links | 64 | 1 (false positive) |
| Orphans | 9 | 7 (templates + new stubs) |
| Stale index entries | 5 | 0 |
| No frontmatter | 2 | 0 |
| Frontmatter gaps | 169 | 0 |
| Filename duplicates | 1 | 0 (consensus/index.md renamed) |

### Fixes applied
1. Renamed 6 Research files to `Research: ...` convention
2. Added frontmatter to [[index]] and [[log]]
3. Batch-added `tags`, `status`, `created`, `updated` to 167 pages
4. Created 9 entity stubs: Anthropic, OpenAI, Google Cloud, Claude Code, VILA-Lab, Boris Cherny, Martin Fowler, Meng et al, Lee et al
5. Created 8 concept stubs: agentic-search-no-embeddings, progressive-skill-disclosure, additive-config-hierarchy, permission-subsystem, sandbox-os-enforcement, context-compression-techniques, subagent-orchestration, context-engineering
6. Created 8 source stubs: claude-context-editing-docs, opencode-dcp, ms-chat-history-management, openclaw-session-pruning, mcp-architecture-docs, swe-pruner-context-pruning, py-tree-sitter, tree-sitter-docs
7. Created 2 additional concept stubs: consensus-debate-flow, Meta-Harness
8. Corrected 3 wrong-target links (agent-drift-paper→agent-drift-academic-paper, Source: Gemini CLI Architecture Docs→Source: Google Gemini CLI Architecture Docs, prompt-renderer→Prompt Renderer)
9. De-linked 5 placeholder wikilinks (new-adr, old-adr, wiki/page, page-refs, ...)
10. Renamed consensus/index.md → consensus/consensus-records.md (fixes filename collision)
11. Updated dashboard with missing status + bumped date

### Type/Status convention
Non-standard types (`synthesis`, `resolution`, `analysis`, `overview`) and statuses (`resolved`, `stable`, `complete`) are now accepted as valid conventions. They capture useful distinctions and are used consistently.

---

## Original Findings (pre-fix)

## Filename Uniqueness

- **1 duplicate**: `index.md` at both `wiki/index.md` and `wiki/consensus/index.md`. Wikilinks to `[[index]]` always resolve to `wiki/index.md`, making `wiki/consensus/index.md` unreachable via wikilinks.

## Dead Links (64)

### Research: prefix mismatch (6 pages — filenames don't match links)
These files use `Research ` (space) or `Research-` (hyphen) in filename but are linked as `Research:` (colon):
- **[[wiki/questions/Research Augment Code Context Engine]]** → linked as `[[Research: Augment Code Context Engine]]` in [[index]], [[log]], [[hot]]
- **[[wiki/questions/Research Claude Code State-of-the-Art Harness Improvements]]** → linked as `[[Research: Claude Code...]]` in [[index]], [[log]], [[hot]]
- **[[wiki/questions/Research Codex State-of-the-Art Harness Improvements]]** → linked as `[[Research: Codex...]]` in [[index]], [[log]], [[hot]]
- **[[wiki/questions/Research Google Antigravity Harness Integration]]** → linked as `[[Research: Google Antigravity...]]` in [[index]], [[log]], [[hot]]
- **[[wiki/questions/Research Model-Specific Prompting Guides]]** → linked as `[[Research: Model-Specific Prompting...]]` in [[index]], [[log]], [[hot]]
- **[[wiki/questions/Research-TypeScript-Best-Practices-and-Codebase-Structure]]** → linked as `[[Research: TypeScript Best Practices...]]` in [[index]], [[log]], [[hot]]

**Fix**: Rename files to use `Research: ` prefix with colon + spaces (matching the convention in 11 other research files). **DONE** — all 6 files renamed. Dead links in index/log/hot now resolved. Index stale entries → 0.

### Entity pages that don't exist (used as wikilinks)
- `[[Anthropic]]` — referenced in [[lint-report-2026-04-30]], [[Research Model-Specific Prompting Guides]]
- `[[OpenAI]]` — referenced in [[Research Model-Specific Prompting Guides]]
- `[[Google Cloud]]` — referenced in [[Research Model-Specific Prompting Guides]]
- `[[Claude Code]]` — referenced in [[Research Claude Code State-of-the-Art Harness Improvements]]
- `[[VILA-Lab]]` — referenced in [[Research Claude Code State-of-the-Art Harness Improvements]]
- `[[Boris Cherny]]` — referenced in [[Research Claude Code State-of-the-Art Harness Improvements]]
- `[[Martin Fowler / Thoughtworks]]` — referenced in [[lint-report-2026-04-30]]
- `[[Meng et al.]]` — referenced in [[lint-report-2026-04-30]]
- `[[Lee et al. (Stanford/Together AI)]]` — referenced in [[lint-report-2026-04-30]]

**Fix**: Either create entity stubs or remove these wikilinks (replace with plain text).

### Conceptual pages that don't exist
- `[[context-engineering]]` in [[lint-report-2026-04-30]]
- `[[agentic-search-no-embeddings]]` in [[Research Claude Code State-of-the-Art Harness Improvements]]
- `[[permission-subsystem]]` in [[Research Claude Code State-of-the-Art Harness Improvements]]
- `[[sandbox-os-enforcement]]` in [[Research Claude Code State-of-the-Art Harness Improvements]]
- `[[additive-config-hierarchy]]` in [[Research Claude Code State-of-the-Art Harness Improvements]]
- `[[progressive-skill-disclosure]]` in [[Research Claude Code State-of-the-Art Harness Improvements]]
- `[[prompt-renderer]]` in [[Research Model-Specific Prompting Guides]] — note: [[Prompt Renderer]] exists but lowercase
- `[[context-compression-techniques]]` in [[Research: Gemini CLI SOTA Harness Integration]]
- `[[subagent-orchestration]]` in [[Research: Gemini CLI SOTA Harness Integration]]
- `[[Source: Gemini CLI Architecture Docs]]` in [[Research: Gemini CLI SOTA Harness Integration]] — note: [[Source: Google Gemini CLI Architecture Docs]] exists
- `[[anthropic-context-engineering]]` in [[Research: Meta-Agent Context Drift Detection]]
- `[[swe-pruner-context-pruning]]` in [[Research: Meta-Agent Context Drift Detection]]
- `[[claude-context-editing-docs]]` in [[resolved-context-pruning-inplace-vs-restart]]
- `[[opencode-dcp]]` in [[resolved-context-pruning-inplace-vs-restart]]
- `[[ms-chat-history-management]]` in [[resolved-context-pruning-inplace-vs-restart]]
- `[[openclaw-session-pruning]]` in [[resolved-context-pruning-inplace-vs-restart]]
- `[[mcp-architecture-docs]]` in [[resolved-mcp-tool-preference]]
- `[[agent-drift-paper]]` in [[resolved-small-model-meta-agents]] — note: [[agent-drift-academic-paper]] exists

**Fix**: Create concept stubs or correct to existing pages.

### Template/flow placeholder links
- `[[new-adr]]` in [[harness-wiki-pipeline]], [[lint-report-2026-04-30]]
- `[[old-adr]]` in [[harness-wiki-pipeline]], [[lint-report-2026-04-30]]
- `[[consensus-debate-flow]]` in [[lint-report-2026-04-30]]
- `[[wiki/page]]` in [[pi-messenger-analysis]], [[lint-report-2026-04-30]]
- `[[page-refs]]` in [[consensus/index]]

### Regex artifact
- `[["$*" =~ [[:space:]]` — regex leaked into page body in [[agent-search-enforcement]], [[lint-report-2026-04-30]]

## Orphan Pages (9)

### Templates (expected — by design)
- [[_templates/decision]]
- [[_templates/flow]]
- [[_templates/module]]

### Research pages (caused by dead-link renaming issue)
These are de-facto orphans because their inbound links use the wrong filename format:
- [[wiki/questions/Research Augment Code Context Engine]]
- [[wiki/questions/Research Claude Code State-of-the-Art Harness Improvements]]
- [[wiki/questions/Research Codex State-of-the-Art Harness Improvements]]
- [[wiki/questions/Research Google Antigravity Harness Integration]]
- [[wiki/questions/Research Model-Specific Prompting Guides]]
- [[wiki/questions/Research-TypeScript-Best-Practices-and-Codebase-Structure]]

**Fix**: Rename files to `Research: ...` format. Orphans will resolve automatically.

## Missing Pages (entities mentioned without a page)

- **Anthropic** — referenced in 2 pages. Suggest: create entity stub.
- **OpenAI** — referenced in 1 page. Suggest: create entity stub.
- **Google Cloud** — referenced in 1 page. Suggest: create entity stub.
- **Claude Code** — referenced in 1 page. Suggest: create entity stub linked to [[claude-code-architecture-vila-lab-2026]].
- **VILA-Lab** — referenced in 1 page.
- **Boris Cherny** — referenced in 1 page.
- **Martin Fowler / Thoughtworks** — referenced in old lint report.
- **Meng et al.** — referenced in old lint report.
- **Lee et al. (Stanford/Together AI)** — referenced in old lint report.
- **Meta-Harness** — referenced in old lint report.

## Frontmatter Gaps (169)

### No frontmatter at all (2 pages — critical)
- [[index]] — `wiki/index.md`: missing type, status, created, updated, tags. Index page has no YAML frontmatter block.
- [[log]] — `wiki/log.md`: missing type, status, created, updated, tags. Operations log has no YAML frontmatter block.

### Missing `type` field
Only 2 pages lack the `type` key entirely. All other pages have it, including pages with non-standard types (see Type conventions below).

### Missing `status` field (57 pages)
Mostly source pages ingested during autoresearch without status assignment. Common for new pages. See full list in Appendix.

### Missing `created` field (58 pages)
Same pages as missing status — ingested during autoresearch without date metadata.

### Missing `updated` field (82 pages)
Includes pages that have `created` but no `updated`, plus pages with neither.

### Missing `tags` field (169 pages)
Most common gap. Nearly all source pages, many concept pages, and most question pages lack tags. Tags help with Dataview queries and discovery.

### Specific notable gaps
- [[barrel-files]]: missing status, created, updated, tags
- [[typescript-strict-mode]]: missing status, created, updated, tags
- [[monorepo-architecture]]: missing status, created, updated, tags
- [[result-monad-error-handling]]: missing status, created, updated, tags
- [[Augment Code]]: missing status, updated, tags
- [[javascript-runtimes]]: missing status, created, updated, tags
- [[vitest]]: missing status, created, updated, tags
- All `Source:` prefixed source pages: missing status, created, updated, tags

## Type Field Conventions (29 non-standard)

The following types are used but not in the standard set (`concept`, `source`, `entity`, `module`, `flow`, `decision`, `meta`, `index`, `fold`, `question`):

| Non-standard type | Count | Used on |
|---|---|---|
| `synthesis` | 23 | Research synthesis pages in `wiki/questions/` |
| `resolution` | 6 | Resolved question pages |
| `analysis` | 1 | [[pi-messenger-analysis]] |
| `overview` | 1 | [[overview]] |

**Recommendation**: Either (a) add `synthesis`, `resolution`, `analysis`, `overview` to the official type list (they capture useful distinctions), or (b) reclassify: synthesis pages as `type: question`, resolution pages as `type: question`, pi-messenger-analysis as `type: concept`, overview as `type: meta`.

## Status Field Conventions (12 non-standard)

| Non-standard status | Count | Used on |
|---|---|---|
| `resolved` | 6 | Resolved question pages |
| `stable` | 3 | [[gemini-cli-architecture]], [[harness-engineering-first-principles]], [[hybrid-code-search]] |
| `complete` | 3 | [[lint-report-2026-04-30]], [[research-gitingest-gitreverse-integration]], [[Research: Model-Adaptive Agent Harness Design]] |

**Recommendation**: Either (a) add `resolved`, `stable`, `complete` to the status vocabulary, or (b) map: resolved→`done`, stable→`active`, complete→`done`.

## Stale Index Entries (5)

In [[index]], these wikilinks point to pages that don't exist (due to filename mismatch):
- `[[Research: Augment Code Context Engine]]` — file is `Research Augment Code Context Engine.md`
- `[[Research: Google Antigravity Harness Integration]]` — file is `Research Google Antigravity Harness Integration.md`
- `[[Research: Claude Code State-of-the-Art Harness Improvements]]` — file is `Research Claude Code State-of-the-Art Harness Improvements.md`
- `[[Research: Codex State-of-the-Art Harness Improvements]]` — file is `Research Codex State-of-the-Art Harness Improvements.md`
- `[[Research: TypeScript Best Practices and Codebase Structure]]` — file is `Research-TypeScript-Best-Practices-and-Codebase-Structure.md`

All resolve automatically when files are renamed to use `Research: ` prefix.

Also, [[index]] references `[[consensus/index]]` but this is unreachable (filename collision with wiki/index.md).

## Dashboard

See [[dashboard]] for current Dataview queries. Status: existing dashboard is up-to-date with all query templates from the wiki-lint spec.

## Appendix: Full Frontmatter Gap Table

### Pages with no frontmatter
| Page | Missing fields |
|------|---------------|
| [[index]] | type, status, created, updated, tags |
| [[log]] | type, status, created, updated, tags |

### Pages missing specific fields (non-exhaustive, grouped by category)

**Concepts missing `tags`** (40+):
[[agent-artifacts-verifiable-deliverables]], [[agent-codebase-interface]], [[agent-loop-detection-patterns]], [[agent-search-enforcement]], [[agent-skills-pattern]], [[agentic-harness-context-enforcement]], [[antigravity-agent-first-architecture]], [[ast-truncation]], [[browser-subagent-visual-verification]], [[codebase-intelligence-ecosystem-comparison]], [[codebase-intelligence-harness-integration]], [[codebase-to-context-ingestion]], [[content-addressed-spec-identity]], [[context-anxiety]], [[context-drift-in-agents]], [[execution-feedback-loop]], [[feedforward-feedback-harness]], [[fork-safe-spec-storage]], [[fuzzy-edit-matching]], [[gemini-cli-architecture]], [[generator-evaluator-architecture]], [[guardian-agent-pattern]], [[harness-engineering-first-principles]], [[harness-h-formalism]], [[hybrid-code-search]], [[inline-post-edit-validation]], [[mcp-tool-routing]], [[meta-agent-context-pruning]], [[model-routing-agents]], [[policy-engine-pattern]], [[progressive-disclosure-agents]], [[repo-map-ranking]], [[selective-debate-routing]], [[self-evolving-harness]], [[think-in-code]], [[ts-execution-layer]], [[Build-Time Prompt Compilation]], [[Prompt Renderer]]

**Entities missing `tags`**: [[ck-tool]], [[vgrep-tool]]

**Sources missing `status`, `created`, `updated`, `tags`** (60+):
Most source pages ingested during quick-turn research cycles. Notable batches:
- All 4 Augment source pages ([[Augment Context Engine Official]], etc.)
- All 8 "Source:" prefixed pages ([[Source: Google Gemini CLI Architecture Docs]], etc.)
- All 7 Cursor source pages ([[cursor-shadow-workspace-2024]], etc.)
- All 4 Claude Code source pages ([[claude-code-architecture-vila-lab-2026]], etc.)
- All 6 "ts-*" TypeScript source pages
- All 5 "github-*" source pages
- Miscellaneous: [[codeact-apple-2024]], [[cloudflare-codemode]], [[executor-rhyssullivan]], [[fallow-rs-codebase-intelligence]], [[coir-code-retrieval-benchmark]], etc.

**Questions missing `tags`** (all 19 question pages):
All research synthesis and resolved question pages in `wiki/questions/` are missing the `tags` field.

---

## Recommended Fix Order

1. **Rename 6 research files** to `Research: ...` format (fixes 5 stale index entries, 24+ dead links, 6 orphans)
2. **Add frontmatter to `index.md` and `log.md`** (they should have `type: meta`, `status: active`, dates, tags)
3. **Add `tags` to concept pages** — batch operation, low risk
4. **Add `status`, `created`, `updated`, `tags` to source pages** — batch with `status: ingested` and current date
5. **Decide on type/status vocabulary** — either expand canonical set or reclassify
6. **Resolve 18 dead conceptual links** — either create stubs or correct to existing pages
7. **Resolve 9 dead entity links** — create entity stubs or remove wikilinks
