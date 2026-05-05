---
type: synthesis
title: "Research: Superpowers Skill for Agentic Coding Agents"
created: 2026-05-05
updated: 2026-05-05
tags:
  - research
  - agent-skills
  - superpowers
  - harness
  - methodology
status: developing
related:
  - "[[superpowers-methodology]]"
  - "[[agent-skills-ecosystem]]"
  - "[[jesse-vincent]]"
  - "[[superpowers-github-repo]]"
  - "[[superpowers-release-blog]]"
  - "[[superpowers-termdock-analysis]]"
  - "[[skill-first-architecture]]"
  - "[[agent-skills-pattern]]"
  - "[[policy-engine-pattern]]"
  - "[[agentic-orchestration-pipeline]]"
  - "[[harness-implementation-plan]]"
sources:
  - "[[superpowers-github-repo]]"
  - "[[superpowers-release-blog]]"
  - "[[superpowers-termdock-analysis]]"
  - "[[superpowers-angle1.json]]"
  - "[[superpowers-angle2.json]]"
---

# Research: Superpowers Skill for Agentic Coding Agents

## Overview

Superpowers (`obra/superpowers`) by Jesse Vincent is the most-adopted agentic skills framework for AI coding agents — 179K GitHub stars, 15.9K forks, MIT license, v5.1.0 (May 2026). It is a complete software development methodology expressed as composable SKILL.md files that enforce disciplined engineering practices through hard gates. Superpowers does not improve the model — it enforces process. And process, not intelligence, is the real bottleneck for AI coding agents.

The framework is deeply relevant to our harness pipeline: Superpowers validates our skill-first architecture, provides a battle-tested pattern for hard-gate enforcement, and can be directly integrated as a `.pi/skills/` skill set. But Superpowers cannot replace our code-level enforcement (drift monitor) — its enforcement is probabilistic (agent compliance with skill instructions), while our harness requires deterministic gates.

## Key Findings

### 1. Superpowers is process-as-discipline, not model improvement (Source: [[superpowers-github-repo]])

Superpowers ships 14+ composable skills organized into a complete development workflow: brainstorming → git-worktrees → writing-plans → subagent-driven-development → TDD → code-review → branch-cleanup. Skills trigger automatically. They are mandatory, not advisory. The agent checks for relevant skills before any task.

### 2. Hard gates beat suggestions every time (Source: [[superpowers-termdock-analysis]])

"Always write tests first" in CLAUDE.md is a suggestion ignored under pressure. "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST. Write code before the test? Delete it. Start over." is a gate that cannot be bypassed. Superpowers' core insight: AI agents respond to structure with explicit consequences.

### 3. Subagent-driven development is the architectural innovation (Source: [[superpowers-release-blog]])

Each task dispatches a fresh subagent with only task description and relevant context — not full conversation history. Two-stage review: spec compliance first, then code quality. Result: Claude can work autonomously for hours without deviating from plan. This prevents context pollution and drift.

### 4. Cross-agent portability via plain Markdown (Source: [[agent-skills-ecosystem]])

Skills are SKILL.md files — not platform-specific plugins. Work across Claude Code, Codex CLI, Cursor, Gemini CLI, OpenCode, GitHub Copilot, and Factory Droid. The Agent Skills open standard was adopted by all major platforms within weeks of release. 490K+ skills exist across marketplaces as of March 2026.

### 5. TDD enforcement with real results (Source: [[superpowers-termdock-analysis]])

chardet 7.0.0 shipped using Superpowers: 41x faster, 96.8% accuracy, dozens of longstanding issues fixed. Test suite covering 2,161 files across 99 encodings was a direct product of enforced TDD.

### 6. Skill creation is meta — TDD for skills (Source: [[superpowers-release-blog]])

Superpowers includes a `writing-skills` skill. Skills are tested by running subagents through realistic pressure scenarios (time pressure, sunk cost). After each failure, skill instructions are strengthened. This is "TDD for skills" — a recursive self-improvement loop.

### 7. Persuasion principles work on LLMs (Source: [[superpowers-release-blog]])

Cialdini's Influence principles (authority, commitment, scarcity, social proof) measurably affect LLM behavior. A Wharton study co-authored by Dan Shapiro put scientific rigor behind this. Superpowers uses these principles in skill design — not to jailbreak agents, but to make them MORE reliable and disciplined.

## How Superpowers Fits Into / Helps Our Workflow

### Direct Integration Path

Superpowers can be integrated as a skill set within our `.pi/skills/` system:

```
.pi/skills/superpowers/
├── brainstorming/SKILL.md
├── writing-plans/SKILL.md
├── test-driven-development/SKILL.md
├── systematic-debugging/SKILL.md
├── subagent-driven-development/SKILL.md
├── requesting-code-review/SKILL.md
├── using-git-worktrees/SKILL.md
└── finishing-a-development-branch/SKILL.md
```

These skills would activate automatically through our existing progressive disclosure mechanism. The agent self-selects relevant skills based on description matching — same as Superpowers' native mechanism.

### Mapping to Our Harness Layers

