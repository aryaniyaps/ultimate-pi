---
type: concept
title: "Skill-First Harness Architecture"
created: 2026-05-03
updated: 2026-05-03
tags: [concept, harness, skills, architecture, first-principles]
related:
  - "[[Research: Skill-First Harness Architecture]]"
  - "[[harness-implementation-plan]]"
  - "[[mvp-implementation-blueprint]]"
  - "[[agent-skills-pattern]]"
  - "[[harness-engineering-first-principles]]"
  - "[[progressive-disclosure-agents]]"
  - "[[drift-detection-unified]]"
---

# Skill-First Harness Architecture

## Definition

A harness architecture where pipeline layers are implemented as **markdown-based skills** (`.pi/skills/harness-*/SKILL.md`) rather than TypeScript code modules. Only deterministic infrastructure — the event bus, drift monitor, shared types, and config — remains as code. Skills are progressively loaded on-demand via the three-tier disclosure pattern: Discovery → Activation → Execution.

## First Principles

1. **Skill is the atomic unit of harness behavior.** Not a code file, not a function. A skill is a self-contained markdown directory with frontmatter metadata, a body of instructions, and optional supporting files. It activates when the LLM determines it's relevant.

2. **Code is for determinism, not logic.** If a behavior must fire on every matching event with zero exceptions — it's code (hooks, drift monitor). If it's probabilistic evaluation (spec quality, plan correctness, code review) — it's a skill. The model is better at evaluation than imperative code.

3. **Markdown skills ARE the specification.** No separate spec file per harness layer. The `SKILL.md` body is simultaneously the spec, the implementation instructions, and the documentation. Supporting files (`reference.md`, `scripts/`) provide execution-layer resources loaded on demand.

4. **The event bus is a router, not logic.** One thin TypeScript file wires pi's native events to skill invocations. Pipeline ordering is enforced by skill activation sequence — the event bus fires `harness-l1-activated` → L1 skill runs → returns → fires `harness-l2-activated` → L2 skill runs → etc.

5. **Progressive disclosure is the memory model.** Skills load in three tiers: Discovery (metadata only, ~80 tokens/skill, always loaded), Activation (full SKILL.md body, ~2,000 tokens, loaded when relevant), Execution (supporting files, unlimited, loaded on demand). This keeps context lean while enabling unlimited bundled knowledge.

6. **Zero-compile iteration.** Changing a skill is editing markdown. No TypeScript compilation, no npm build step, no restart. Agent picks up changes on next activation. This collapses the edit→build→test cycle for harness behavior.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     THE SKILL-FIRST HARNESS                   │
├─────────────────────────────────────────────────────────────┤
│  CODE LAYER (TypeScript — deterministic, always-on)          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Event Bus   │  │Drift Monitor │  │ Types + Config    │  │
│  │  (routes pi  │  │(pattern match│  │ (shared infra)    │  │
│  │  events→     │  │ every tool_  │  │                   │  │
│  │  skills)     │  │ result event)│  │                   │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
│                                                              │
│  SKILL LAYER (Markdown — probabilistic, on-demand)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ L1 Spec  │ │ L2 Plan  │ │ L4 Critic│ │ L5 Obsrv │       │
│  │ Hardening│ │(DAG gen) │ │(advers.) │ │(metrics) │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ P20 Gate │ │ L6 Memory│ │ L7 Orch. │  L8 already         │
│  │(biome+   │ │(wiki wr. │ │(Archon   │  wiki-based         │
│  │ tsc+fal) │ │ contract)│ │ YAML)    │  skills             │
│  └──────────┘ └──────────┘ └──────────┘                     │
│                                                              │
│  WIKI LAYER (Obsidian — persistent, cross-session)           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ADRs, specs, plans, consensus, hot cache, index     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## What Becomes Skills (and Why)

| Harness Layer | Old: TypeScript | New: Skill | Reason |
|---------------|----------------|------------|--------|
| L1 Spec Hardening | `l1-spec.ts` (~300 lines) | `harness-spec/SKILL.md` | LLM evaluates ambiguity — probabilistic by nature |
| L2 Planning | `l2-planner.ts` (~400 lines) | `harness-plan/SKILL.md` | LLM generates task DAG — probabilistic by nature |
| L4 Adversarial | `l4-critics.ts` (~300 lines) | `harness-critic/SKILL.md` + `.pi/agents/critic.md` | LLM attacks code — probabilistic by nature |
| P20 Gate | `p20-gate.ts` (~100 lines) | `harness-gate/SKILL.md` | Bash commands — skill provides instructions, bash executes |
| L5 Observability | `l5-observability.ts` (~200 lines) | `harness-observe/SKILL.md` | LLM evaluates quality — probabilistic by nature |
| L6 Memory | `l6-memory.ts` (~150 lines) | Already wiki-based skills | No change needed |

## What Stays Code (and Why)

| Component | File | Reason |
|-----------|------|--------|
| Event Bus | `events.ts` (~200 lines) | Wires pi's 5 native events to skill invocations. Must be deterministic — fires on every event, no exceptions. |
| Drift Monitor | `drift-monitor.ts` (~500 lines) | Real-time pattern matching with sliding windows on every `tool_result` event. Sub-millisecond latency required. LLM evaluation every 8 turns is the PRIMARY detection, but the rule-based pre-filter and escalation ladder are deterministic code. |
| Shared Types | `types.ts` (~200 lines) | TypeScript interfaces for Spec, Plan, DriftEvent, CriticVerdict, Config. Needed by both event bus and drift monitor. |
| Config Loader | `config.ts` (~100 lines) | Loads `.pi/harness/config.json`, merges with code defaults. Deterministic — no LLM involvement. |

