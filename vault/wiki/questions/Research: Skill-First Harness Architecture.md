---
type: synthesis
title: "Research: Skill-First MVP & Harness Implementation Architecture"
created: 2026-05-03
updated: 2026-05-03
tags:
  - research
  - harness
  - mvp
  - skills
  - architecture
  - first-principles
status: developing
related:
  - "[[skill-first-architecture]]"
  - "[[harness-implementation-plan]]"
  - "[[mvp-implementation-blueprint]]"
  - "[[agent-skills-pattern]]"
  - "[[drift-detection-unified]]"
  - "[[harness-engineering-first-principles]]"
  - "[[adr-015]]"
sources:
  - "[[Source: SwirlAI Agent Skills Progressive Disclosure]]"
  - "[[Source: Claude API Agent Skills Overview]]"
  - "[[Source: Blake Crosley Agent Architecture Guide]]"
---

# Research: Skill-First MVP & Harness Implementation Architecture

## Overview

Rethought the entire MVP and harness implementation plans from first principles. The core insight: the harness is NOT a code pipeline — it's a skill coordination layer. 80% of harness functionality can be markdown-based skills (`SKILL.md` files) loaded on-demand via progressive disclosure. Only deterministic infrastructure needs code: the event bus (wiring), the drift monitor (real-time pattern matching), shared types, and config. Everything else — spec hardening, planning, adversarial verification, observability, memory — is an LLM-invoked skill. This cuts the code surface from ~15 TypeScript files to 4, while gaining auto-activation, progressive disclosure, and zero-compile iteration speed.

## Key Findings

- **Skills are the atomic unit of harness behavior.** Validated by Anthropic's open standard (Dec 2025), adopted by OpenAI, Google, GitHub, Cursor within weeks. Skills use three-tier progressive disclosure: Discovery (~80 tokens/skill), Activation (~2,000 tokens), Execution (unlimited supporting files). (Source: [[Source: SwirlAI Agent Skills Progressive Disclosure]])
- **Code is for determinism, not logic.** Hooks guarantee execution (exit code 2 blocks). Skills are probabilistic (model decides when to activate). The drift monitor MUST be code because it runs deterministic pattern matching on every `tool_result` event with sliding windows. Everything else is LLM evaluation and SHOULD be a skill. (Source: [[Source: Blake Crosley Agent Architecture Guide]])
- **The harness pattern is hooks→skills→agents→workflows.** Claude Code's architecture (22+ lifecycle events, markdown skills, subagents, filesystem memory) validates that the harness is "a programmable runtime with an LLM kernel" — not a TypeScript codebase. (Source: [[Source: Blake Crosley Agent Architecture Guide]])
- **Skills compose with hooks.** Skills can define their own hooks in YAML frontmatter that activate only while the skill runs. This creates domain-specific deterministic behavior without polluting other sessions. (Source: [[Source: Blake Crosley Agent Architecture Guide]])
- **Markdown skills ARE the spec.** No separate spec files. The SKILL.md body is simultaneously the specification, the implementation instructions, and the documentation. Supporting files (reference.md, scripts/) provide execution-layer resources. (Source: [[Source: Claude API Agent Skills Overview]])
- **The event bus is the only orchestrator code.** One thin TypeScript file wires pi's native events to skill invocations. It's a router, not logic. Pipeline ordering is enforced by skill activation sequence, not imperative code.
- **File count drops from 15 to 4 TypeScript files.** `src/harness/events.ts` (event bus), `src/harness/drift-monitor.ts` (drift detection), `src/harness/types.ts` (shared types), `src/harness/config.ts` (config loader). All other functionality becomes `.pi/skills/harness-*/SKILL.md` files.

## Key Entities

- [[Anthropic]]: Released Agent Skills open standard Dec 18, 2025. Three-tier progressive disclosure. Adopted industry-wide within weeks.
- [[OpenAI]]: Adopted skills for Codex CLI and ChatGPT.
- [[Google]]: Added skills to Gemini CLI.
- [[GitHub Copilot]]: Launched skills support same day as standard.
- [[Cursor]]: Integrated skills alongside Rules system.

