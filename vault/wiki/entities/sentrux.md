---
type: entity
title: "sentrux (tool)"
created: 2026-05-03
tags:
  - code-quality
  - static-analysis
  - rust
  - developer-tools
  - ai-coding
related:
  - "[[Quality Signal (sentrux)]]"
  - "[[Five Root Cause Metrics (sentrux)]]"
  - "[[sentrux Rules Engine]]"
  - "[[sentrux MCP Integration]]"
sources:
  - "[[sentrux-github-repo]]"
  - "[[sentrux-dev-landing]]"
---

# sentrux (tool)

An open-source (MIT), real-time architectural sensor for AI-agent-written code. Built in Rust, single binary, no runtime dependencies.

## Core Identity
"The sensor that helps AI agents close the feedback loop. Recursive self-improvement of code quality."

## Key Stats
- **First release:** March 11, 2026
- **Latest version:** v0.5.7 (March 18, 2026)
- **GitHub:** 1.9k stars, 168 forks
- **Codebase:** ~36K lines of Rust, 87.5% Rust
- **Languages supported:** 52 (via tree-sitter plugins)
- **License:** MIT (free), BSL (Pro source-available)
- **Pricing:** Free / Pro $15/month / Team $40/month/seat

## Creators
- **yjing** (primary author, GitHub: sentrux)
- Contributors: claude (likely AI-generated), v1b3coder, trevorsilence

## Technology
- Pure Rust, egui + wgpu for GUI rendering
- tree-sitter for multi-language parsing
- MCP (Model Context Protocol) for AI agent integration
- Ed25519 for Pro license validation
- Squarified treemap layout with spatial index for O(1) hit testing

## Philosophy
1. Human-in-the-loop is non-negotiable
2. Verification is more valuable than generation
3. Good systems make good outcomes inevitable

## Critical Reception
Mixed. Reddit launch (r/rust, March 2026) drew both praise for the concept (human-in-the-loop, feedback loop) and criticism for rapid development pace (17 releases in one day), "vibe-coded" appearance, and unclear practical value. The tool gave its own repo a "D" rating.
