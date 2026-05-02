---
type: meta
title: "Lint Report 2026-04-30"
created: 2026-04-30
updated: 2026-04-30
tags: [meta, lint]
status: complete
---

# Lint Report: 2026-04-30 (Auto-fixes applied)

## Summary
- Pages scanned: 94
- Issues found: 28
- Auto-fixed: 18
- Remaining: 10 (all expected: false positives, template placeholders, legacy)

---

## Auto-Fixed (18 issues resolved)

### Frontmatter Gaps Fixed (8)
- 6 source pages: added `status: ingested`, `created: 2026-04-30`, `updated: 2026-04-30`
  - [[anthropic2026-harness-design]], [[bockeler2026-harness-engineering]], [[fan2025-imad]], [[lee2026-meta-harness]], [[lou2026-autoharness]], [[meng2026-agent-harness-survey]]
- [[pi-messenger-analysis]]: added `status: developing`
- [[hot]]: added `status: active`

### Dead Links Fixed (8)
| Was | Now | File |
|-----|-----|------|
| `[[context-engineering]]` | (removed) | [[context-anxiety]] |
| `[[consensus-debate-flow]]` | `[[consensus-debate]]` | [[index]] |
| `[[Anthropic]]` | `[[anthropic2026-harness-design]]` | [[research-agentic-coding-harness-latest-papers]] |
| `[[Meng et al]]` | `[[meng2026-agent-harness-survey]]` | [[research-agentic-coding-harness-latest-papers]] |
| `[[Martin Fowler]]` | `[[bockeler2026-harness-engineering]]` | [[research-agentic-coding-harness-latest-papers]] |
| `[[Lee et al]]` | `[[lee2026-meta-harness]]` | [[research-agentic-coding-harness-latest-papers]] |
| `[[Meta-Harness]]` | `[[lee2026-meta-harness]]` | [[lou2026-autoharness]] |

### Stale Index Fixed (1)
- [[index]] line 120: `[[consensus-debate-flow]]` → `[[consensus-debate]]`

---

## Remaining Issues (10 — all expected)

### False Positives (1)
| Link | In File | Reason |
|------|---------|--------|
| `[[ "$*" =~ [[:space:]] ]]` | [[agent-search-enforcement]] | Bash code block — not a wikilink |

### Template Placeholders (3)
| Link | In File | Status |
|------|---------|--------|
| `[[new-adr]]` | [[harness-wiki-pipeline]] | Template example, intentional |
| `[[old-adr]]` | [[harness-wiki-pipeline]] | Template example, intentional |
| `[[wiki/page]]` | [[pi-messenger-analysis]] | JSON example data, intentional |

### Orphan Pages (6 — all expected)
- `_templates/decision`, `_templates/flow`, `_templates/module` — template files
- `meta/dashboard`, `meta/lint-report-2026-04-30` — meta artifacts
- `overview` — seed entry point, linked from outside wiki

---

## Empty Sections

All template files (expected): `_templates/decision.md`, `_templates/flow.md`

---

## Naming Convention Deviation

91/94 files use kebab-case instead of Title Case with spaces. Systematic vault-wide deviation. Changing filenames would break all wikilinks. Requires planned restructure.

---

## Writing Style

- [[context-anxiety]] line 37: "Largely eliminated" — add `> [!gap]` annotation during next content pass.

---

## Address Validation

Skipped. DragonScale not configured (`scripts/allocate-address.sh` not found).

## Semantic Tiling

Skipped. Tiling script not available (`scripts/tiling-check.py` not found).

---

## Artifacts Updated

- `vault/wiki/meta/lint-report-2026-04-30.md` — this report
- `vault/wiki/meta/dashboard.md` — unchanged (queries still valid)
