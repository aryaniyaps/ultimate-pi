# Research Program

This file configures the autoresearch loop. Edit it to match your domain and research style. The autoresearch skill reads it before every run.

---

## Search Objectives

Default objectives for every research session:

- Find authoritative sources (prefer: .edu, peer-reviewed papers, official documentation, primary sources, established publications)
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

[Add domain-specific instructions here. Examples:]

For AI/tech research:
- Prefer: arXiv, official GitHub repos, official product documentation, Hacker News discussions with high karma
- Note: LLM benchmarks are often gamed: treat leaderboard claims as low confidence unless independently verified

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
