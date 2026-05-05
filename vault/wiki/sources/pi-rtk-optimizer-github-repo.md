---
type: source
source_type: github-repo
title: "pi-rtk-optimizer — Token Reduction via Command Rewriting"
author: MasuRii
date_published: 2026-03-01
date_accessed: 2026-05-05
url: "https://github.com/MasuRii/pi-rtk-optimizer"
confidence: medium
tags:
  - pi-agent
  - compaction
  - token-optimization
  - extensions
key_claims:
  - "Automatically rewrites bash commands to RTK equivalents for token reduction"
  - "Multi-stage output compaction pipeline: ANSI strip, test aggregation, build filtering, git compaction, linter aggregation, smart truncation"
  - "Operates on tool OUTPUT, not conversation history — different layer than pi-vcc"
  - "v0.5.3 (April 2026), MIT license"
  - "Supports command rewrite bypass rules for safety-critical operations"
---

# pi-rtk-optimizer

## Summary

pi-rtk-optimizer is a Pi extension that reduces token consumption by automatically rewriting bash commands to their RTK (Read-Tool-Kit) equivalents and compacting noisy tool output. Unlike pi-vcc (which compresses conversation history), pi-rtk-optimizer operates upstream — reducing tokens at the tool execution layer before they enter the conversation.

## Architecture

Two mechanisms:

1. **Command Rewriting**: Intercepts bash tool calls and suggests/applies rewrites across git, filesystem, Rust, JavaScript, Python, Go, containers, and package managers. Includes bypass rules for safety-critical operations.

2. **Output Compaction Pipeline**: Multi-stage processing of tool results — ANSI stripping, test aggregation, build filtering, git compaction, linter aggregation, search grouping, source code filtering, smart truncation, and hard character limits.

## Key Stats

- **Version**: v0.5.3 (April 2026)
- **Install**: `pi install npm:pi-rtk-optimizer`
- **TUI config**: `/rtk` command for interactive settings and session metrics

## Relevance to pi-vcc

pi-rtk-optimizer and pi-vcc are complementary, not competing. rtk-optimizer prevents token waste at the tool layer. pi-vcc compresses accumulated conversation history. Together they address both prevention and compression.
