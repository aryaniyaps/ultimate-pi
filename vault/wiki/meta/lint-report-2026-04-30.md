---
type: meta
title: "Lint Report 2026-04-30"
created: 2026-04-30
updated: 2026-04-30
tags: [meta, lint]
status: complete
---

# Lint Report: 2026-04-30

## Summary
- Pages scanned: 72 (excluding meta)
- Issues found: 71
- Auto-fixed: 68
- Needs review: 3 (all expected/acceptable)

---

## Auto-Fixed (68 issues resolved)

### Frontmatter gaps (48 → 0)
All pages now have: `type`, `title`, `created`, `updated`, `status`, `tags`.
- 13 source pages: added missing fields
- 22 concept/entity/question/module pages: added missing fields
- 3 template pages: added `created`, `updated`
- `overview`: added complete frontmatter

### Dead links resolved (11)
- `[[agent-first-exploration]]` → `[[research-agent-first-codebase-exploration]]`
- `[[Progressive Disclosure for Agents]]` → `[[progressive-disclosure-agents]]`
- `[[Adversarial Verification]]` → `[[adversarial-verification]]`
- `[[automated-observability\]]` → `[[automated-observability]]` (typo + escaped pipe)
- `[[lean-ctx]]` — stub created, index entry now resolves
- `[[agentic-harness]]` — stub created
- 3 log.md entries updated to correct filenames
- `[[ast-compression]]`, `[[context-mode]]`, `[[shell-pattern-compression]]`, `[[fts5-sandbox]]`, `[[context-continuity]]`, `[[verification-drift-detection]]`, `[[codesearch]]`, `[[autodev-codebase]]`, `[[ops-codegraph-tool]]` — stubs created

### Stub pages created (11)
- `concepts/agentic-harness.md`
- `concepts/context-mode.md`
- `concepts/ast-compression.md`
- `concepts/shell-pattern-compression.md`
- `concepts/fts5-sandbox.md`
- `concepts/context-continuity.md`
- `concepts/verification-drift-detection.md`
- `entities/lean-ctx.md`
- `entities/codesearch.md`
- `entities/autodev-codebase.md`
- `entities/ops-codegraph-tool.md`

### Style fix (1)
- `sources/gitreverse.md`: "kind of" → declarative

---

## Remaining (3 — all expected)

| Issue | Page | Status |
|-------|------|--------|
| `[[ "$*" =~ [[:space:]] ]]` | `concepts/agent-search-enforcement.md` | **False positive** — bash code block, not a wikilink |
| `[[new-adr]]` | `flows/harness-wiki-pipeline.md` | **Template placeholder** — pipeline doc example, intentional |
| `[[old-adr]]` | `flows/harness-wiki-pipeline.md` | **Template placeholder** — pipeline doc example, intentional |

---

## Orphan Pages (all expected)

- `_templates/decision`, `_templates/flow`, `_templates/module` — templates
- `overview.md` — seed entry point
- `meta/lint-report-2026-04-30.md`, `meta/dashboard.md` — meta artifacts

---

## Cross-Reference Gaps (informational)

Entities mentioned without wikilinks in some pages (harness, index, skills, extensions). Not auto-fixed — add wikilinks during next content pass.

---

## Artifacts Created

- `vault/wiki/meta/lint-report-2026-04-30.md` — this report
- `vault/wiki/meta/dashboard.md` — Dataview dashboard
- `vault/wiki/meta/overview.canvas` — visual domain map
- 11 stub pages (see above)

---

## Address Validation

Skipped. DragonScale not configured.

## Semantic Tiling

Skipped. Ollama/tiling script not available.
