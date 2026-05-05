---
type: source
source_type: github-repo
title: "GitHub - gsd-build/get-shit-done"
author: "TÂCHES (@glittercowboy)"
date_published: 2025-12-15
date_accessed: 2026-05-05
url: "https://github.com/gsd-build/get-shit-done"
confidence: high
tags:
  - gsd
  - meta-prompting
  - spec-driven-development
  - context-engineering
  - claude-code
key_claims:
  - "GSD is a lightweight meta-prompting, context engineering, and spec-driven development system for Claude Code (and 15+ other runtimes)"
  - "Solves context rot — the quality degradation that happens as LLMs fill their context window"
  - "60.1k GitHub stars, 5.1k forks, 2,367 commits, 143 contributors (May 2026)"
  - "v1.40.0 released May 3, 2026; MIT License"
  - "Built entirely on Claude Code native features: skills, agents, hooks — ~50 markdown files + a Node.js CLI helper"
  - "Core workflow: discuss → plan → execute → verify → ship (phase-based)"
  - "Multi-agent orchestration: thin orchestrator spawns specialized agents with fresh context per plan"
  - "Atomic git commits per task; wave execution (parallel where independent, sequential where dependent)"
  - "Model profiles: quality/balanced/budget/inherit across planning/execution/verification"
  - "86 skills + 33 subagents full install; --minimal flag cuts to 6 core skills (~700 token overhead vs ~12K)"
  - "Skill consolidation v1.40: 86→59 commands via grouped skills (capture, phase, config, workspace)"
  - "GSD-2 standalone version being built on pi.dev"
---

# GSD (Get Shit Done) — GitHub Repository

## Summary

GSD is the most popular spec-driven development harness in the Claude Code ecosystem. It is a set of ~50 markdown files (skills, agents, workflows), a Node.js CLI helper (`gsd-tools.cjs`), and hooks that install into Claude Code's `.claude/` directory via `npx get-shit-done-cc@latest`. No proprietary runtime — all orchestration uses Claude Code's native Task tool for subagent spawning, file-based state for cross-session memory, and structured XML plans for execution.

## Architecture

- **Skills (59 shipped):** Slash commands like `/gsd-new-project`, `/gsd-plan-phase`, `/gsd-execute-phase`. Each is a markdown file with frontmatter (allowed-tools, description) + XML-structured prompt body.
- **Subagents (33):** Specialized agents for research (4 parallel: stack, features, architecture, pitfalls), planning (planner + plan-checker), execution (executors in waves), verification (verifier + debuggers).
- **Hooks:** SessionStart (update check), PostToolUse (auto-formatting with Prettier), statusLine (context usage + active task).
- **State files:** `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md` — file-based persistent memory across sessions.
- **SDK:** TypeScript ESM package (`gsd-sdk`) for headless CLI with init + auto commands.
- **Security:** Prompt injection detection, path traversal prevention, CI security scanning.

## Key Design Decisions

1. **Deterministic logic in code, not prompts.** The `gsd-tools.cjs` CLI handles file existence checks, config loading, phase numbering — operations where scripts are more reliable than LLM prompts.
2. **Fresh context per plan.** Plans are small enough to execute in a clean 200K context window. No accumulated garbage.
3. **Filesystem as message bus.** Agent-to-agent communication happens exclusively through files in `.planning/`.
4. **Two spawning patterns:** General-purpose agents with manual role assignment (researchers share one definition) vs registered agent types (planner, verifier have unique definitions).
