---
type: source
source_type: product-documentation
author: WithWoz Inc.
date_published: 2026
url: https://www.wozcode.com/how-it-works
confidence: medium
key_claims:
  - "25-55% token reduction vs vanilla Claude Code"
  - "Three levers: smarter search, batched edits, quality loop"
  - "AST truncation stubs function bodies, returns only signatures"
  - "Haiku subagents handle ~40% of coding work (exploration)"
  - "100% local architecture, zero cloud code transmission"
  - "Post-edit syntax validation (TS, JSON/YAML, SQL) catches errors before model retries"
  - "Fuzzy edit matching tolerates whitespace drift and visually-identical characters"
  - "Claims measured from live Anthropic API usage fields, not simulations"
tags:
  - wozcode
  - token-reduction
  - claude-code
  - agent-architecture
created: 2026-04-30
updated: 2026-04-30
status: ingested
title: "WOZCODE"
---

# WOZCODE

WOZCODE is a Claude Code plugin by WithWoz Inc. that reduces token spend through three compounding levers. Patent-pending. Runs 100% locally — code never leaves the developer's machine.

## Three Core Levers

### 1. Smarter Search (Input Token Reduction)
- Ranked snippets instead of full-file grep dumps
- AST truncation: stubs function bodies, returns only signatures
- Returns only what the model needs for the current task

### 2. Batched & Fuzzy Edits (Output Token Reduction)
- Multiple file edits merged into a single model call
- Fuzzy edit matching: tolerates whitespace drift, indentation changes, curly vs straight quotes, em-dashes
- Near-misses land without retry round-trips

### 3. Quality Loop (Rework Reduction)
- Post-edit syntax validation: TS compiler, JSON/YAML/HTML parsers, SQL linter
- SQL dialect auto-fix: rewrites backtick identifiers, unquoted reserved aliases, `COUNT(DISTINCT a, b)`, `date_trunc("month", col)`
- Better error context: dialect-specific hints, real file content diffs instead of "string not found"

## Agent Architecture

| Agent | Model | Role |
|-------|-------|------|
| `woz:code` | User's frontier model (Opus/Sonnet) | Main thread, writes/edits code with full tool access |
| `woz:explore` | Haiku | Read-only exploration, returns summaries to parent. ~15× cheaper. |

~40% of coding work is exploration — automatically routed to Haiku.

## Privacy Architecture

- **Never sent**: source code, file contents, file paths, grep output, tool inputs/outputs, prompts, model responses, Anthropic API key
- **In the loop for tool execution, not API transport**: API requests go direct from machine to Anthropic
- **What WOZCODE servers do**: stats dashboard, auth endpoint, billing (via Stripe)
- **Aggregated anonymous stats**: session-level token/cost/time metrics only

## Competitor Comparison (from WOZCODE)

| Tool | Approach | WOZCODE's Critique |
|------|----------|-------------------|
| SDL-MCP | Graph-based code exploration | Covers only exploration, not editing/validation |
| Caveman | System-prompt prose compression | Most tokens are in tool calls, not prose |
| WOZCODE | Full-session coverage | Covers exploration, editing, and validation |

## Claims to Verify

Claims are **medium confidence** (single source, commercial product, patent-pending means details obscured):
- [ ] 25-55% token savings — benchmarkable on our codebase
- [ ] 5-10× faster on DB tasks — domain-specific claim
- [ ] AST truncation effectiveness on dynamic languages
- [ ] Fuzzy edit matching false-positive rate
- [ ] Post-edit validation latency overhead