## Skill Directory Structure

```
.pi/skills/
├── harness-spec/
│   ├── SKILL.md              # L1: Ambiguity detection, spec hardening, harness_ask tool usage
│   └── reference.md          # Spec hardening patterns, ambiguity categories
├── harness-plan/
│   ├── SKILL.md              # L2: YAML task DAG generation, sprint contracts, plan summary
│   └── reference.md          # Plan templates, DAG patterns, sprint contract examples
├── harness-critic/
│   ├── SKILL.md              # L4: Adversarial attack patterns, hard-threshold criteria, debate protocol
│   └── reference.md          # Attack angle catalog, failure pattern taxonomy
├── harness-observe/
│   ├── SKILL.md              # L5: Keep Rate tracking, LLM-as-Judge, satisfaction metrics
│   └── reference.md          # Metric definitions, sampling strategies
├── harness-gate/
│   ├── SKILL.md              # P20: Deterministic gate instructions (biome, tsc, fallow)
│   └── reference.md          # Gate configuration, baseline management
└── harness-memory/
    ├── SKILL.md              # L6: Read-first/write-after wiki contract, hot cache rules
    └── reference.md          # Wiki page templates, staleness rules
```

## File Count Comparison

| Metric | Old (Code-First) | New (Skill-First) | Reduction |
|--------|-----------------|-------------------|-----------|
| TypeScript source files | 15 | 4 | -73% |
| TypeScript lines | ~2,500 | ~800 | -68% |
| Markdown skill files | 0 | 6 SKILL.md + 6 reference.md | New |
| Markdown skill lines | 0 | ~1,200 (instructions) | New |
| Compilation required | Yes (all 15 files) | Yes (4 files only) | -73% |
| Iteration cycle | Edit TS → compile → restart | Edit MD → agent picks up next activation | Seconds vs minutes |

## Why Skills Over Code for Harness Layers

### 1. The Model Is Better at Evaluation Than Imperative Code
L1 spec hardening: "Is this specification ambiguous?" — this is a natural language evaluation task. Writing regex patterns and AST analysis to detect ambiguity is fragile. Asking an LLM "does this spec have unresolved decisions?" is robust. The LLM already runs in the pipeline. Use it.

### 2. Progressive Disclosure Prevents Context Bloat
15 TypeScript files loaded into the agent's context as tool definitions consume tokens permanently. Skills load only when relevant. The discovery layer costs ~80 tokens per skill. All 6 harness skills together cost ~480 tokens at discovery — less than ONE loaded code module.

### 3. User-Editable Without Compilation
A project team can edit `.pi/skills/harness-critic/SKILL.md` to add project-specific attack patterns. No TypeScript knowledge needed. No build step. The markdown skill IS the configuration.

### 4. Skills Compose Naturally with the Wiki
L6 persistent memory is already wiki-based (claude-obsidian skills). Other harness layers reading/writing wiki pages is natural when they're also skills — the LLM invokes wiki-query from within a harness skill the same way it invokes any tool.

### 5. Cross-Platform Compatibility
The SKILL.md format is an open standard adopted by Anthropic, OpenAI, Google, GitHub, and Cursor. Harness skills work on ANY platform that supports the standard. Code modules are pi-specific.

## When NOT to Use a Skill

Skills are the WRONG choice when:
- **Deterministic execution is required.** The drift monitor MUST fire on every `tool_result` event with zero exceptions. Skills are probabilistic — the model decides when to activate them.
- **Sub-millisecond latency is required.** Pattern matching on a sliding window needs <1ms response. LLM invocation adds 200-500ms.
- **The behavior is purely mechanical.** Loading a config file, merging with defaults, registering pi event handlers — these are wiring, not reasoning. Skills add unnecessary LLM overhead.
- **State management across events.** The event bus tracks pipeline phase, turn count, drift history across hundreds of events. Skills are stateless per invocation — they'd need to re-read state from disk each time.

## Migration Path

From current plan (15 TS files) to skill-first (4 TS files + 6 skills):

1. **F0 + L2.5 first** (unchanged — these ARE code): Event bus, types, config, drift monitor. These are the foundation.
2. **Convert L1 Spec Hardening**: Extract the ambiguity detection and spec hardening logic from `l1-spec.ts` into `harness-spec/SKILL.md`. The event bus fires this skill when it detects a `/harness` command.
3. **Convert L2 Planning**: Extract DAG generation and sprint contract logic into `harness-plan/SKILL.md`.
4. **Convert L4 Adversarial**: Already partially skill-based (critic.md agent definition). Extract attack pattern catalog into `harness-critic/SKILL.md`.
5. **Convert P20 Gate**: Already deterministic bash commands. Extract gate instructions into `harness-gate/SKILL.md`.
6. **Convert L5 Observability**: Extract Keep Rate tracking and LLM-as-Judge into `harness-observe/SKILL.md`.
7. **L6 Memory**: Already wiki-based. Add `harness-memory/SKILL.md` for the read-first/write-after contract.
8. **L7 Orchestration**: Already Archon YAML-based. No change.
9. **L8 Wiki Query**: Already claude-obsidian skills. No change.

> [!gap] Pi skill system integration details need verification. Can pi skills invoke other pi skills? Can pi skills write to `.pi/harness/` directories? These determine whether the event bus sequences skills or skills chain themselves.
