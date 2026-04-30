---
type: synthesis
title: "Research: context-mode vs lean-ctx"
created: 2026-04-30
updated: 2026-04-30
tags:
  - research
  - context-optimization
  - agentic-harness
  - tool-comparison
status: developing
related:
  - "[[think-in-code]]"
  - "[[context-mode]]"
  - "[[lean-ctx]]"
  - "[[agentic-harness-context-enforcement]]"
sources:
  - "[[context-mode-website]]"
  - "[[leanctx-website]]"
  - "[[think-in-code-blog]]"
---

# Research: context-mode vs lean-ctx

## Overview

Both context-mode and lean-ctx are MCP-based context optimization tools for AI coding agents. context-mode (11K+ GitHub stars, 48K npm downloads/month) intercepts tool output and sandboxes it into FTS5 with BM25 ranking. lean-ctx (924 stars, 3K crates.io downloads) compresses output intelligently via AST parsing and 90+ shell patterns. Both reduce token consumption by 60–99%. The key differentiator: context-mode mandates "Think in Code" as a paradigm shift; lean-ctx offers deeper agent governance (profiles, budgets, SLOs).

## Key Findings

- context-mode uses **intercept-and-sandbox** architecture: raw tool output never enters context. lean-ctx uses **compress-in-place**: output enters context but is intelligently stripped (Source: [[context-mode-website]], [[leanctx-website]])
- context-mode enforces **"Think in Code"** as a mandatory paradigm across all platforms: agents must write code to analyze data rather than reading raw data into context (Source: [[think-in-code-blog]])
- lean-ctx has **agent governance**: profiles, role-based budgets, token/cost SLOs, anomaly detection, 5 built-in roles (Source: [[leanctx-website]])
- lean-ctx offers **cross-session memory + multi-agent sharing** via CCP protocol and scratchpad messaging; context-mode has 26-event session continuity but no multi-agent features (Source: [[context-mode-website]], [[leanctx-website]])
- context-mode is TypeScript/Node.js (ELv2 license), lean-ctx is Rust/Apache 2.0 (Source: GitHub API)
- Both support 14+ platforms including Claude Code, Cursor, Copilot, Gemini CLI, Pi (Source: [[context-mode-website]], [[leanctx-website]])
- context-mode has stronger community validation: #1 on Hacker News (570+ points), 11,245 stars, claimed use at Microsoft/Google/Meta (Source: [[context-mode-website]])

## Key Entities

- [[context-mode]]: MCP plugin by B. Mert Köseoğlu. Sandboxes tool output into FTS5. ELv2 licensed. 11K stars.
- [[lean-ctx]]: Context Runtime by yvgude. Rust binary, Apache 2.0. 924 stars. 3-layer architecture (MCP server + shell hook + protocols).

## Key Concepts

- [[think-in-code]]: Paradigm where AI agents write code to process data instead of reading raw data into context. Reduces context consumption 200×. Mandatory in context-mode v1.0.64+.
- [[fts5-sandbox]]: context-mode's architecture — intercept tool calls, run in sandboxed subprocess, index output into SQLite FTS5 with BM25 ranking. Agent searches on demand.
- [[ast-compression]]: lean-ctx's approach — use tree-sitter to parse code (18 languages), extract only signatures/types/logic, strip comments/whitespace. 60–95% reduction.
- [[shell-pattern-compression]]: lean-ctx recognizes 90+ command patterns (git, npm, cargo, docker, kubectl) and compresses their output automatically.
- [[context-continuity]]: Both tools preserve session state across context compaction. context-mode captures 26 event types to SessionDB. lean-ctx uses CCP (Cross-session Continuity Protocol).

## Contradictions

- [[context-mode-website]] claims 99.5% reduction on Playwright output (56.2KB → 299B). [[leanctx-website]] claims 60–99% with 99% on cached re-reads. Both claims are plausible but measure different things: context-mode measures sandbox avoidance (output never enters context), lean-ctx measures compression ratio (output enters but is stripped). Neither is "wrong" — they solve the problem differently.
- [[context-mode-website]] lists 66,000+ users. NPM shows 48K downloads/month. Gap is likely cumulative installs vs monthly active. Not verified independently.

## Open Questions

- How does context-mode's FTS5 search quality compare to lean-ctx's semantic search (BM25 + TF-IDF)?
- Does "Think in Code" enforcement cause the agent to make more errors when writing analysis scripts? What's the error rate?
- For the ultimate-pi harness specifically: can both be used simultaneously? Would they conflict?
- lean-ctx's governance features (profiles, budgets, SLOs) — how practically useful are they vs. just setting AGENTS.md rules?
- context-mode's enterprise tier (Context as a Service, compliance reports) — is this a lock-in risk?

> [!gap] Independent benchmarks needed. All compression claims come from the tools' own websites. No third-party comparison exists.
> [!gap] No Reddit or community discussions found comparing context-mode vs lean-ctx directly. Tools are 1-2 months old each — comparison discourse hasn't emerged yet.

## Sources

- [[context-mode-website]]: context-mode.com landing page, 2026-04-30
- [[leanctx-website]]: leanctx.com landing page, 2026-04-30
- [[think-in-code-blog]]: "Think in Code" by B. Mert Köseoğlu, 2026
- GitHub API: both repos, 2026-04-30
