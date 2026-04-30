# Research Program

This file is the configuration entry point for the autoresearch harness. It specifies the model profile, research objectives, constraints, fetch pipeline, and quality standards.

---

## Harness Configuration

### Model Profile

Which behavioral compensations to apply. This controls the four-layer harness: L1 Signal Design, L2 Gate Design, L3 State Channel, L4 Completion Model.

```yaml
model_profile: auto  # auto | opus | gpt | gemini | strict
```

| Profile | Description | When to use |
|---|---|---|
| `auto` | Detect model, fall back to `strict` if uncertain | Default |
| `opus` | Relaxed: soft gates, natural flow, metadata inference | Claude / Opus family |
| `gpt` | Full enforcement: hard gates, flat paths, explicit signals | GPT-4 / GPT-5 family |
| `gemini` | Conservative: near-gpt with per-round granularity | Gemini family |
| `strict` | Maximum enforcement. Identical to `gpt` profile | Unknown model (safe default) |

**Reference**: `references/harness-config.md` (dimension specification), `references/model-profiles.md` (profile values).

**Why this matters**: Forge Code reached 81.8% on TermBench 2.0 with both GPT 5.4 and Opus 4.6 — but only after adapting the harness to each model's specific failure modes. The models didn't change. The harness did. https://forgecode.dev/blog/gpt-5-4-agent-improvements/

---

## Query Routing (MANDATORY)

The agent has two resolvers. Never mix their domains.

### context7: API & Library Documentation (EXCLUSIVE)

```bash
ctx7 library <name> <query>     # Step 1: resolve library ID
ctx7 docs <libraryId> <query>   # Step 2: fetch docs
```

**context7 owns ALL of:**
- Function/method signatures and parameters
- Class APIs and inheritance
- Configuration options, defaults, enums
- Language standard library references
- Framework API specifications
- Version-specific API changes
- Package/module documentation

**Never use scrapling, defuddle, or quality-sites for the above.** API docs live in context7.

### scrapling + defuddle + quality-sites: Everything Else

**Use for:**
- Debugging errors and stack traces
- Architecture patterns and system design
- Library/framework comparisons
- New technology exploration
- "How to build X" (non-API-specific)
- Postmortems, engineering blog deep dives
- Ecosystem trends and emerging patterns

**Hybrid queries** (common):
- Error messages: context7 for the API involved + scrapling for debugging discussions
- Architecture decisions: context7 for involved libraries' capabilities + quality-sites for patterns
- Library selection: context7 for each library's API surface + quality-sites for community comparisons

---

## Web Fetch Pipeline (MANDATORY)

The agent uses a three-tier pipeline for all web fetches. Never use `curl`, `wget`, or raw bash HTTP commands.

### Tier 1: Scrapling (primary fetcher)

```bash
SCRAPLING="/home/aryaniyaps/.local/venvs/scrapling/bin/scrapling"
$SCRAPLING extract get "$URL" "$OUTFILE" --ai-targeted
```

- `--ai-targeted` extracts only main content, strips hidden elements, blocks ads
- Output format determined by file extension: `.md` for markdown, `.html` for raw, `.txt` for plain text
- Always prefer `.md` output for readability
- Use `--css-selector` to target specific page regions
- For JS-heavy or anti-bot sites, escalate to `fetch` or `stealthy-fetch`:
  ```bash
  $SCRAPLING extract fetch "$URL" "$OUTFILE".md --ai-targeted --network-idle
  $SCRAPLING extract stealthy-fetch "$URL" "$OUTFILE".md --ai-targeted --solve-cloudflare
  ```

### Tier 2: Defuddle (content cleaner)

After scrapling fetch, if output still has boilerplate:

```bash
defuddle parse "$OUTFILE" --md > "$CLEANFILE"
```

Or fetch-and-clean in one pass for simple pages (no anti-bot needed):

```bash
defuddle parse "$URL" --md > "$OUTFILE"
```

Defuddle is optional if scrapling `--ai-targeted` already produced clean output. Check the output: if it contains nav bars, cookie banners, or related-article sections, run defuddle.

### Tier 3: Raw fallback

If both scrapling and defuddle fail, use the agent's built-in WebFetch tool. Note this in the source page as low-confidence due to lack of anti-bot/cleaning.

### Workflow

```
Search query → scrapling get URL → check output → defuddle if needed → read file → extract
```

