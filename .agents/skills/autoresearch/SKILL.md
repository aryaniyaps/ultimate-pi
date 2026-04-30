---
name: autoresearch
description: "Autonomous iterative research loop. Takes a topic, runs web searches, fetches sources, synthesizes findings, and files everything into the wiki as structured pages. Based on Karpathy's autoresearch pattern: program.md configures objectives and constraints, the loop runs until depth is reached, output goes directly into the knowledge base. Triggers on: '/autoresearch', 'autoresearch', 'research [topic]', 'deep dive into [topic]', 'investigate [topic]', 'find everything about [topic]', 'research and file', 'go research', 'build a wiki on'."
---

# autoresearch: Autonomous Research Loop

You are a research agent. You take a topic, run iterative web searches using scrapling, fetch pages, clean with defuddle, synthesize findings, and file everything into the wiki. The user gets wiki pages, not a chat response.

This is based on Karpathy's autoresearch pattern: a configurable program defines your objectives. You run the loop until depth is reached. Output goes into the knowledge base.

---

## Before Starting

Read `references/program.md` to load the research objectives, constraints, web fetch pipeline, and quality-sites whitelist. This file is user-configurable.

Also read `references/quality-sites.md` for the whitelist of vetted coding reference sites.

---

## Prerequisites Check

Before the first fetch, verify the toolchain:

```bash
SCRAPLING="/home/aryaniyaps/.local/venvs/scrapling/bin/scrapling"
test -x "$SCRAPLING" || echo "MISSING: scrapling not found at $SCRAPLING"
which defuddle >/dev/null 2>&1 || echo "MISSING: defuddle not installed (npm install -g defuddle-cli)"
```

If scrapling is missing, install it:
```bash
python3 -m venv /home/aryaniyaps/.local/venvs/scrapling
/home/aryaniyaps/.local/venvs/scrapling/bin/pip install "scrapling[all]>=0.4.7"
/home/aryaniyaps/.local/venvs/scrapling/bin/python -m playwright install chromium
```

If defuddle is missing:
```bash
npm install -g defuddle-cli
```

---

## Query Routing

Before any search or fetch, classify the query:

| Query Type | Tool | Notes |
|---|---|---|
| API docs, signatures, config | **context7** | `ctx7 library <name> <query>` then `ctx7 docs <id> <query>` |
| Debugging errors | context7 (API) + scrapling (discussions) | Split: API part via ctx7, error discussion via DuckDuckGo |
| Architecture, patterns | scrapling + quality-sites | Route to martinfowler, highscalability, engineering blogs |
| Library comparison | scrapling + quality-sites | Multi-source, check dates |
| New tech exploration | scrapling + quality-sites | HN, arxiv, engineering blogs |

**Never use scrapling/defuddle for API docs.** API documentation lives in context7 exclusively.

---

## Web Fetch Pipeline

All web fetches go through this pipeline. DO NOT use `curl`, `wget`, or raw bash HTTP commands.

### Step 1: Search (DuckDuckGo via scrapling)

```bash
SCRAPLING="/home/aryaniyaps/.local/venvs/scrapling/bin/scrapling"
ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$QUERY'''))")
$SCRAPLING extract get "https://html.duckduckgo.com/html/?q=$ENCODED" /tmp/autoresearch-search.md --ai-targeted
```

Parse `/tmp/autoresearch-search.md` for result links. Extract candidate URLs.

### Step 2: Fetch (scrapling primary)

For each candidate URL:

```bash
$SCRAPLING extract get "$URL" "/tmp/autoresearch-$SLUG.md" --ai-targeted
```

- `--ai-targeted` extracts only main content, strips hidden elements, blocks ads
- Output: `.md` for markdown (preferred), `.html` for raw, `.txt` for plain text
- Use `--css-selector "article"` or similar to target specific content regions
- Use `--timeout 60` for slow sites

**Escalation**: If `get` returns empty or blocked content:

```bash
# JS-rendered pages
$SCRAPLING extract fetch "$URL" "/tmp/autoresearch-$SLUG.md" --ai-targeted --network-idle

# Anti-bot protected pages
$SCRAPLING extract stealthy-fetch "$URL" "/tmp/autoresearch-$SLUG.md" --ai-targeted --solve-cloudflare
```

### Step 3: Clean (defuddle, optional)

Check the scrapling output. If it still contains boilerplate (nav bars, cookie banners, related articles), run:

```bash
defuddle parse "/tmp/autoresearch-$SLUG.md" --md > "/tmp/autoresearch-$SLUG-clean.md"
```

For simple pages, defuddle can fetch AND clean in one pass:
```bash
defuddle parse "$URL" --md > "/tmp/autoresearch-$SLUG.md"
```

### Step 4: Extract

Read the cleaned markdown file. Extract:
- Key claims (with source attribution)
- Entities (people, orgs, products)
- Concepts and frameworks
- Open questions

### Cleanup

```bash
rm -f /tmp/autoresearch-*.md
```

---

## Quality Sites Routing

Before fetching any non-API URL, check `references/quality-sites.md`. Route queries according to the Routing Rules:

- **Debugging/errors**: `site:stackoverflow.com [error]` or `site:github.com/[org]/[repo]/issues [error]`
- **Architecture/patterns**: martinfowler.com, highscalability.com, engineering blogs
- **Library comparisons**: multiple Tier 1/2 sources, check dates
- **Version/release**: check pypi.org / crates.io / npmjs.com directly

**API documentation sites are EXCLUDED.** All API docs are resolved by context7. See Query Routing above.

Do not cite sources from the Exclusions list (AI content farms, mirrors, stale packages, API doc sites).

---

## Topic Selection

Three paths to a topic:

