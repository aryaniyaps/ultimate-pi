---
type: source
source_type: website
title: leanctx.com
author: yvgude
date_published: 2026
url: https://leanctx.com
confidence: medium
key_claims:
  - "60–99% token reduction per file read"
  - "46 MCP tools, 10 read modes, 90+ shell compression patterns"
  - "Supports 24 AI tools"
  - "Single Rust binary, zero telemetry, Apache 2.0"
  - "Agent governance with profiles, budgets, SLOs, anomaly detection"
created: 2026-04-30
updated: 2026-04-30
status: ingested
tags: [#source/website]
---

# leanctx.com

Landing page for LeanCTX — "The Context Engineering Layer for AI Coding."

## Architecture (3 layers)

1. **Context Server**: 49 intelligent MCP tools for file reads, shell commands, code search. Intent-aware compression with adaptive mode selection per task type.
2. **Shell Hook**: Intercepts shell output. Recognizes 90+ command patterns (git, npm, cargo, docker, kubectl, etc). Compresses automatically.
3. **Protocols**: CEP (Context Efficiency Protocol), CCP (Cross-session Continuity Protocol), TDD (symbol shorthand). Teaches AI to communicate leaner. 8–25% additional savings.

## Read Modes

- `full`: Complete content
- `map`: Dependency graph + exports + API (~5-15% tokens)
- `signatures`: Function/class signatures only (~10-20%)
- `aggressive`: Syntax-stripped (~30-50%)
- `entropy`: Shannon entropy filtered (~20-40%)
- `diff`: Only changed lines since last read

## Agent Governance

- 5 built-in roles: Admin, Coder, Debugger, Reviewer, Ops
- Token, cost, and shell budgets per agent
- SLOs with automatic throttling
- Anomaly detection for runaway consumption

## Compression Results (claimed)

- 60–95% per file read depending on mode
- 99% on cached re-reads (13 tokens)
- Shell builds: 847 → 42 tokens (95%)

## Platforms

Aider, Amazon Q, Amp, Antigravity, AWS Kiro, Claude Code, Cline, Continue, Cursor, Emacs, Gemini CLI, GitHub Copilot, JetBrains, Neovim, OpenAI Codex, OpenCode, Pi, Qwen Code, Roo Code, Sublime Text, Trae, Verdent, Windsurf, Zed

## GitHub

- Stars: 924 (as of 2026-04-30)
- Forks: 109
- Language: Rust
- Created: 2026-03-23
- License: Apache 2.0

## crates.io

- Package: lean-ctx
- Total downloads: 3,188
- Version: 3.4.5
