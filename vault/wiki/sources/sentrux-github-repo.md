---
type: source
source_type: github-repository
title: "sentrux GitHub Repository"
author: sentrux
date_published: 2026-03-11
date_fetched: 2026-05-03
url: https://github.com/sentrux/sentrux
confidence: high
key_claims:
  - "Real-time architectural sensor that helps AI agents close the feedback loop"
  - "5 root cause metrics, one continuous score 0–10000"
  - "52 languages via tree-sitter plugins, zero language-specific code in binary"
  - "MCP server with 9 tools for AI agent integration"
  - "Rules engine with TOML-based constraint definitions"
  - "Pure Rust, single binary, no runtime dependencies"
  - "MIT License, 1.9k stars, 168 forks"
tags:
  - code-quality
  - static-analysis
  - ai-coding
  - mcp
  - rust
  - treemap
---

# sentrux GitHub Repository

Primary development repository for sentrux. Public, MIT-licensed.

## Stats (as of May 2026)
- **Stars:** 1,900+
- **Forks:** 168
- **Releases:** 37 (latest: v0.5.7, Mar 18, 2026)
- **Commits:** 318
- **Contributors:** 4 (claude, v1b3coder, sentrux, trevorsilence)
- **Languages:** Rust 87.5%, HTML 7.2%, Tree-sitter Query 5.2%

## Architecture
- **sentrux-core:** library crate (analysis, metrics, MCP server, GUI panels)
- **sentrux-bin:** binary crate (GUI, CLI, MCP entry points)
- **plugins/:** git submodule containing tree-sitter grammars
- **.claude-plugin:** Claude Code plugin with MCP server and marketplace config

## Key Features
1. Real-time treemap visualization with dependency edges
2. 5 root cause metrics aggregated via geometric mean (Nash Social Welfare theorem)
3. Quality gate for CI (`sentrux check .` exits 0 or 1)
4. Session baseline/diff comparison (`sentrux gate --save / sentrux gate .`)
5. MCP server (9 tools): scan, health, session_start, session_end, rescan, check_rules, evolution, dsm, test_gaps
6. Rules engine (.sentrux/rules.toml) with layers, boundaries, constraints
7. Plugin system for adding languages (zero Rust code required)
8. Pro tier with runtime dylib plugin model, Ed25519 license keys

## Development Velocity
Rapid iteration: from initial commit (Mar 11, 2026) to v0.5.7 with Pro architecture, Claude Code plugin, universal resolver, and 316+ tests in ~1 week.
