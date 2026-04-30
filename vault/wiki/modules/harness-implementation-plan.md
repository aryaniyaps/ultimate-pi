---
type: module
title: Harness Implementation Plan
status: active
created: 2026-04-28
updated: 2026-04-30
tags: [harness, ultimate-pi, implementation, architecture, master-plan]
sources:
  - "[[meng2026-agent-harness-survey]]"
  - "[[anthropic2026-harness-design]]"
  - "[[bockeler2026-harness-engineering]]"
  - "[[forgecode-gpt5-agent-improvements]]"
  - "[[wozcode]]"
  - "[[fan2025-imad]]"
  - "[[ironclaw-drift-monitor]]"
related:
  - "[[harness]]"
  - "[[agentic-harness]]"
  - "[[harness-h-formalism]]"
  - "[[model-adaptive-harness]]"
  - "[[feedforward-feedback-harness]]"
  - "[[drift-detection-unified]]"
  - "[[adr-011]]"
  - "[[consensus-debate]]"
---

# Harness Implementation Plan

**Master plan** for the ultimate-pi agentic harness. Consolidates all research from April 2026 — WOZCODE token reduction, model-adaptive harness design, semantic code search, consensus debate, meta-agent drift detection, and latest academic papers (Meng, Anthropic, Böckeler, Forge Code, iMAD). This is the single authoritative source for harness architecture, build phases, and token budgets.

## First Principles

1. **The harness — not the model — determines reliability at scale.** (Meng et al. 2026, 110+ papers, 23 systems). Models reach the same capability ceiling only after harness adaptation (Forge Code: GPT 5.4 and Opus 4.6 both hit 81.8% on TermBench 2.0).
2. **Every pipeline layer reads wiki first, writes wiki after.** Enforcement at L7 extension hooks. [[adr-010]].
3. **Write once for strictest model (GPT-safe). Relax for forgiving models.** [[model-adaptive-harness]].
4. **Three quality concerns, three timings:** Syntax (inline, blocks progress), Semantics (L4, needs LLM), Style (Phase 16 final gate, deterministic tools).
5. **Debate is selective, not always-on.** Pre-debate gating classifier saves 92% tokens (iMAD, AAAI 2026). [[selective-debate-routing]].
6. **Context drift is a positive feedback loop.** Each failed attempt accelerates failure. Meta-agent detection + pruning + restart breaks the loop. [[drift-detection-unified]].

---

## Formal Model: H = (E, T, C, S, L, V)

From Meng et al. (2026) survey of 110+ papers. Our harness maps as:

| Component | Our Implementation |
|-----------|-------------------|
| **E** Execution Loop | L1-L4 pipeline (Spec → Plan → Execute → Verify) |
| **T** Tool Registry | Tool schemas, MCP tools (lean-ctx 48 tools, ck semantic search, Gitingest), skills |
| **C** Context Manager | Wiki knowledge base, AST truncation (Phase 10), lean-ctx compression, think-in-code enforcement |
| **S** State Store | Wiki vault persistence, ctx_session cross-session memory, hot.md cache |
| **L** Lifecycle Hooks | L7 Archon orchestration, post-edit validation hooks, drift monitor hooks |
| **V** Evaluation Interface | L4 adversarial verification, L5 observability, terminal-bench evaluation |

Gaps to close: explicit lifecycle hook contracts, systematic action trajectory tracking, cross-harness portability testing.

---

## Feedforward-Feedback Control Framework

From Böckeler (2026, Martin Fowler). Cross-reference audit of our pipeline:

| Control Type | Our Implementation |
|-------------|-------------------|
| **Feedforward-Computational** | Tool schemas, `tsc --noEmit`, JSON schema validation, structured output contracts |
| **Feedforward-Inferential** | SKILL.md files, ADRs, wiki pages, AGENTS.md, model profiles |
| **Feedback-Computational** | Inline syntax validation (Phase 12), final lint+format gate (Phase 16), ck semantic grep |
| **Feedback-Inferential** | L4 adversarial verification, L2 plan review, L1 spec debate, meta-agent drift monitor |

Unsolved: Behaviour Harness (functional correctness verification). Current approach (AI-generated tests + manual testing) is insufficient. Future Phase 18.

---

## The 8-Layer Runtime Pipeline

Every task flows through all layers. No skip rule. Verification is mandatory.

```
L1: Spec Hardening        → L2: Structured Planning   → L2.5: Runtime Drift Monitor
  ↓                                                         ↓
L3: Grounding Checkpoints → L4: Adversarial Verification → Phase 16: Lint+Format Gate
  ↓
L5: Automated Observability → L6: Persistent Memory → L7: Schema Orchestration → L8: Wiki Query
```

