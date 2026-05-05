---
type: source
source_type: engineering-blog
title: "GSD for Claude Code: A Deep Dive into the Workflow System (codecentric)"
author: "Felix Abele"
date_published: 2026-03-03
date_accessed: 2026-05-05
url: "https://www.codecentric.de/en/knowledge-hub/blog/the-anatomy-of-claude-code-workflows-turning-slash-commands-into-an-ai-development-system"
confidence: high
tags:
  - gsd
  - architecture
  - claude-code
  - spec-driven-development
key_claims:
  - "GSD relies entirely on native Claude Code features — no proprietary runtime, no framework"
  - "Architecture: Slash Commands (WHAT), Workflow Files (HOW), References (reusable knowledge), Templates (output formats)"
  - "@-file references for context injection: commands reference workflows which reference templates"
  - "AskUserQuestion tool used for interactive decision points with gates and feedback loops"
  - "Parallel research orchestration: 4 researchers → Synthesizer → Roadmapper, in waves"
  - "Two agent spawning patterns: general-purpose with manual role assignment vs registered agent type"
  - "Bash scripts (gsd-tools.cjs) used for deterministic project state capture — queries that LLMs would do unreliably"
  - "Hooks: SessionStart (update check), PostToolUse (auto-formatting), statusLine (context usage progress bar)"
  - "GSD designed for small to medium projects; not for every use case"
---

# GSD Architecture Deep Dive (codecentric, March 2026)

## Summary

This is the most detailed public architectural analysis of GSD. It walks through the `/gsd:new-project` command step-by-step, showing how Claude Code's native features (skills, agents, hooks, AskUserQuestion, @-file references) are composed into a full software development lifecycle system.

## Architectural Layers

### 1. Slash Commands (Skills)
Each command is a markdown file in `claude/commands/gsd/` with:
- **Frontmatter:** name, description, argument-hint, allowed-tools
- **Prompt body:** XML-structured (`<objective>`, `<execution_context>`, `<process>`) with @-file references

### 2. Workflow Files
The actual logic lives in workflow files (e.g., `workflows/new-project.md`). Slash commands are thin wrappers that declare permissions and reference the workflow.

### 3. Agent Orchestration
- **Wave 1:** 4 parallel researchers (stack, features, architecture, pitfalls) — each writes to its own file
- **Wave 2:** Synthesizer reads all 4 files → `SUMMARY.md`
- **Wave 3:** Roadmapper reads synthesis + requirements → creates roadmap

### 4. Deterministic Tooling
`gsd-tools.cjs` is a Node.js CLI that returns project state as JSON. Avoids the LLM doing unreliable file-existence checks, config loading, or phase number calculations.

### 5. Cross-Session Memory
All state persisted in `.planning/` files (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md). After every completed step, a git commit is performed. `/gsd-resume-work` reconstructs previous state.

## Limitations Noted
- Designed for small to medium projects
- May not go deep enough in some places
- Once you understand the workflow structure, building your own specific systems is straightforward