| Superpowers Skill | Harness Layer | How It Helps |
|------------------|---------------|--------------|
| brainstorming | L1 (Spec Hardening) | Enforces design-before-code; asks clarifying questions; produces signed-off spec |
| writing-plans | L2 (Structured Planning) | Breaks spec into 2-5 min tasks with exact file paths and verification steps |
| test-driven-development | L3 (Execute) | Enforces RED-GREEN-REFACTOR as hard gate; deletes code written before tests |
| systematic-debugging | L3 (Execute) | Four-phase root cause investigation; no fixes without diagnosis |
| requesting-code-review | L4 (Adversarial) | Fresh subagent reviews against plan; critical issues block progress |
| using-git-worktrees | L3 (Execute) | Isolated workspace per task; clean baseline verification |
| subagent-driven-development | L7 (Orchestration) | Dispatches fresh subagent per task; two-stage review; context isolation |

### What Superpowers Validates About Our Architecture

1. **Skill-first architecture** — Superpowers proves that markdown-based skills are the right primitive for agent discipline. Our May 2026 redesign to skill-first architecture is independently validated by the most-adopted framework.

2. **Progressive disclosure** — Superpowers' trigger mechanism (load name+description, activate on match) is identical to our `.pi/skills/` design. Cross-validation increases confidence.

3. **Hard-gate enforcement** — Superpowers' "Iron Laws" (delete code written before tests, no fixes without investigation) map directly to our pre-execution policy gates (P-F1 from Gemini CLI research). Both approaches recognize that suggestions fail under pressure.

4. **Subagent isolation** — Superpowers' fresh-context-per-task pattern maps to our subagent worktree isolation (P25). Both prevent context pollution.

5. **Cross-agent portability** — Superpowers' SKILL.md format works across all major agents. Our `.pi/skills/` format should consider SKILL.md compatibility for ecosystem reuse.

### What Superpowers Does NOT Replace

Superpowers cannot replace our code-level enforcement:

- **Drift Monitor (L2.5)** — Superpowers has no runtime drift detection. It relies on the agent following skill instructions. Our LLM-first drift monitor (Haiku 4.5 every 8 turns) catches semantic drift that skills cannot prevent.

- **Pre-execution Policy Gates** — Superpowers' enforcement is probabilistic (model compliance). Our harness needs deterministic gates (exit-code semantics, tool interception) for safety-critical operations.

- **Pipeline Orchestration (L7)** — Superpowers chains skills implicitly via agent behavior. Our harness needs explicit DAG-based orchestration with contracts between layers.

- **Persistent Memory (L6)** — Superpowers has no cross-session memory beyond the agent's immediate context. Our Obsidian wiki provides canonical memory with ADRs, consensus records, and hot cache.

### Recommended Integration Strategy

1. **Adopt Superpowers as a skill set** — Add Superpowers skills to `.pi/skills/superpowers/`. The agent loads them on demand via progressive disclosure. Zero code changes needed.

2. **Layer deterministic enforcement on top** — Superpowers provides the methodology (probabilistic). Our harness provides the enforcement (deterministic). The drift monitor catches when the agent fails to follow the methodology. The policy engine gates destructive operations.

3. **Customize for our workflow** — Fork and customize Superpowers skills to match our harness layers. Add references to wiki (read ADRs before planning, file consensus after decisions). Add allowed-tools restrictions.

4. **Maintain SKILL.md compatibility** — Ensure our `.pi/skills/` format remains compatible with the Agent Skills open standard. This enables reuse of the 490K+ ecosystem and cross-agent portability.

## Key Entities

- [[jesse-vincent]]: Creator of Superpowers, Request Tracker, K-9 Mail. Founder of Prime Radiant.

## Key Concepts

- [[superpowers-methodology]]: The complete discipline framework — hard gates, composable workflow, two enforcement types
- [[agent-skills-ecosystem]]: The 490K+ skill marketplace, open standard, cross-agent support, security risks

## Contradictions

- **Superpowers skills vs CLAUDE.md**: Some HN commenters argue that SKILL.md files are "just elaborate CLAUDE.md files" and no different from good prompts. The key difference: Superpowers uses hard gates with explicit consequences (delete code, start over), not just instructions. CLAUDE.md is informational; SKILL.md is enforceable. But this distinction is probabilistic — compliance depends on the model following instructions.
- **Community reception**: HN thread on Superpowers launch had mixed reception. Enthusiasts (Simon Willison: "wildly more ambitious") vs skeptics ("voodoo nonsense," "no benchmarks"). The absence of rigorous A/B testing remains a valid criticism.
- **Security risk**: 36.8% of skills have security flaws. Superpowers itself is safe (MIT, open source, from trusted author), but the broader ecosystem carries supply-chain risk.

## Open Questions

- Can Superpowers' hard-gate enforcement be made deterministic? (Currently probabilistic — depends on model compliance with skill instructions)
- How well does Superpowers work with non-Claude models? (Claude Code has deepest integration; other agents get reduced functionality)
- What is the token cost of full Superpowers workflow? (Not documented; subagent-driven development likely has high token consumption)
- Should our `.pi/skills/` format adopt SKILL.md compatibility? (Enables ecosystem reuse but reduces our ability to add harness-specific extensions)
- How do we test skill effectiveness? (Superpowers uses "TDD for skills" with pressure scenarios — can we adopt this for our harness skills?)

## Sources

- [[superpowers-github-repo]]: Primary source — repo README, architecture, skills library, philosophy
- [[superpowers-release-blog]]: Original release announcement with development methodology, persuasion principles, memory system
- [[superpowers-termdock-analysis]]: Third-party deep dive with skill-by-skill analysis, philosophy, practical guidance
