# Fold Page Template

Canonical output format for `wiki-fold`. Every fold page uses this layout exactly.

---

## Frontmatter

```yaml
---
type: fold
title: "Fold k{K} — {EARLIEST-DATE} to {LATEST-DATE} — n{COUNT}"
fold_id: "fold-k{K}-from-{EARLIEST-DATE}-to-{LATEST-DATE}-n{COUNT}"
batch_exponent: {K}
entry_count: {COUNT}
entry_range:
  from: "{EARLIEST-CHILD-DATE}"
  to: "{LATEST-CHILD-DATE}"
created: "{YYYY-MM-DD}"
updated: "{YYYY-MM-DD}"
tags:
  - meta
  - fold
  - "fold/k{K}"
status: mature
children:
  - date: "{YYYY-MM-DD}"
    op: "{save|ingest|fold|session|setup|decision}"
    title: "{log entry title verbatim}"
    page: "[[{canonical page wikilink}]]"
    page_missing: false
  # ... one record per log entry. No dedupe by page.
related:
  - "[[DragonScale Memory]]"
  - "[[log]]"
  - "[[index]]"
---
```

All fields are required. Missing any field is a dry-run failure. `title` does not contain the current date. `fold_id` is deterministic and matches the filename.

---

## Body Sections (in order, all required)

### 1. Scope (one paragraph)

```markdown
Level-{K} fold of {COUNT} log entries spanning {FROM} to {TO}. Dominant themes: {THEME-1}, {THEME-2}, {THEME-3}.
```

### 2. Child Entries

One row per log entry. Row count must equal `entry_count` in frontmatter and the length of `children:`.

```markdown
## Child Entries

| Date | Op | Title | Page | Summary (extractive) |
|---|---|---|---|---|
| 2026-04-23 | save | DragonScale Memory v0.2 — post-adversarial-review | [[DragonScale Memory]] | Adversarial-review rewrite; 7/7 critiques accepted after one surgical fix. |
| 2026-04-15 | save | Claude SEO v1.9.0 Slides and GitHub Release | [[2026-04-15-slides-and-release-session]] | 15-slide HTML deck, v1.9.0 tagged, GitHub release with PDF asset. |
<!-- one row per log entry; no dedupe by page -->
```

The Summary column is extractive: one sentence paraphrased from the log entry's bullets. If the source is ambiguous, write "ambiguous in source" rather than guessing.

### 3. Key Outcomes (3-7 bullets, extractive)

Every bullet must cite the specific child entry (by date) it draws from. Every numeric value must be grep-verifiable against that child entry. Count-check before emitting.

```markdown
## Key Outcomes

- {CONCRETE CHANGE 1, quoting or paraphrasing a child entry} (from 2026-04-14 session entry)
- {CONCRETE CHANGE 2, with numeric grep-verified against source} (from 2026-04-10 session entry)
<!-- max 7 bullets. Each bullet names a concrete artifact or decision AND cites its source entry. -->
```

### 4. Cross-entry Themes (0-4 bullets, must name contributing entries)

Themes are optional. If a theme cannot be supported by naming at least two child entries that contribute to it, do not write it.

```markdown
## Cross-entry Themes

- {THEME: describes a pattern supported by multiple entries} (supported by: 2026-04-14, 2026-04-15, 2026-04-23 entries)
```

Do not invent a theme to justify the fold. If no cross-entry patterns are present, write "No cross-entry themes identified; entries are independent within this range."

### 5. Contradictions or Corrections

```markdown
## Contradictions or Corrections

- None detected.
```

Or, if present:

```markdown
## Contradictions or Corrections

- [[Earlier Entry]] claimed X; [[Later Entry]] corrected to Y. Resolution: {STATUS}.
```

### 6. Links

The `Child Pages` section is **deduped by page**: one wikilink per unique target page, even if multiple log entries point at it. This is the graph-connection section, different from frontmatter `children:` which is **per log entry** (no dedupe).

```markdown
## Child Pages

- [[{UNIQUE-PAGE-1}]]
- [[{UNIQUE-PAGE-2}]]
<!-- dedupe by page; see frontmatter `children:` for per-entry records -->

## Related

- [[DragonScale Memory]] - fold-operator spec
- [[log]] - source entries
- [[index]] - vault catalog
```

---

## Notes

- No hot-cache update: that is the save/ingest skill's responsibility.
- No edits to child pages. Folds are strictly read-only with respect to children.
- If a child entry's referenced pages are missing, note "source missing" in the Summary column rather than fabricating content.
- The body is terse. A fold is a rollup, not a retelling. Target 200-400 lines total for a k=4 fold.
