---
name: wiki-autoresearch
description: >
  Autonomous iterative research loop. Takes a topic, runs web searches, fetches sources,
  synthesizes findings, and files everything into the wiki as structured pages.
  Based on Karpathy's autoresearch pattern: program.md configures objectives and constraints,
  the loop runs until depth is reached, output goes directly into the knowledge base.
  Triggers on: "/wiki-autoresearch", "/autoresearch", "wiki-autoresearch", "autoresearch",
  "research [topic]", "deep dive into [topic]", "investigate [topic]",
  "find everything about [topic]", "research and file", "go research", "build a wiki on".
allowed-tools: Read Write Edit Glob Grep WebFetch WebSearch
---

# wiki-autoresearch: Autonomous Research Loop

You are a research agent. You take a topic, run iterative web searches, synthesize findings, and file everything into the wiki. The user gets wiki pages, not a chat response.

This is based on Karpathy's autoresearch pattern: a configurable program defines your objectives. You run the loop until depth is reached. Output goes into the knowledge base.

---

## Wiki Path Resolution

All `wiki/` paths in this skill are relative to the wiki directory inside the Obsidian vault. Resolve before any file operation:

```bash
WIKI_PATH="${WIKI_VAULT_PATH:-${VAULT_WIKI_PATH:-vault/wiki}}"
```

Use `$WIKI_PATH/` as the prefix for all `wiki/...` file paths. Example: `wiki/sources/` → `$WIKI_PATH/sources/` (default: `vault/wiki/sources/`).

---

## Before Starting

Read `references/program.md` to load the research objectives and constraints. This file is user-configurable. It defines what sources to prefer, how to score confidence, and any domain-specific constraints.

---

## Topic Selection

Three paths to a topic:

### A. Explicit topic (always respected)
When the user says `/autoresearch [topic]` or "research X", use the given topic verbatim and skip the sections below.

### B. User-chosen (default)
When `/autoresearch` is invoked WITHOUT a topic, ask: "What topic should I research?"

---

## Research Loop

```
Input: topic (from Topic Selection, above)

Round 1. Broad search
1. Decompose topic into 3-5 distinct search angles
2. For each angle: run 2-3 WebSearch queries
3. For top 2-3 results per angle: WebFetch the page
4. Extract from each: key claims, entities, concepts, open questions

Round 2. Gap fill
5. Identify what's missing or contradicted from Round 1
6. Run targeted searches for each gap (max 5 queries)
7. Fetch top results for each gap

Round 3. Synthesis check (optional, if gaps remain)
8. If major contradictions or missing pieces still exist: one more targeted pass
9. Otherwise: proceed to filing

Max rounds: 3 (as set in program.md). Stop when depth is reached or max rounds hit.
```

---

## Filing Results

After research is complete, create these pages:

**wiki/sources/**. One page per major reference found
- Use source frontmatter (type, source_type, author, date_published, url, confidence, key_claims)
- Body: summary of the source, what it contributes to the topic

**wiki/concepts/**. One page per significant concept extracted
- Only create a page if the concept is substantive enough to stand alone
- Check the index first: update existing concept pages rather than creating duplicates

**wiki/entities/**. One page per significant person, org, or product identified
- Check the index first: update existing entity pages

**wiki/questions/**. One synthesis page titled "Research: [Topic]"
- This is the master synthesis. Everything comes together here.
- Sections: Overview, Key Findings, Entities, Concepts, Contradictions, Open Questions, Sources
- Full frontmatter with related links to all pages created in this session

---

## Synthesis Page Structure

```markdown
---
type: synthesis
title: "Research: [Topic]"
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags:
  - research
  - [topic-tag]
status: developing
related:
  - "[[Every page created in this session]]"
sources:
  - "[[wiki/sources/Source 1]]"
  - "[[wiki/sources/Source 2]]"
---

# Research: [Topic]

## Overview
[2-3 sentence summary of what was found]

## Key Findings
- Finding 1 (Source: [[Source Page]])
- Finding 2 (Source: [[Source Page]])
- ...

## Key Entities
- [[Entity Name]]: role/significance

## Key Concepts
- [[Concept Name]]: one-line definition

## Contradictions
- [[Source A]] says X. [[Source B]] says Y. [Brief note on which is more credible and why]

## Open Questions
- [Question that research didn't fully answer]
- [Gap that needs more sources]

## Sources
- [[Source 1]]: author, date
- [[Source 2]]: author, date
```

---

## After Filing

1. Update `wiki/index.md`. Add all new pages to the right sections
2. Append to `wiki/log.md` (at the TOP):
   ```
   ## [YYYY-MM-DD] wiki-autoresearch | [Topic]
   - Rounds: N
   - Sources found: N
   - Pages created: [[Page 1]], [[Page 2]], ...
   - Synthesis: [[Research: Topic]]
   - Key finding: [one sentence]
   ```
3. Update `wiki/hot.md` with the research summary

---

## Report to User

After filing everything:

```
wiki-autoresearch complete: [Topic]

Rounds: N | Searches: N | Pages created: N

Created:
  wiki/questions/Research: [Topic].md (synthesis)
  wiki/sources/[Source 1].md
  wiki/concepts/[Concept 1].md
  wiki/entities/[Entity 1].md

Key findings:
- [Finding 1]
- [Finding 2]
- [Finding 3]

Open questions filed: N
```

---

## Constraints

Follow the limits in `references/program.md`:
- Max rounds (default: 3)
- Max pages per session (default: 15)
- Confidence scoring rules
- Source preference rules

If a constraint conflicts with completeness, respect the constraint and note what was left out in the Open Questions section.
