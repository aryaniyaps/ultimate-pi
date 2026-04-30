---
type: module
title: Harness Implementation Plan
status: developing
created: 2026-04-28
updated: 2026-04-30
tags: [harness, ultimate-pi, implementation, architecture]
sources:
  - "[[harness-implementation-plan]]"
related:
  - "[[agentic-harness]]"
  - "[[spec-hardening]]"
  - "[[structured-planning]]"
  - "[[grounding-checkpoints]]"
  - "[[adversarial-verification]]"
  - "[[persistent-memory]]"
  - "[[automated-observability]]"
  - "[[adr-011]]"
  - "[[consensus-debate]]"
  - "[[pi-messenger-analysis]]"
---

# Harness Implementation Plan

Project page for the ultimate-pi agentic harness implementation. See the full concept at [[agentic-harness]].

## Build Phases

| Phase | What | Files |
|-------|------|-------|
| 0 | Foundation | `lib/harness-schemas.ts`, `lib/harness-config.ts`, `.pi/harness.example.json` |
| 1 | Memory (L6) | Install claude-obsidian skills, scaffold vault Mode B, `extensions/harness-knowledge-base.ts` |
| 2 | Spec Hardening (L1) | `lib/harness-spec.ts`, `extensions/harness-spec.ts` |
| 3 | Planning (L2) | `lib/harness-planner.ts`, `extensions/harness-planner.ts` |
| 4 | Execution+Grounding (L3) | `lib/harness-executor.ts`, `extensions/harness-executor.ts` |
| 5 | Automated QA (L4) | `lib/harness-qa.ts`, `extensions/harness-qa.ts` |
| 6 | Critics (L5) | `lib/harness-critics.ts`, `extensions/harness-critics.ts` |
| 7 | Observability (L6) | `lib/harness-observability.ts`, `extensions/harness-observability.ts` |
| 8 | Archon Integration (L7) | `.archon/workflows/*.yaml`, `.archon/commands/harness.md` |
| 9 | Package integration | Update package.json, README, PLAN.md |

## Key Architecture Decisions

- **[[adr-008|ADR-008 (Black-Box QA)]]**: Tests from spec only, never from implementation
- **[[adr-009|ADR-009 (claude-obsidian Mode B)]]**: Replaces Vectra + embeddings with LLM-native search
- **[[adr-010|ADR-010 (Wiki Tight-Coupling)]]**: Every layer reads wiki first, writes wiki after
- **[[adr-011|ADR-011 (Consensus Debate)]]**: Multi-agent back-and-forth argument via pi-messenger transport

## Token Budget (Current)

| Layer | Tokens/subtask |
|-------|---------------|
| Spec hardening | ~2,000 |
| Planning + review | ~5,000 |
| Grounding checkpoints | ~500 |
| Automated QA | ~3,500 |
| Critics (2 focus areas) | ~4,000 |
| Observability | ~1,500 |
| Memory writes | ~500 / ~1,500 (standard/deep) |
| **Total per subtask** | **~17,500** |

Typical 5-subtask plan: ~83,500 tokens overhead + coding tokens.

---

## WOZCODE-Inspired Enhancements (Phase 10+)

Research: [[research-wozcode-token-reduction]]. WOZCODE achieves 25-55% token reduction via three levers — smarter search, fuzzy edits, quality loop — that map to new capabilities in our harness.

### Phase 10: AST Truncation & Ranked Reading

Add AST-aware progressive disclosure to the `read` tool. See [[ast-truncation]].

| Capability | Files | Depends On |
|-----------|-------|------------|
| Tree-sitter AST truncation | `lib/harness-ast.ts` | Existing repo-map-ranking infra |
| `read --truncate` mode | Update `read` tool | AST truncation |
| `read --expand funcName` on-demand | Update `read` tool | AST truncation |
| Ranked snippet search (not full grep) | `lib/harness-search.ts` | repo-map-ranking |

**Expected savings**: 30-50% reduction in input tokens for code exploration calls.

### Phase 11: Fuzzy Edit Matching

Add normalization layer to the `edit` tool. See [[fuzzy-edit-matching]].

| Capability | Files | Depends On |
|-----------|-------|------------|
| Whitespace/character normalization | `lib/harness-edit.ts` | None |
| Indentation-aware diff matching | `lib/harness-edit.ts` | Normalization |
| Ambiguity detection + fallback | `lib/harness-edit.ts` | Fuzzy matching |

**Expected savings**: Eliminates 5-15% of retry round-trips.

### Phase 12: Inline Post-Edit Validation

Run compilers/linters/parsers after each edit, before model sees result. See [[inline-post-edit-validation]].

| Capability | Files | Depends On |
|-----------|-------|------------|
| `post-edit-validate` hook (L3) | `lib/harness-executor.ts` | Grounding checkpoints |
| TS/JS syntax validation | `lib/harness-validate.ts` | `tsc --noEmit` |
| JSON/YAML parser validation | `lib/harness-validate.ts` | None |
| SQL dialect auto-fix | `lib/harness-sql-fix.ts` | SQL linter |
| Better error context (real diffs) | `lib/harness-executor.ts` | Post-edit validate |

**Expected savings**: Catches syntax errors pre-model — 10-20% reduction in error-recovery tokens.

### Phase 13: Haiku Model Router

Route read-only exploration to cheaper model. See [[model-routing-agents]].

| Capability | Files | Depends On |
|-----------|-------|------------|
| `ModelRouter` component | `lib/harness-router.ts` | Archon orchestrator (L7) |
| `woz:explore` Haiku subagent | `lib/harness-explorer.ts` | ModelRouter |
| Operation-type routing rules | `lib/harness-router.ts` | L8 wiki-query-interface |
| Summary-to-parent contract | `lib/harness-explorer.ts` | Haiku agent |