## Key Concepts

- [[skill-first-architecture]]: Harness layers as markdown-based skills instead of TypeScript code modules. Only deterministic infrastructure remains as code.
- [[progressive-disclosure-agents]]: Three-tier loading: metadata (always, ~80 tokens/skill) → full SKILL.md (when relevant, ~2,000 tokens) → supporting files (on demand, unlimited).
- [[agent-skills-pattern]]: Progressive disclosure as a system design pattern. Context windows are finite and lossy — skills keep context lean.

## Architecture Comparison

| Dimension | Old Plan (Code-First) | New Plan (Skill-First) |
|-----------|----------------------|------------------------|
| L1 Spec Hardening | `src/harness/l1-spec.ts` (~300 lines TS) | `.pi/skills/harness-spec/SKILL.md` (markdown) |
| L2 Planning | `src/harness/l2-planner.ts` (~400 lines TS) | `.pi/skills/harness-plan/SKILL.md` (markdown) |
| L2.5 Drift Monitor | `src/harness/l2.5-drift.ts` (~500 lines TS) | **KEPT AS CODE** — deterministic pattern matching |
| L4 Adversarial | `src/harness/l4-critics.ts` (~300 lines TS) | `.pi/skills/harness-critic/SKILL.md` + `.pi/agents/critic.md` |
| P20 Gate | `src/harness/p20-gate.ts` (~100 lines TS) | `.pi/skills/harness-gate/SKILL.md` (bash commands) |
| L5 Observability | `src/harness/l5-observability.ts` (~200 lines TS) | `.pi/skills/harness-observe/SKILL.md` (markdown) |
| L6 Memory | `src/harness/l6-memory.ts` (~150 lines TS) | Already wiki-based (claude-obsidian skills) |
| Event Bus | `src/harness/events.ts` (~200 lines TS) | **KEPT AS CODE** — pi extension wiring |
| Types + Config | `src/harness/types.ts` + `config.ts` (~300 lines) | **KEPT AS CODE** — shared infrastructure |
| **Total TS files** | **~15 files, ~2,500 lines** | **~4 files, ~800 lines** |
| **Total skill files** | **0** | **6 SKILL.md files + supporting** |

## Contradictions

- None identified. All three sources converge on the same architecture: skills for domain expertise, hooks for deterministic enforcement, code only when determinism is required. The skill-first approach is independently validated by Anthropic, Microsoft, OpenAI, and Google within a 4-month window (Dec 2025–Mar 2026).

## Open Questions

- **How does pi's skill system handle skill-to-skill invocation?** Can a harness skill invoke the next pipeline skill programmatically, or does the event bus need to sequence them? The event bus likely sequences — each skill returns, event bus fires next hook.
- **Can pi skills define hooks in frontmatter?** Claude Code skills can. If pi doesn't support this, hooks must remain in the event bus or `.pi/settings.json`.
- **What is the skill context budget in pi?** Claude Code uses 2% of context window with 16,000 char fallback. Pi's budget is unknown.
- **Skill caching behavior.** Smarter implementations cache recently used skills. Does pi reload SKILL.md from disk every activation or cache? This affects drift monitor → spec hardening reinvocation performance.
- **How are skill-generated artifacts stored?** L2 planning generates YAML plan files. Can skills write to `.pi/harness/plans/` directly, or does the event bus broker file writes?
- **Skill version pinning across releases.** When harness skills ship in pi package, compiled prompts vs live markdown: which approach? The research shows build-time compilation is valid but adds complexity vs live markdown that can be user-edited.

## Sources

- [[Source: SwirlAI Agent Skills Progressive Disclosure]]: Mar 11, 2026. Three-tier architecture, ecosystem adoption speed, progressive disclosure as system design pattern.
- [[Source: Claude API Agent Skills Overview]]: Official docs. Filesystem-based skill architecture, three loading levels, security considerations.
- [[Source: Blake Crosley Agent Architecture Guide]]: Apr 29, 2026. Complete harness pattern: hooks, skills, subagents, multi-agent orchestration, memory, production patterns.
