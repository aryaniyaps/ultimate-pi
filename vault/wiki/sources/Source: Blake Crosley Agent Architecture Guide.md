---
type: source
source_type: engineering-blog
title: "Blake Crosley — Agent Architecture: Building AI-Powered Development Harnesses"
author: "Blake Crosley"
date_published: 2026-04-29
url: "https://blakecrosley.com/guides/agent-architecture"
confidence: high
key_claims:
  - "The harness is a programmable runtime with an LLM kernel — not a chat box with file access"
  - "Hooks guarantee execution (exit code 2 blocks). Prompts achieve ~80% compliance."
  - "Skills encode domain expertise that auto-activates via LLM reasoning"
  - "Subagents prevent context bloat — isolated context windows for exploration"
  - "Memory lives in the filesystem — files persist across context boundaries"
  - "Multi-agent deliberation catches blind spots that single agents cannot"
  - "The harness pattern is the system — CLAUDE.md, hooks, skills, agents, memory compose into a deterministic layer"
  - "Code is cheap now; verification is the expensive part"
  - "Single-agent systems have a structural blind spot: they cannot challenge their own assumptions"
  - "Fresh-context iteration (Ralph Loop) beats long conversations for quality beyond 90 minutes"
  - "Production harness reduced false completion rate from 35% to 4% and blocked 7 credential leaks"
tags: [source, agent-architecture, harness, hooks, skills, multi-agent]
related:
  - "[[harness-engineering-first-principles]]"
  - "[[agent-skills-pattern]]"
  - "[[lifecycle-hooks]]"
  - "[[consensus-debate]]"
  - "[[skill-first-architecture]]"
---

# Blake Crosley — Agent Architecture Guide

## Summary

Comprehensive 12,783-word guide on building production AI agent harnesses. Published April 29, 2026, updated through Google Cloud Next 2026 (April 22-24). Covers the complete stack: hooks, skills, subagents, multi-agent orchestration, memory, and production patterns. Based on the author's implementation: 84 hooks, 48 skills, 19 agents, ~15,000 lines of orchestration.

## Key Contributions

### The Harness Pattern

The harness is not a framework — it's a pattern: a composable set of files, scripts, and conventions that wrap an AI coding agent in deterministic infrastructure. Four layers:

1. **Instruction Layer**: CLAUDE.md + rules directories — what the agent knows
2. **Extension Layer**: Skills (domain expertise), Hooks (deterministic gates), Memory (persistent state), Agents (specialized subagents)
3. **Orchestration Layer**: Multi-agent patterns, spawn budgets, consensus validation
4. **Core Layer**: Main conversation context (LLM)

> "Most users work entirely in the Core Layer, watching context bloat and costs climb. Power users configure the Instruction and Extension layers."

### Hooks vs Skills vs Subagents Decision Framework

| Problem | Use | Why |
|---------|-----|-----|
| Format code after every edit | PostToolUse hook | Must happen every time, deterministically |
| Block dangerous bash commands | PreToolUse hook | Must block before execution, exit code 2 |
| Apply security review patterns | Skill | Domain expertise that auto-activates |
| Explore codebase without polluting context | Explore subagent | Isolated context, returns summary only |
| Run experimental refactoring safely | Worktree-isolated subagent | Changes can be discarded |
| Review code from multiple perspectives | Parallel subagents | Independent evaluation |
| Decide on irreversible architecture | Multi-agent deliberation | Confidence trigger + consensus |

### The Distinction That Matters

> "Hooks guarantee execution; prompts do not. Use hooks for linting, formatting, security checks, and anything that must run every time regardless of model behavior. Exit code 2 blocks actions. Exit code 1 only warns."

> "Skills are model-invoked extensions. Claude discovers and applies them automatically based on context, without you explicitly calling them. The moment you catch yourself re-explaining the same context across sessions is the moment you should build a skill."

### Production Results

A production harness processed 12 PRDs (47 stories) across 8 overnight sessions:

| Metric | Minimal Harness | Full Harness |
|--------|----------------|--------------|
| False completion rate | 35% | 4% |
| Credential leaks | 2 leaked | 7 blocked |
| Destructive commands | 1 force-push | 4 blocked |
| Revision rounds/story | 2.1 | 0.8 |
| Token overhead | 0% | ~3.2% |

### Context Degradation Research

Microsoft Research + Salesforce: 15 LLMs, 200,000+ conversations, 39% average performance drop from single-turn to multi-turn. The degradation starts in as few as two turns. Fresh-context iteration (Ralph Loop) beats long conversations for quality beyond 60-90 minutes.

### Multi-Agent Deliberation Findings

Free-form debate rounds produced 7,500 tokens of debate with rounds 2-3 just restating positions. Structured dimension scoring replaced free-form debate, dropping cost by 60% while improving ranking quality. Independence is critical — two agents with visibility into each other's findings converged to similar scores (0.45 vs 0.48). Without visibility: 0.45 vs 0.72 — the gap is the cost of herding.

## What We Adopt

- The hook/skill/agent differentiation as the primary architectural decision framework
- "Code is for determinism, skills are for expertise" as the first-principles dividing line
- Filesystem as memory (our wiki vault IS this pattern)
- Fresh-context iteration via subagents (we have pi-subagents for this)
- Production metrics as evidence that harness infrastructure compounds (3.2% overhead prevents 35% false completion)
- Structured dimension scoring over free-form debate (we already adopted iMAD selective routing)

## What We Deliberately Do NOT Adopt

- Full Claude Code dependency: our harness runs on pi, not Claude Code. But the architectural principles transfer.
- 84 hooks / 48 skills scale: excessive for an MVP. Start with 4-6 skills.
- Agent Teams (Claude Code proprietary): use pi-subagents for equivalent isolation.