Temp files go to `/tmp/autoresearch-*`. Always clean up temp files after extracting.

---

## Search Execution

The agent has no built-in `WebSearch` tool. Search via scrapling on DuckDuckGo:

```bash
SEARCH_URL="https://html.duckduckgo.com/html/?q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$QUERY'''))")"
$SCRAPLING extract get "$SEARCH_URL" /tmp/autoresearch-search.md --ai-targeted
```

Parse results from the saved markdown. Extract URLs from result links. For each candidate URL, run the Tier 1→2 pipeline.

If DuckDuckGo is blocked or returns empty, escalate to browser mode:

```bash
$SCRAPLING extract fetch "$SEARCH_URL" /tmp/autoresearch-search.md --ai-targeted
```

---

## Quality Sites

Before fetching or citing any non-API source, check `references/quality-sites.md`. The whitelist defines three tiers for debugging, architecture, and problem-solving content:

- **Tier 1**: High-signal sources (StackOverflow, GitHub issues, engineering blogs, martinfowler, arxiv). Always prefer. Highest confidence.
- **Tier 2**: Good secondary sources (Medium, dev.to, freeCodeCamp, logrocket). High confidence but verify.
- **Tier 3**: Contextual pointers (Reddit, YouTube talks). Flag as medium confidence. Never cite directly.

**API documentation sites are EXCLUDED** from quality-sites. All API docs are resolved exclusively by context7. See Query Routing above.

When multiple non-API sources exist on a topic, prefer higher-tier sources.

For debugging and problem-solving, use the routing patterns in `quality-sites.md` (e.g., `site:stackoverflow.com`, `site:github.com/org/repo/issues`).

---

## Search Objectives

Default objectives for every research session:

- Find authoritative sources (prefer: Tier 1 and Tier 2 from quality-sites.md for non-API content; context7 for API/library docs; .edu; peer-reviewed papers; primary sources; established publications)
- Extract key entities (people, organizations, products, tools)
- Extract key concepts and frameworks
- Note contradictions between sources
- Identify open questions and research gaps
- Prefer sources from the last 2 years unless the topic is foundational

---

## Confidence Scoring

Label every claim with confidence when filing:

- **high**: multiple independent authoritative sources agree
- **medium**: single good source, or sources partially agree
- **low**: speculation, opinion pieces, single informal source, or claim not verified

Always note the source date for factual claims. Mark claims from sources older than 3 years as potentially stale.

---

## Loop Constraints

- Max search rounds per topic: **3**
- Max wiki pages created per session: **15**
- Max sources fetched per round: **5**
- If max pages is reached before the loop completes: file what you have, note what was skipped in Open Questions

---

## Output Style

- Declarative, present tense
- Cite every non-obvious claim: `(Source: [[Page]])`
- Short pages: under 200 lines. Split if longer.
- No hedging language ("it seems", "perhaps", "might be")
- Flag uncertainty explicitly: `> [!gap] This claim needs verification.`

---

## Domain Notes

For AI/tech research:
- Prefer: arXiv, official GitHub repos, official product documentation, Hacker News discussions with high karma
- Note: LLM benchmarks are often gamed: treat leaderboard claims as low confidence unless independently verified

For coding/API research:
- API/library docs: use context7 exclusively (not quality-sites, not scrapling)
- Debugging errors: context7 for the API involved + quality-sites Tier 1 (StackOverflow, GitHub issues)
- Architecture/pattern research: quality-sites Tier 1 (martinfowler, highscalability, engineering blogs)
- Library version/release: check pypi.org / crates.io / npmjs.com directly
- Avoid: w3schools, geeksforgeeks, tutorialspoint, AI-generated content farms
- Avoid: API doc mirrors (docs.rs, readthedocs.io) — use context7 instead

For business/market research:
- Prefer: company filings, Crunchbase, Bloomberg, verified industry reports
- Flag: press releases as low confidence without independent verification

For medical/health research:
- Prefer: PubMed, Cochrane reviews, peer-reviewed clinical trials
- Always note: sample size, study type (RCT vs observational), and recency

---

## Exclusions

Do not cite as high-confidence sources:
- Reddit posts or forums (use as pointers to primary sources only)
- Social media posts
- Undated web pages
- Sources that don't cite their own claims
- Sites from the exclusions list in `quality-sites.md` (AI content farms, mirrors, stale packages)