**Expected savings**: ~40% of operations on 15× cheaper model → ~15-25% overall cost reduction.

### Revised Token Budget (With WOZCODE Enhancements)

| Layer | Current | With WOZCODE | Savings Mechanism |
|-------|---------|-------------|-------------------|
| Spec hardening | ~2,000 | ~2,000 | No change (critical path) |
| Planning + review | ~5,000 | ~3,500 | Haiku for review |
| Grounding checkpoints | ~500 | ~600 | Inline validation adds latency but saves retries |
| Automated QA | ~3,500 | ~3,500 | No change (quality-critical) |
| Critics (2 focus areas) | ~4,000 | ~4,000 | No change (adversarial) |
| Observability | ~1,500 | ~1,500 | No change |
| Memory writes | ~1,500 | ~1,000 | Haiku for standard writes |
| **Coding tokens** | variable | **-25-55%** | AST truncation + fuzzy edits |
| **Total per subtask** | **~17,500** | **~12,500-15,000** | 15-30% overhead reduction |

### Fundamental Architecture Changes Required

These are not incremental — they require structural changes to the agent:

1. **Model router layer**: The agent must dispatch operations to different models. This is a new cross-cutting concern between L7 (orchestration) and L3/L8 (execution). Currently, the harness assumes one model for all operations.

2. **Inline validation pipeline**: Current validation is post-hoc (L3 checks after all edits, L4 attacks after phase complete). WOZCODE's inline validation interposes after each individual tool invocation — a fundamentally tighter loop.

3. **AST-aware tool primitives**: The `read`, `search`, and `grep` tools must become AST-aware. This requires tree-sitter integration at the tool layer, not just the planning layer (where repo-map-ranking currently sits).

4. **Non-exact tool matching**: The `edit` tool's contract changes from "exact string match" to "best-effort fuzzy match with exact fallback." This is a semantic change to a core tool primitive.

5. **Tool result intermediation**: Currently, tool results go straight to the model. With inline validation, the tool pipeline must intercept results, run validators, attempt auto-fixes, and only then surface the (possibly transformed) result to the model.

---

## Consensus Debate (Phases 14-15)

Research: [[adr-011]], [[consensus-debate]], [[pi-messenger-analysis]]. The best human software decisions come from back-and-forth arguing. Single-pass review is insufficient — agents need multi-round dialectical debate with consensus budgets.

### Phase 14: Consensus Transport (pi-messenger integration)

Adopt pi-messenger's file-based agent messaging as transport. Strip all UI overlays.

| Capability | Files | Depends On |
|-----------|-------|------------|
| Install pi-messenger as dependency | `package.json` | None |
| Transport layer: registry, inbox, watcher | `lib/harness-messenger.ts` | pi-messenger |
| `DebateSession` class | `lib/harness-debate.ts` | Transport layer |
| Consensus message schema | `lib/harness-schemas.ts` (extend) | None |
| Convergence detection | `lib/harness-debate.ts` | DebateSession |

### Phase 15: Consensus Protocol

Structured debate with budgets, verdicts, and harness integration.

| Capability | Files | Depends On |
|-----------|-------|------------|
| `ConsensusBudget` enforcement | `lib/harness-debate.ts` | Phase 14 |
| Verdict generation (CONSENSUS/DEADLOCK/BUDGET_EXHAUSTED) | `lib/harness-debate.ts` | Phase 14 |
| Debate transcript → wiki artifact | `extensions/harness-debate.ts` | Phase 14, L6 |
| L1 spec debate integration | `extensions/harness-spec.ts` (update) | Phase 14 |
| L2 plan debate integration | `extensions/harness-planner.ts` (update) | Phase 14 |
| L4 multi-round attack integration | `extensions/harness-critics.ts` (update) | Phase 14 |

**Budget per debate**: 3-4 rounds, ~2-3K tokens/round (see [[consensus-debate]] for per-layer breakdown).

**Added per subtask**: ~13,000 tokens (L1: +4K, L2: +5K, L4: +4K). Self-funding — catching one spec/plan flaw saves the downstream cost.

### Consensus Debate Architecture

```
┌──────────────────────────────────────────────────────┐
│                 HARNESS PIPELINE (L7)                  │
│                                                        │
│  L1 (Spec) ──spawns──► Debate: Proposer vs Critic     │
│  L2 (Plan) ──spawns──► Debate: Planner vs Critic      │
│  L4 (Verif) ─spawns──► Debate: Defender vs Attacker   │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │        CONSENSUS PROTOCOL LAYER              │     │
│  │  DebateSession, ConsensusBudget,             │     │
│  │  Turn protocol, Convergence, Verdict          │     │
│  └────────────────┬─────────────────────────────┘     │
│                   │                                     │
│  ┌────────────────▼─────────────────────────────┐     │
│  │     pi-messenger TRANSPORT (stripped)         │     │
│  │  Registry, Inboxes, fs.watch, Atomic writes   │     │
│  └──────────────────────────────────────────────┘     │
│                   │                                     │
│      .pi/messenger/registry/                            │
│      .pi/messenger/inbox/<agent>/                       │
│      .pi/messenger/debates/<debate-id>/                 │
└──────────────────────────────────────────────────────┘
```

**What we adopt from pi-messenger**: File-based registry, inbox-based messaging, `fs.watch` delivery, atomic file writes, stale cleanup.

**What we strip**: Chat overlay, status bar, activity feed, emoji, crew orchestration, swarm claims, human-as-participant.

See [[pi-messenger-analysis]] for detailed component-by-component breakdown.