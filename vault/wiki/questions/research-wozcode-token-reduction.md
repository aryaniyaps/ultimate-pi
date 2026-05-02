---
type: synthesis
title: "Research: WOZCODE Token-Reduction Architecture"
created: 2026-04-30
updated: 2026-04-30
tags:
  - research
  - token-reduction
  - agent-architecture
  - wozcode
status: developing
related:
  - "[[wozcode]]"
  - "[[ast-truncation]]"
  - "[[fuzzy-edit-matching]]"
  - "[[model-routing-agents]]"
  - "[[inline-post-edit-validation]]"
  - "[[harness-implementation-plan]]"
  - "[[agentic-harness]]"
sources:
  - "[[wozcode]]"

---# Research: WOZCODE Token-Reduction Architecture

## Overview

WOZCODE is a Claude Code plugin that reduces token spend by 25–55% through three reinforcing levers: smarter code exploration (fewer input tokens), batched fuzzy edits (fewer output tokens), and an inline quality loop (fewer retries). It runs 100% locally with zero cloud code exposure. Its architecture — AST truncation, Haiku subagent routing, and post-edit syntax validation — represents a fundamentally different approach to agentic coding that our harness should adopt.

## Key Findings

- **AST truncation cuts input tokens by returning function signatures, not bodies** (Source: [[wozcode]]). Smarter search returns ranked snippets instead of full-file grep dumps. This is complementary to our planned [[repo-map-ranking]] but more aggressive: it stubs content at the AST level rather than just selecting files.
- **Fuzzy edit matching eliminates retry round-trips** (Source: [[wozcode]]). Tolerates whitespace drift, indentation changes, curly vs straight quotes, em-dashes. Near-misses still land — the edit tool self-corrects formatting differences instead of failing.
- **Post-edit syntax validation catches errors before the model retries** (Source: [[wozcode]]). TS compiler, JSON/YAML/HTML parsers, SQL linter run after every edit. Errors caught before the next turn — fewer turns = less spend.
- **Haiku subagents handle ~40% of coding work (exploration) at ~15× cheaper than Opus** (Source: [[wozcode]]). Read-only exploration routed to Haiku automatically; frontier model reserved for code generation.
- **SQL dialect auto-fix rewrites common mistakes before they reach the model** (Source: [[wozcode]]). Backtick identifiers, unquoted reserved aliases, `COUNT(DISTINCT a, b)`, `date_trunc("month", col)`.
- **Real savings from live API usage fields, not theoretical baselines** (Source: [[wozcode]]). Every percentage claim is measured from Anthropic's actual API usage fields.

## Key Entities

- **WOZCODE (WithWoz, Inc.)**: Claude Code plugin, founded 2025-2026. Patent-pending token-reduction technology. [[wozcode]]
- **Haiku (Anthropic)**: Cheapest Claude model used for read-only exploration subagents. ~15× cheaper than Opus.
- **Anthropic Claude Code**: The base agentic coding tool that WOZCODE wraps.

## Key Concepts

- [[ast-truncation]]: Stubbing function bodies at the AST level, returning only signatures + relevant snippets
- [[fuzzy-edit-matching]]: Diff algorithm that tolerates formatting drift to land near-miss edits
- [[model-routing-agents]]: Dispatching subtasks to different models based on operation type (explore vs generate)
- [[inline-post-edit-validation]]: Running compilers/linters/parsers immediately after each edit, before the model sees the result
- [[repo-map-ranking]]: Existing concept — graph centrality for selecting important codebase symbols

## Contradictions

- WOZCODE claims "100% local, zero-cloud" — but their privacy page reveals they send aggregated anonymous session stats to Supabase and use Stripe for billing. The code (files, paths, prompts, API keys) never leaves the machine, but metadata does. This is reasonable for a commercial product but worth noting.
- WOZCODE's comparison with "graph-based explorers" (SDL-MCP) is accurate for exploration-only tools but understates what SDL-MCP can do with full repository indexing. SDL-MCP does cover some editing workflows if properly configured.

## Open Questions

- How does WOZCODE's AST truncation handle dynamically-typed languages (Python, JavaScript) where tree-sitter can't resolve all types statically? [gap: need to test on dynamic language codebases]
- What is the actual performance overhead of running post-edit syntax validation after every edit? WOZCODE claims savings but doesn't disclose validation latency.
- Can Haiku subagents be applied to code review / adversarial verification (our L4), or only to exploration? The architecture suggests exploration-only but the pattern could extend.
- How does WOZCODE handle multi-file atomic edits where fuzzy matching on one file could create inconsistencies with another? [gap: need to investigate interaction between fuzzy matching and multi-edit batching]
- The patent-pending status means implementation details are intentionally obscured. Reverse-engineering the fuzzy diff algorithm would require access to the plugin binary.

## Sources

- [[wozcode]]: Primary source — wozcode.com/how-it-works, docs, security pages (2026)
