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
  - "[[inline-post-edit-validation]]"
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
| 10 | AST Truncation | `lib/harness-ast.ts`, `lib/harness-search.ts` |
| 11 | Fuzzy Edit Matching | `lib/harness-edit.ts` |
| 12 | Inline Syntax Validation | `lib/harness-validate.ts`, `lib/harness-sql-fix.ts` |
| 13 | Haiku Model Router | `lib/harness-router.ts`, `lib/harness-explorer.ts` |
| 14 | Consensus Transport | `lib/harness-messenger.ts`, `lib/harness-debate.ts` |
| 15 | Consensus Protocol | `extensions/harness-debate.ts`, layer extension updates |
| 16 | Final Lint + Format Gate | `lib/harness-polish.ts`, `extensions/harness-polish.ts` |

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

### Phase 12: Inline Syntax Validation

Run compilers and parsers after each edit, before model sees result. **Syntax only** — does the code parse/compile? Linting and formatting are deferred to [[#phase-16-final-lint-format-gate|Phase 16]] (post-verification final gate). See [[inline-post-edit-validation]].

**First-principles rationale**: Syntax errors block all further progress — the model wastes tokens reasoning about code that doesn't compile. Catching at the tool layer saves full round-trips. But lint warnings (style, unused vars) and formatting (whitespace changes) must NEVER run inline: lint is noisy on in-progress code, and formatting modifies whitespace which breaks the `edit` tool's exact-match `oldText` contract.

| Capability | Files | Depends On |
|-----------|-------|------------|
| `post-edit-validate` hook (L3) | `lib/harness-executor.ts` | Grounding checkpoints |
| TS/JS compile check | `lib/harness-validate.ts` | `tsc --noEmit` |
| JSON/YAML parse check | `lib/harness-validate.ts` | None |
| SQL dialect auto-fix | `lib/harness-sql-fix.ts` | SQL parser |
| Better error context (real diffs) | `lib/harness-executor.ts` | Post-edit validate |

**Gate rule**: Inline validators MUST complete in <2 seconds. Anything slower (full project `tsc`, ESLint with plugins, prettier) belongs in Phase 16.

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
| Final lint + format gate | — | ~0 | Deterministic tooling, no LLM |
| Memory writes | ~1,500 | ~1,000 | Haiku for standard writes |
| **Coding tokens** | variable | **-25-55%** | AST truncation + fuzzy edits |
| **Total per subtask** | **~17,500** | **~12,500-15,000** | 15-30% overhead reduction |

### Phase 16: Final Lint + Format Gate

Run linters and formatters as a **single final pass** after L4 adversarial verification passes and before L5 observability. This is the last code-modifying step in the pipeline.

**First-principles rationale**: Linting and formatting are separate concerns from syntax and correctness. The pipeline enforces the correct ordering: first make it work (L3 syntax + L4 verification), then make it clean (Phase 16). Running lint/format inline would: (a) flood the agent with style warnings on in-progress code, (b) break edit tool `oldText` matching via whitespace changes, (c) waste tokens on cosmetic fixes for code that might be rewritten next edit. Formatting MUST be last — it touches every line, invalidating all line numbers for any subsequent operation.

| Capability | Files | Depends On |
|-----------|-------|------------|
| `final-polish` gate (post-L4 hook) | `lib/harness-polish.ts` | Phase 5 (L4 critics) |
| Lint with auto-fix: ESLint, biome, ruff, clippy | `lib/harness-polish.ts` | Language detection from L3 |
| Format with auto-apply: prettier, biome, rustfmt | `lib/harness-polish.ts` | Lint pass (lint first, format second) |
| Lint violations report (non-auto-fixable) | `lib/harness-polish.ts` | Lint pass |
| Gate verdict: PASS / PASS_WITH_WARNINGS / FAIL | `lib/harness-polish.ts` | Full polish run |
| Wiki artifact: polish report | `extensions/harness-polish.ts` | L6 memory writes |

**Gate semantics**:
- `PASS`: All auto-fixes applied, zero remaining lint violations → proceed to L5
- `PASS_WITH_WARNINGS`: Auto-fixes applied, non-auto-fixable warnings remain → logged to wiki, proceed
- `FAIL`: Lint errors that can't be auto-fixed → return to agent for manual fix (max 1 retry, then escalate)

**Ordering within gate**: Lint → auto-fix lint → format → verify format didn't introduce lint violations → verdict.

**Token cost**: Near-zero (deterministic tooling, no LLM involvement). Time cost: <10 seconds for typical projects.

### Fundamental Architecture Changes Required

These are not incremental — they require structural changes to the agent:

1. **Model router layer**: The agent must dispatch operations to different models. This is a new cross-cutting concern between L7 (orchestration) and L3/L8 (execution). Currently, the harness assumes one model for all operations.

2. **Two-tier validation pipeline**: Current validation is post-hoc (L3 checks after all edits, L4 attacks after phase complete). The new design adds inline syntax validation (Phase 12, fast, tool-layer, catches broken code before model sees it) and a final lint+format gate (Phase 16, post-L4, deterministic, no LLM involvement). These are complementary — inline catches "doesn't compile", final gate catches "isn't clean". Neither replaces L4's adversarial semantic verification.

3. **AST-aware tool primitives**: The `read`, `search`, and `grep` tools must become AST-aware. This requires tree-sitter integration at the tool layer, not just the planning layer (where repo-map-ranking currently sits).

4. **Non-exact tool matching**: The `edit` tool's contract changes from "exact string match" to "best-effort fuzzy match with exact fallback." This is a semantic change to a core tool primitive. Note: fuzzy matching is tolerant of minor whitespace drift, but full formatting runs ONLY in Phase 16 — never inline.

5. **Tool result intermediation**: Currently, tool results go straight to the model. With inline validation, the tool pipeline must intercept results, run validators, attempt auto-fixes, and only then surface the (possibly transformed) result to the model.

---

## Final Polish Gate (Phase 16)

See [[#phase-16-final-lint-format-gate|Phase 16 above]] for full specification. Runs once after L4 adversarial verification passes. Lint → auto-fix → format → verify → verdict.

**Pipeline position**: L3 (edits with inline syntax checks) → L4 (adversarial verification) → **Phase 16 (lint + format gate)** → L5 (observability).

**Why not inline**: Formatting modifies every line — breaks `edit` tool `oldText` matching. Linting on in-progress code produces noise, not signal. Both waste agent tokens on cosmetic decisions that may be invalidated by the next edit.

**Why not in L4**: L4 critics reason about correctness (logic, security, spec compliance). Lint/formatters are deterministic tools — no LLM reasoning needed. Adding them to L4 would bloat the adversarial budget with non-adversarial work.

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