### A. Explicit topic (always respected)
When the user says `/autoresearch [topic]` or "research X", use the given topic verbatim and skip the sections below.

### B. Boundary-first selection (agenda control, opt-in)
**This is agenda control, not pure memory.** DragonScale Memory.md Mechanism 4 labels this mechanism as such because it shapes which direction the research agent moves next. Users who want a strict memory-layer subset should omit this path entirely.

When `/autoresearch` is invoked WITHOUT a topic AND the vault has adopted DragonScale, default to surfacing the frontier of the vault as a set of candidate topics the user can accept, override, or decline.

Feature detection (shell):

```bash
if [ -x ./scripts/boundary-score.py ] && [ -d ./.vault-meta ] && command -v python3 >/dev/null 2>&1; then
  BOUNDARY_MODE=1
else
  BOUNDARY_MODE=0
fi
```

When `BOUNDARY_MODE=1`:

1. Run `./scripts/boundary-score.py --json --top 5`. Returns the top 5 frontier pages by `boundary_score = (out_degree - in_degree) * recency_weight`.
2. **Helper failure handling**: if the helper exits non-zero, emits invalid JSON, or returns an empty `results` array, set `BOUNDARY_MODE=0` and fall through to section C below. Do NOT prompt the user with an empty candidate list, and do NOT improvise a topic.
3. Present the candidate list to the user: "Your top frontier pages are: [list]. Research which one? (1-5, or type a topic to override, or say 'cancel' to be asked normally.)"
4. If the user picks 1-5, use the selected page's title as the topic.
5. If the user types free text, use that.
6. If the user cancels or does not choose, fall through to C.

The boundary score is a heuristic, not an objective measure of what SHOULD be researched. The user always has the option to type a free-text topic to override the surfaced candidates.

**Link-resolution semantics**: the boundary helper uses **filename-stem wikilink resolution only**. `[[Foo]]` is counted as an edge to `Foo.md` anywhere in the vault. Aliases declared via frontmatter `aliases:` are **not** parsed. Folder-qualified links (e.g. `[[notes/Foo]]`) are resolved by stem only. This matches default Obsidian behavior for unique filenames but does not implement full Obsidian alias resolution.

### C. User-chosen (default when B is unavailable)
When `BOUNDARY_MODE=0` or the user declined every frontier pick, ask: "What topic should I research?"

---

## Research Loop

```
Input: topic (from Topic Selection, above)

Round 1. Broad search
1. Decompose topic into 3-5 distinct search angles
2. For each angle: run 2-3 DuckDuckGo searches via scrapling
3. For top 2-3 results per angle: fetch via scrapling get (escalate to fetch/stealthy-fetch if needed)
4. Clean with defuddle if output has boilerplate
5. Extract from each: key claims, entities, concepts, open questions

Round 2. Gap fill
6. Identify what's missing or contradicted from Round 1
7. Run targeted searches for each gap (max 5 queries)
8. Fetch top results for each gap

Round 3. Synthesis check (optional, if gaps remain)
9. If major contradictions or missing pieces still exist: one more targeted pass
10. Otherwise: proceed to filing

Max rounds: 3 (as set in program.md). Stop when depth is reached or max rounds hit.
```

---

## Filing Results

After research is complete, create these pages:

**vault/wiki/sources/**. One page per major reference found
- Use source frontmatter (type, source_type, author, date_published, url, confidence, key_claims)
- Body: summary of the source, what it contributes to the topic

**vault/wiki/concepts/**. One page per significant concept extracted
- Only create a page if the concept is substantive enough to stand alone
- Check the index first: update existing concept pages rather than creating duplicates

**vault/wiki/entities/**. One page per significant person, org, or product identified
- Check the index first: update existing entity pages

**vault/wiki/questions/**. One synthesis page titled "Research: [Topic]"
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
  - "[[vault/wiki/sources/Source 1]]"
  - "[[vault/wiki/sources/Source 2]]"
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

1. Update `vault/wiki/index.md`. Add all new pages to the right sections
2. Append to `vault/wiki/log.md` (at the TOP):
   ```
   ## [YYYY-MM-DD] autoresearch | [Topic]
   - Rounds: N
   - Sources found: N
   - Pages created: [[Page 1]], [[Page 2]], ...
   - Synthesis: [[Research: Topic]]
   - Key finding: [one sentence]
   ```
3. Update `vault/wiki/hot.md` with the research summary

---

## Report to User

After filing everything:

```
Research complete: [Topic]

Rounds: N | Searches: N | Pages created: N

Created:
  vault/wiki/questions/Research: [Topic].md (synthesis)
  vault/wiki/sources/[Source 1].md
  vault/wiki/concepts/[Concept 1].md
  vault/wiki/entities/[Entity 1].md

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
- Quality-sites whitelist from `references/quality-sites.md`

If a constraint conflicts with completeness, respect the constraint and note what was left out in the Open Questions section.

---

## Toolchain Summary

| Purpose | Tool | Command |
|---|---|---|
| Search | scrapling → DuckDuckGo | `$SCRAPLING extract get "https://html.duckduckgo.com/html/?q=..." ...` |
| Fetch (simple) | scrapling get | `$SCRAPLING extract get "$URL" "$FILE".md --ai-targeted` |
| Fetch (JS) | scrapling fetch | `$SCRAPLING extract fetch "$URL" "$FILE".md --ai-targeted --network-idle` |
| Fetch (anti-bot) | scrapling stealthy-fetch | `$SCRAPLING extract stealthy-fetch "$URL" "$FILE".md --ai-targeted --solve-cloudflare` |
| Clean | defuddle | `defuddle parse "$INFILE" --md > "$OUTFILE"` |
| Read | read tool | `read /tmp/autoresearch-*.md` |
| File | write/edit tools | Create wiki pages |
