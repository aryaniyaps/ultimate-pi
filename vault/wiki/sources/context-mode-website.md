---
type: source
source_type: website
title: context-mode.com
author: B. Mert Köseoğlu
date_published: 2026
url: https://context-mode.com
confidence: medium
key_claims:
  - "Saves 98% of AI coding agent's context window"
  - "66,000+ developers across 14 platforms"
  - "99.5% reduction on Playwright output (56.2KB → 299B)"
  - "30× fewer tokens across full sessions"
  - "Used at Microsoft, Google, Meta, ByteDance, Red Hat, GitHub"
  - "HN #1 with 570+ points"
created: 2026-04-30
updated: 2026-04-30
status: ingested
tags: [#source/website]
---

# context-mode.com

Landing page for the context-mode MCP plugin. Source for architecture claims, feature descriptions, and benchmark numbers.

## Architecture

- **PreToolUse hook**: Routes tool calls. Blocks curl/wget, redirects large output to sandbox.
- **PostToolUse hook**: Captures events to SessionDB (file ops, git, errors, decisions).
- **SessionStart**: Restores state from previous session.
- **PreCompact**: Builds snapshot before context wipe.
- **UserPromptSubmit**: Captures intent, tracks decisions.

## Think in Code Paradigm

Introduced in v1.0.64. Mandatory across all 14 platforms. Rule: when you need to analyze/count/filter/process data, write code that does it. Don't read raw data into context. Uses `ctx_execute()` MCP tool that runs JavaScript in a sandbox (Node.js built-ins only, no npm deps).

## Compression Results (claimed)

- Playwright: 56.2 KB → 299 B (99.5%)
- GitHub Issues: 58.9 KB → 1.1 KB (98%)
- Access Logs: 45.1 KB → 155 B (99.7%)
- Full Session: 315 KB → 5.4 KB (98%)

## Platforms

Claude Code, Cursor, Codex CLI, VS Code Copilot, JetBrains Copilot, Gemini CLI, Qwen Code, Kiro, OpenCode, KiloCode, Zed, OpenClaw, Pi, Antigravity

## License

Elastic License 2.0 (ELv2) — source-available, not OSI-approved open source.

## GitHub

- Stars: 11,245 (as of 2026-04-30)
- Forks: 769
- Language: TypeScript
- Created: 2026-02-23

## npm

- Package: context-mode
- Downloads last month: 48,161
