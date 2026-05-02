---
type: source
status: ingested
source_type: benchmark-report
author: Mitch Alderson (Render)
date_published: 2025-08-12
date_accessed: 2026-05-01
url: https://render.com/blog/ai-coding-agents-benchmark
confidence: high
key_claims:
  - Cursor leads overall (8/10): best setup speed, Docker/Render deployment, code quality
  - Claude Code (6.8/10): best for rapid prototypes, productive terminal UX
  - Gemini CLI (6.8/10): wins large-context refactors, weak on greenfield
  - OpenAI Codex (6/10): powerful model, hampered by UX issues
  - Gemini CLI pattern: excels at editing existing codebases (context-driven), struggles generating from scratch
  - Free tier: 60 req/min, 1,000 req/day (industry best)
created: 2026-05-02
updated: 2026-05-02
tags: [source]
---
# Render AI Coding Agents Benchmark (August 2025)

## What It Is

Independent benchmark comparing Cursor, Claude Code, Gemini CLI, and OpenAI Codex on production codebases in 2025. Two test categories: "vibe coding" (greenfield URL shortener) and production code tasks (Go monorepo, Astro.js site).

## Final Scores

| Tool | Setup | Cost | Quality | Context | Integration | Speed | Specialized | **Avg** |
|------|-------|------|---------|---------|-------------|-------|-------------|---------|
| Cursor | 9 | 5 | 9 | 8 | 8 | 9 | 8 | **8** |
| Claude Code | 8 | 6 | 7 | 5 | 9 | 7 | 6 | **6.8** |
| Gemini CLI | 6 | 8 | 7 | 9 | 5 | 5 | 8 | **6.8** |
| Codex | 3 | 6 | 8 | 7 | 4 | 7 | 7 | **6** |

## Gemini CLI Specific Findings

- **Context: 9/10** — best in class. 1M token window + automatic codebase loading. Loaded most/all relevant files without manual intervention.
- **Quality: 7/10** — solid on production refactors (first-try Go refactor with proper error handling), but 3/10 on vibe coding (7 follow-up error prompts needed, barebones output).
- **Speed: 5/10** — slow due to automatic full-context loading.
- **Hypothesis** (unconfirmed): Gemini may be tuned to make decisions based on context rather than pre-training, favoring editing existing codebases over generating from scratch.

## Key Takeaways

- Each tool excels in different areas; no single winner
- For production refactoring: Gemini + Cursor best (context matters most)
- For greenfield: Cursor + Claude Code best (model quality + UX matters)
- AI agents best used by experienced engineers who audit output
- All agents were great as "error assistants" — troubleshooting via chat

## Relevance to Ultimate-PI

Gemini CLI's context-driven approach validates our L3 Grounding layer (Gitingest + ck). The benchmark's finding that context quality beats model quality for production tasks reinforces our first-principles decision to invest heavily in grounding/context engineering.
