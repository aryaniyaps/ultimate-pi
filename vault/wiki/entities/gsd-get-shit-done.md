---
type: entity
entity_type: project
title: "GSD (Get Shit Done)"
created: 2026-05-05
updated: 2026-05-05
tags:
  - gsd
  - spec-driven-development
  - meta-prompting
  - claude-code
  - agent-harness
related:
  - "[[gsd-github-repo]]"
  - "[[gsd-codecentric-deep-dive]]"
  - "[[gsd-hn-discussion]]"
  - "[[Research: how GSD fits into our coding harness setup]]"
---

# GSD (Get Shit Done)

## What It Is
A lightweight meta-prompting, context engineering, and spec-driven development system by TÂCHES (@glittercowboy). 60.1K GitHub stars, MIT License, v1.40.0 (May 2026).

## Core Insight
Fights context rot by externalizing project state into files (`.planning/`) and executing each task in a fresh subagent context window. The orchestrator remains light; all heavy work happens in spawned subagents.

## Architecture
- **59 slash commands** (consolidated from 86 in v1.40)
- **33 subagents** for research, planning, execution, verification
- **Node.js CLI helper** (`gsd-tools.cjs`) for deterministic operations
- **TypeScript SDK** (`gsd-sdk`) for headless automation
- **15+ supported runtimes:** Claude Code, OpenCode, Gemini CLI, Codex, Copilot, Cursor, Windsurf, Antigravity, Augment, Trae, Qwen Code, Hermes Agent, Cline, CodeBuddy

## Pipeline: discuss → plan → execute → verify → ship
1. **Discuss:** Shape implementation preferences (CONTEXT.md)
2. **Plan:** Research + create atomic task plans + verify (RESEARCH.md, PLAN.md)
3. **Execute:** Run plans in waves (parallel where independent), commit atomically
4. **Verify:** Manual user acceptance testing, automated diagnosis
5. **Ship:** Create PR from verified work

## Key Patterns
- **Filesystem as message bus:** All agent communication through `.planning/` files
- **Fresh context per task:** Each executor gets a clean 200K context window
- **Deterministic logic in code:** `gsd-tools.cjs` for operations LLMs do unreliably
- **Model profiles:** quality/balanced/budget/inherit — tiered model selection per agent type

## Limitations (from community feedback)
- Token-heavy — burns through Claude Max limits quickly
- Slow compared to native plan mode
- Degrades on large existing codebases
- Difficult to pivot mid-phase
- Verification uses simple lexical tools, not AST-aware analysis

## Relationship to Our Harness
GSD is **downstream** — it builds applications. Our harness is **upstream** — it controls agent behavior before code generation. They address different layers of the agentic coding stack. See [[Research: how GSD fits into our coding harness setup]].