| # | Layer | Module | Purpose |
|---|-------|--------|---------|
| 1 | Spec Hardening | [[spec-hardening]] | Block execution until ambiguities resolved |
| 2 | Structured Planning | [[structured-planning]] | Machine-readable task DAG before code. Sprint contracts (agree "done" before L3) |
| 2.5 | Runtime Drift Monitor | [[drift-detection-unified]] | Detect stuck patterns, prune dead context, restart agent |
| 3 | Grounding Checkpoints | [[grounding-checkpoints]] | Smallest verifiable change + spec-drift detection |
| 4 | Adversarial Verification | [[adversarial-verification]] | Critic agents attack, not review. Multi-round debate (selective routing). Hard-threshold pass/fail criteria. |
| 5 | Automated Observability | [[automated-observability]] | Instrumentation is definition-of-done |
| 6 | Persistent Memory | [[persistent-memory]] | claude-obsidian wiki as knowledge base |
| 7 | Schema Orchestration | [[schema-orchestration]] | Archon workflow DAG orchestrates all layers. Enforces read-first/write-after contract. |
| 8 | Wiki Query Interface | [[wiki-query-interface]] | LLM-native search via claude-obsidian skills |

---

## Build Phases

Organized by pipeline position, not sequential numbering. Each phase maps to a specific layer or cross-cutting concern.

### Foundation (Phase 0)

| Phase | What | Files |
|-------|------|-------|
| F0 | Foundation schemas + config | `lib/harness-schemas.ts`, `lib/harness-config.ts`, `.pi/harness.example.json` |
| F0 | H=(E,T,C,S,L,V) formal mapping to docs | Update harness docs |
| F0 | Model profile system (opus/gpt/gemini/strict) | `lib/harness-profiles.ts` |

### L1-L2: Pre-Execution

| Phase | What | Layer | Files |
|-------|------|-------|-------|
| P1 | Spec Hardening | L1 | `lib/harness-spec.ts`, `extensions/harness-spec.ts` |
| P2 | Structured Planning + Sprint Contracts | L2 | `lib/harness-planner.ts`, `extensions/harness-planner.ts` |
| P2b | Pre-debate gating classifier (selective routing per iMAD) | L1/L2/L4 | `lib/harness-debate-gate.ts` |

### L2.5: Runtime Drift Monitor

| Phase | What | Layer | Files |
|-------|------|-------|-------|
| P3 | Rule-based stuck-pattern detection (repetition, failure spiral, tool cycling, silence, rework, excessive search) | L2.5 | `lib/harness-drift-monitor.ts` |
| P4 | Context pruning + correction injection | L2.5 | `lib/harness-drift-monitor.ts` |
| P5 | Escalation model (soft nudge → strong nudge → forced restart) | L2.5 | `lib/harness-drift-monitor.ts` |
| P6 | DriftMonitor config + model-adaptive thresholds | L2.5 | `.pi/harness/drift-monitor.json` |
| P7 | Extension hooks (before_llm_call / after_tool_call) | L2.5 | `extensions/harness-drift-monitor.ts` |

### L3: Execution Layer (with Tool Enhancements)

| Phase | What | Layer | Files |
|-------|------|-------|-------|
| P8 | Grounding Checkpoints (MVC execution, spec-drift detection) | L3 | `lib/harness-executor.ts`, `extensions/harness-executor.ts` |
| P9 | AST Truncation & Ranked Reading (WOZCODE-inspired) | L3 tools | `lib/harness-ast.ts`, `lib/harness-search.ts` |
| P10 | Fuzzy Edit Matching (tolerate whitespace/indentation drift) | L3 tools | `lib/harness-edit.ts` |
| P11 | Inline Syntax Validation — compilers/parsers only, <2s | L3 tools | `lib/harness-validate.ts`, `lib/harness-sql-fix.ts` |
| P12 | Post-edit validation hook (integrate into L3 executor) | L3 | Update `lib/harness-executor.ts` |
| P13 | Semantic Code Search — ck MCP integration, 3-layer enforcement | L3 tools | `.pi/mcp/ck-search.json`, update AGENTS.md |
| P14 | Think-in-Code Enforcement — system prompt + ctx_execute sandbox | L3 tools | Update AGENTS.md, `.pi/settings.json` |
| P15 | Gitingest skill — bulk external repo ingestion | L3 tools | `.pi/skills/gitingest/SKILL.md` |

### L4: Adversarial Verification

