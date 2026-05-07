---
type: config
title: "Autoresearch Program Configuration"
updated: 2026-05-07
---

# Research Program Configuration

Edit this file to configure the autoresearch loop's behavior.

## Objectives

- Max research rounds: 3
- Max sources per round: 8
- Max pages per session: 15
- Confidence threshold for filing: 0.6

## Source Preferences

Prefer (in order):
1. Official documentation & primary sources
2. Peer-reviewed papers (arxiv, ACM, etc.)
3. Engineering blogs from recognized teams
4. GitHub repositories with >100 stars
5. StackOverflow answers with >10 upvotes

Avoid:
- AI-generated content farms
- Medium articles without author credentials
- Repackaged/aggregator sites
- Outdated mirrors

## Domain Constraints

None configured. Add domain-specific constraints below.

## Output Format

Results are filed into `graphify-out/` via the knowledge graph.
The synthesis report is written to `graphify-out/RESEARCH_REPORT.md`.
Raw sources are stored in `./raw/` for graphify ingestion.
