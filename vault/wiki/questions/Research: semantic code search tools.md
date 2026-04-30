---
type: synthesis
title: "Research: semantic code search tools"
created: 2026-04-30
updated: 2026-04-30
tags:
  - research
  - code-search
  - semantic-search
  - agentic-harness
  - mcp
status: developing
related:
  - "[[ck-tool]]"
  - "[[vgrep-tool]]"
  - "[[hybrid-code-search]]"
  - "[[agent-search-enforcement]]"
  - "[[mcp-tool-routing]]"
sources:
  - "[[ck-semantic-search]]"
  - "[[vgrep-semantic-search]]"
---

# Research: semantic code search tools

## Overview

Self-hostable, free (zero API keys) semantic code search tools for an agentic AI coding harness. ck (BeaconBay/ck) is the strongest candidate: 1,572 stars, Rust, grep-compatible, MCP-native, fully offline. Its primary limitations are no code-aware AST embeddings and no custom model fine-tuning. Alternatives exist but are younger and less mature. Agent enforcement requires system-prompt rules + MCP tool registration + optional shell-level routing.

## Key Findings

- **ck is the best drop-in replacement for grep** in an AI coding harness. It preserves grep flags (`-n`, `-A`, `-B`, `-r`, `-l`), adds `--sem` and `--hybrid` modes, and ships an MCP server. Fully offline. (Source: [[ck-semantic-search]])
- **vgrep is the strongest alternative** with client-server architecture and GPU acceleration, but lacks grep-compatible flags and MCP integration (Source: [[vgrep-semantic-search]])
- **No tool currently enforces agent usage automatically**. Enforcement is a system-design problem, not a tool feature. Three-layer approach recommended: system prompt rules, MCP tool registration, optional shell wrapper (Source: [[agent-search-enforcement]])
- **ast-grep** and **semgrep** are structural/pattern-based, not embedding-based. Complementary but different category. (Source: GitHub API search)
- **ck limitations are real but manageable**: no code-aware embeddings, 80-language max, no custom training, ~4-8GB RAM for 10M+ LOC codebases (Source: [[ck-semantic-search]])

## Key Entities

- [[ck-tool]]: Hybrid code search (BM25 + embeddings), grep-compatible, MCP server, fully offline. 1,572 ⭐
- [[vgrep-tool]]: Vector embedding search, client-server, GPU acceleration, privacy-first. 144 ⭐
- [[autodev-codebase]]: TypeScript MCP server with call graphs + Ollama embeddings. 116 ⭐
- [[ops-codegraph-tool]]: Python dependency graph engine + semantic search + boundary enforcement. 41 ⭐
- [[codesearch]]: Rust MCP server designed for Claude Code/OpenCode. 16 ⭐

## Key Concepts

- [[hybrid-code-search]]: BM25 lexical + embedding semantic + Reciprocal Rank Fusion (RRF) for best-of-both-worlds results
- [[agent-search-enforcement]]: Strategies to force AI agents to use semantic search instead of raw grep/cat pipes
- [[mcp-tool-routing]]: Using MCP protocol to register semantic search as a first-class agent tool

## Contradictions

- **ck claims "drop-in grep replacement"** but its semantic mode (--sem) changes the semantics entirely. grep results are deterministic; semantic results depend on the embedding model. (Source: [[ck-semantic-search]]) This is a design tradeoff, not a bug.
- **vgrep is "privacy-first"** (Source: [[vgrep-semantic-search]]) — but ck is also fully offline. Both have the same privacy posture. The distinction is marketing.
- **Some sources claim tree-sitter-based search is "semantic"** but tree-sitter is structural (AST), not semantic (meaning). Tools like ast-grep and semgrep are complementary, not competing, with embedding-based search.

## Open Questions

- [ ] How does ck's embedding quality compare to code-specific models (CodeBERT, UniXCoder) on real-world queries? No independent benchmarks found.
- [ ] Can shell wrapper interception be made reliable enough for production use, or does it introduce too many false positives?
- [ ] What is the MCP tool-calling preference in Claude Code vs Cursor vs other agents when native bash/grep is also available? Empirical testing needed.
- [ ] vgrep MCP integration roadmap — author says "planned" but no timeline.
- [ ] What embedding model does ck download by default? The docs say fastembed but not which specific model.

## Sources

- [[ck-semantic-search]]: Official ck documentation (BeaconBay, 2025-2026)
- [[vgrep-semantic-search]]: vgrep GitHub readme and docs (CortexLM, 2025-2026)
- GitHub API: Repository metadata for all alternatives (April 2026)
