---
type: concept
status: developing
created: 2026-05-05
tags:
  - agent-skills
  - methodology
  - discipline
  - tdd
  - workflow
related:
  - "[[superpowers-github-repo]]"
  - "[[superpowers-release-blog]]"
  - "[[superpowers-termdock-analysis]]"
  - "[[skill-first-architecture]]"
  - "[[agent-skills-pattern]]"
  - "[[policy-engine-pattern]]"
---

# Superpowers Methodology

## Definition

Superpowers is an agentic skills framework that gives AI coding agents a disciplined, structured software development methodology. It transforms agents from fast typists into disciplined engineering partners by enforcing process through hard gates — not suggestions, not best-practice advice, but mandatory workflows that block progress until conditions are met.

## Core Principles

1. **Discipline over intelligence** — A disciplined junior engineer ships more reliable code than a brilliant cowboy who skips process. AI agents are the same.
2. **Hard gates over suggestions** — "Always write tests first" in CLAUDE.md is a suggestion that gets ignored under pressure. "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST. Write code before the test? Delete it." is a gate that cannot be bypassed.
3. **Composable workflow** — Each skill's output is the next skill's input. Brainstorming → spec → plan → tasks → subagent implementation → code review → merge. The compounding effect matters more than individual skill quality.
4. **Fresh context per task** — Subagents start clean with only task description and relevant context, not full conversation history. Prevents context pollution and drift.
5. **Progressive disclosure** — Skills load only name and description at startup (~100 tokens each). Full instructions load on demand when task matches.

## The Brainstorm → Plan → Implement → Review Pipeline

```
User describes goal
    ↓
[brainstorming] — Ask clarifying questions, explore alternatives, present design in sections
    ↓ (user approves design)
[using-git-worktrees] — Create isolated branch, verify clean test baseline
    ↓
[writing-plans] — Break into 2-5 min tasks with exact file paths, code, verification steps
    ↓ (user approves plan)
[subagent-driven-development] — Dispatch fresh subagent per task
    ↓ per task
[test-driven-development] — RED: write failing test → GREEN: minimal code to pass → REFACTOR
    ↓
[requesting-code-review] — Review against plan, report by severity, critical = block
    ↓
[finishing-a-development-branch] — Verify tests, present merge/PR options, clean up
```

## Two Types of Enforcement

| Skill Type | Enforcement | Examples |
|-----------|-------------|----------|
| **Rigid (Iron Laws)** | Hard gates, delete-and-restart consequences | TDD, systematic debugging |
| **Adaptive (Structured)** | Checklist, hard gate on entry, flexible execution | Brainstorming, writing plans |
| **Advisory** | Reports findings, human decides | Code review |

## Why Hard Gates Work

LLMs are trained to be helpful, which means they rush to produce output. A prompt saying "write tests first" competes with the model's default helpfulness bias. A hard gate saying "NO production code without a failing test first — delete code written before tests" creates a structural constraint the model cannot bypass without explicitly violating its instructions. The model follows because it understands principles, not because it was told to follow blindly.

## Relationship to Our Harness

Superpowers and our harness share the same mission (discipline for AI agents) but operate at different levels:

| Dimension | Superpowers | Our Harness |
|-----------|-------------|-------------|
| **Enforcement** | Probabilistic (model compliance with skill instructions) | Deterministic (code-level drift monitor, pre-execution gates) |
| **Architecture** | Markdown skills only | Skills + TypeScript code (drift monitor, config, types) |
| **Scope** | Development methodology | Full agentic pipeline (spec, plan, execute, verify, observe, memory) |
| **Portability** | Any SKILL.md-compatible agent | Pi-specific (TypeScript extension API) |
| **Trigger** | Agent self-selects skills by description match | Harness layers fire at deterministic pipeline stages |

Superpowers validates our skill-first architecture choice and can be USED WITHIN our harness — as a `.pi/skills/superpowers/` skill set that the agent loads. But Superpowers cannot replace our code-level enforcement (drift monitor) because its enforcement is only as strong as the agent's compliance with the skill instructions.