| Phase | What | Layer | Files |
|-------|------|-------|-------|
| P16 | Critic agents with hard-threshold pass/fail criteria | L4 | `lib/harness-critics.ts`, `extensions/harness-critics.ts` |
| P17 | Consensus Debate Transport — pi-messenger (stripped) | L4 cross | `lib/harness-messenger.ts` |
| P18 | Consensus Debate Protocol — DebateSession, Budget, Convergence | L4 cross | `lib/harness-debate.ts`, `lib/harness-schemas.ts` |
| P19 | Debate integration: L1 spec debate, L2 plan debate, L4 multi-round | L1/L2/L4 | Update `extensions/harness-*.ts` |

### L5-L8: Post-Verification

| Phase | What | Layer | Files |
|-------|------|-------|-------|
| P20 | Final Lint + Format Gate (post-L4, deterministic, no LLM) | Gate | `lib/harness-polish.ts`, `extensions/harness-polish.ts` |
| P21 | Automated Observability | L5 | `lib/harness-observability.ts`, `extensions/harness-observability.ts` |
| P22 | Persistent Memory (wiki vault, hot cache, lint schedule) | L6 | `extensions/harness-knowledge-base.ts` |
| P23 | Schema Orchestration (Archon DAG, read-first enforcer) | L7 | `.archon/workflows/*.yaml`, `extensions/harness-orchestrator.ts` |
| P24 | Wiki Query Interface (3-depth modes) | L8 | Integrated via claude-obsidian skills |

### Cross-Cutting

| Phase | What | Files |
|-------|------|-------|
| P25 | Haiku Model Router — route exploration to cheap model | `lib/harness-router.ts`, `lib/harness-explorer.ts` |
| P26 | Package integration — update package.json, README, PLAN.md | Multiple |
| P27 | Context Anxiety Guard — detect and mitigate rushing | `lib/harness-anxiety.ts` |

### Future Phases (Not Scheduled)

| Phase | What | Source |
|-------|------|--------|
| F1 | Harness Auto-Optimization — auto-tune budgets, learn profiles, remove dead gates | [[self-evolving-harness]] |
| F2 | Behaviour Harness — functional correctness verification (unsolved problem) | [[feedforward-feedback-harness]] |
| F3 | Model Profile Auto-Learning — learn from execution traces instead of hand-coding | [[self-evolving-harness]] |

---

## Unified Token Budget

Single authoritative budget. All previous fragmented estimates consolidated.

### Per-Layer Budget (per subtask)

| Layer / Phase | Tokens | Mechanism |
|---------------|--------|-----------|
| L1 Spec Hardening | ~2,000 | Mandatory read + hardening + selective debate (~20% tasks trigger debate, +1,500 avg) |
| L2 Planning + Sprint Contracts | ~4,500 | Base plan + sprint contracts + selective debate (~20% tasks, +2,000 avg) |
| L2.5 Drift Monitor | ~0-300 | Rule-based detection costs 0 tokens. LLM-based every 15 steps (Opus) = ~500. Avg ~150. |
| L3 Grounding + Execution | ~500-600 | Checkpoint overhead. Inline validation adds latency but saves retry tokens. |
| L4 Adversarial Verification | ~4,500 | Hard-threshold criteria + selective multi-round debate (~30% tasks trigger 2+ rounds, +2,000 avg) |
| Phase 16 Lint+Format Gate | ~0 | Deterministic tooling, no LLM. Time: <10s. |
| L5 Observability | ~1,500 | Metric definitions, verification |
| L6 Memory Writes | ~1,000 | Haiku for standard writes, Opus for deep synthesis |
| L7+L8 Orchestration + Query | ~1,000 | Wiki bootstrapping amortized |
| **Total per subtask** | **~15,000-16,000** | Down from original ~17,500 baseline |

### Savings Mechanisms (relative to naive baseline)

| Mechanism | Savings | Source |
|-----------|---------|--------|
| AST truncation (read tool) | 30-50% input tokens on code exploration | [[wozcode]] |
| Fuzzy edit matching | Eliminates 5-15% retry round-trips | [[wozcode]] |
| Inline syntax validation | 10-20% fewer error-recovery tokens | [[wozcode]] |
| Haiku model router | ~40% operations on 15× cheaper model → 15-25% cost reduction | [[wozcode]] |
| Selective debate routing | 92% token savings on ~80% of debate-invoked tasks | [[fan2025-imad]] |
| Think-in-Code enforcement | 30-200× reduction on data analysis calls | [[think-in-code]] |
| Context drift pruning | 5-10× reduction for stuck sessions | [[drift-detection-unified]] |

### 5-Subtask Plan Budget

| Component | Naive Baseline | With All Improvements |
|-----------|---------------|----------------------|
| Pipeline overhead | ~87,500 | ~75,000-80,000 |
| Coding tokens | variable | -25-55% (AST truncation + fuzzy edits) |
| **Total 5-subtask** | **~87,500+** | **~55,000-65,000 + coding** |

---

## New Tools Integrated

Tools identified from April 2026 research, now part of the implementation plan:

| Tool | Phase | Purpose | Integration |
|------|-------|---------|-------------|
| **ck** (semantic code search) | P13 | Hybrid BM25+embeddings code search, grep-compatible, MCP-native | MCP server: `ck --serve`. 3-layer enforcement: AGENTS.md rule + MCP registration + shell interception |
| **Gitingest** (bulk ingestion) | P15 | Convert external repos → structured LLM text | `/gitingest` skill wrapping Python package |
| **pi-messenger** (stripped) | P17 | File-based agent messaging transport for consensus debate | Dependency in package.json. Strip all UI overlays. |
| **pi-lean-ctx** (native) | F0 | 48 MCP tools, AST compression, governance, shell patterns | Already adopted: [[2026-04-30-pi-lean-ctx-native]] |

---

## Drift Detection: Three Paradigms, Unified

See [[drift-detection-unified]] for full specification. Summary:

| Paradigm | Layer | Detects | Mechanism | Intervention |
|----------|-------|---------|-----------|-------------|
| **Spec Drift** | L3 | Scope creep, spec violation | Compare current state to hardened spec hash | Abort, replan from L2 |
| **Tool-Call Drift** | L2.5 | Stuck patterns, context pollution, loop cycles | Rule-based (6 patterns) + LLM-based (semantic) | Prune dead context, inject correction, restart agent |
| **Implementation Drift** | L4 | Code doesn't match spec | Adversarial verification, multi-round debate | Rework subtask, re-verify |

These are complementary, not redundant. Each targets a different failure mode at a different pipeline stage.

---

## "Think in Code" Integration

From context-mode research. Enforced at 3 levels:

1. **System Prompt** (zero cost, immediate): AGENTS.md rule — "When analyzing/filtering/comparing data, write code. Output only the answer. Never read raw data into context for mental processing."
2. **Tool Interception** (L3): PreToolUse hook detects data-analysis-like Read/Bash calls → routes to `ctx_execute()` sandbox (via pi-lean-ctx).
3. **PostToolUse Compression** (L3): When large output enters context, lean-ctx shell patterns auto-compress.

Expected savings: 30-200× reduction on data analysis tool calls.

---

## Key Architecture Decisions

- **[[adr-008|ADR-008 (Black-Box QA)]]**: Tests from spec only, never from implementation
- **[[adr-009|ADR-009 (claude-obsidian Mode B)]]**: Replaces Vectra + embeddings with LLM-native search
- **[[adr-010|ADR-010 (Wiki Tight-Coupling)]]**: Every layer reads wiki first, writes wiki after
- **[[adr-011|ADR-011 (Consensus Debate with Selective Routing)]]**: Multi-agent debate via pi-messenger transport, gated by iMAD-style hesitation classifier. UPDATE: selective routing adopted per iMAD findings (2026-04-30).

---

## Wiki Integration Contract

Per [[adr-010]] and [[harness-wiki-pipeline]]:

- **Read-first**: Every layer queries wiki for relevant ADRs, specs, patterns before executing
- **Write-after**: Every state transition writes a wiki artifact (decision, pattern, event)
- **Staleness rules**: Status propagation, decision referencing, cross-reference integrity, contradiction resolution, hot cache freshness, lint schedule (every 10-15 writes), index synchronization
- **Enforcement**: L7 schema orchestration extension hooks

---

## What Never Adapts (Cross-Model Invariants)

Per [[model-adaptive-harness]]:

- Pipeline phase ordering and layer requirements
- Quality standards and source attribution
- Confidence labeling
- Budget constraints (max rounds, max tokens, max pages)
- Verification requirements (what must be checked, even if how varies)
- Read-first/write-after wiki contract
- No-skip rule (verification is mandatory)

---

## What Adapts Per Model

See [[harness-configuration-layers]] for full table. Key differences:

| Dimension | Opus/Claude | GPT | Gemini |
|-----------|-------------|-----|--------|
| Structure | Tolerates nesting | Needs flat, constraints-first | TBD |
| Verification | Natural double-check | Must be enforced hard gate | TBD |
| Truncation | Reads metadata | Needs in-band body text | TBD |
| Completion | Self-aware of gaps | Stops at plausible-but-incomplete | TBD |
| Drift detection | LLM-based every 15 steps | Rule-based every step | Rule-based every 10 steps |

**Design principle**: Write once for strict (GPT-safe defaults). Relax for forgiving models.
