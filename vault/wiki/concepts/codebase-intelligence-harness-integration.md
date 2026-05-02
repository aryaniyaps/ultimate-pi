---
type: concept
title: "Codebase Intelligence Harness Integration"
created: 2026-05-01
updated: 2026-05-01
status: developing
tags:
  - harness
  - codebase-intelligence
  - fallow
  - quality-gate
  - static-analysis
related:
  - "[[fallow-rs-codebase-intelligence]]"
  - "[[Research: Fallow Codebase Intelligence Harness Integration]]"
  - "[[codebase-intelligence-ecosystem-comparison]]"
  - "[[harness-implementation-plan]]"
  - "[[adr-010]]"
sources:
  - "[[fallow-rs-codebase-intelligence]]"

---# Codebase Intelligence Harness Integration

How deterministic codebase intelligence tools (primary: fallow for TS/JS) integrate into the ultimate-pi 8-layer agentic harness pipeline. Fallow is NOT an AI tool — it is the codebase truth layer the agent calls for deterministic quality signals.

## Integration Points

### 1. L3 Execution Layer — Agent Tool Calling (P44a)

During task execution, the agent calls fallow as an L3 tool for real-time feedback:

```
Agent: "I've finished editing files. Let me check quality."
  → npx fallow --format json
  → Parse: "2 new unused exports, 1 circular dependency introduced"
  → Agent: Fix before presenting result
```

Integration:
- MCP server bundled in fallow npm package
- Tool registration in harness MCP registry
- Agent skill for fallow workflow guidance (`fallow-skills`)
- JSON output with machine-actionable `actions` array per issue

Token cost: ~0 (deterministic CLI, no LLM tokens used).

### 2. P15b Pre-Verification Isolation Sandbox — Fallow Audit (P44b)

Before presenting L3 results to the agent (and before L4 adversarial verification), run fallow audit scoped to changed files:

```
npx fallow audit --base main --format json --changed-since main
```

Returns verdict: pass (exit 0), warn (exit 0 with findings), fail (exit 1).

Integration in P15b sandbox:
1. Checkout temp worktree (already done by P15b)
2. Run `fallow audit --gate all --format json`
3. If fail: surface findings to agent for fix loop
4. If pass/warn: proceed to L4 verification
5. Warm findings go into L4 critic context for adversarial review

Token cost: ~0 (deterministic). LLM tokens only on failure to describe findings to agent (~200).

### 3. Phase 16 Lint+Format Gate — Fallow as Gate (P44c)

Post-L4, pre-delivery deterministic gate. Non-negotiable pass/fail:

```
npx fallow audit --gate all
```

Verdict mapping:
- **pass**: continue to L5 observability
- **warn**: log findings, continue (warnings don't block delivery)
- **fail**: block delivery. Agent must fix before proceeding.

Baselines for legacy codebases:
```
npx fallow dead-code --save-baseline fallow-baselines/dead-code.json
npx fallow health --save-baseline fallow-baselines/health.json
npx fallow dupes --save-baseline fallow-baselines/dupes.json
npx fallow audit --dead-code-baseline fallow-baselines/dead-code.json ...
```

Token cost: 0 (deterministic). Part of Phase 16's existing 0-token budget.

### 4. L5 Observability — Health Trends + Keep Rate (P44d)

Fallow's health scoring system provides quantitative substrate for Keep Rate tracking and codebase health observability:

```
fallow health --score              # 0-100 score with letter grade
fallow health --trend              # Compare against saved snapshot
fallow health --runtime-coverage ./coverage  # Hot/cold path evidence
```

Keep Rate proxy: `fallow health --score` snapshots stored at each delivery event. Track score over time to measure whether agent-generated code survives and maintains quality.

Integration:
- `lib/harness-observability.ts` adds `fallowHealthSnapshot()` method
- Snapshot stored in L6 persistent memory per delivery
- L5 dashboard surfaces health trend alongside Keep Rate

Token cost: ~0-100 (metadata annotation). Already budgeted in L5's ~2,000 tokens.

### 5. P29 Per-Tool Per-Model Error Classification (P44e)

Fallow's structured JSON output provides classification substrate:

Each finding has:
- `rule` (e.g., "unused-exports", "circular-dependencies")
- `severity` (error/warn)
- `introduced` (true/false — from audit diff)
- `actions` array (e.g., "remove_export", "restructure_deps")
- `auto_fixable` (boolean)
- File location, line numbers, CODEOWNERS

This maps to P29's error classification system:
- `rule` → error category
- `introduced` → distinguishes agent-introduced vs inherited
- `severity` → classification severity level
- `actions` → remediation taxonomy
- `auto_fixable` → auto-heal candidate flag

### 6. L6 Persistent Memory — Baseline Storage (P44f)

Fallow baselines stored in wiki-adjacent storage:
```
.fallow-baselines/
  dead-code.json
  health.json
  dupes.json
```

These are git-committed (not in `.fallow/` cache directory). L6 persistent memory references baseline versions in health snapshots.

### 7. P42 Scheduled Agent Automations — Periodic Health Sweeps (P44g)

Cron-style harness-initiated fallow runs:
- Weekly: `fallow health --trend` → surface regressions
- Daily: `fallow dead-code --format json` → flag new dead code
- Per-PR: `fallow audit` (already in CI)

## What Fallow Does NOT Cover

- **Functional correctness**: Not a test runner. Phase 16 only checks code quality, not behavior. F2 (Behaviour Harness) remains unsolved.
- **Type-level dead code**: Fallow is syntactic only. TypeScript's `tsc --noEmit` handles type checking separately (already in P20 gate).
- **Non-TS/JS ecosystems**: See [[codebase-intelligence-ecosystem-comparison]] for multi-language strategy.
- **Test coverage**: Fallow health can ingest Istanbul coverage data for CRAP scoring, but does not run tests.

## Integration Order

1. **P44c**: Phase 16 gate integration (easiest, highest impact, 0 tokens). Add `fallow audit --gate all` to `lib/harness-polish.ts`.
2. **P44b**: P15b pre-verification sandbox integration. Add `fallow audit --changed-since main` to sandbox script.
3. **P44a**: L3 MCP tool registration. Add fallow to MCP tool registry.
4. **P44d**: L5 health snapshot collection. Add to `lib/harness-observability.ts`.
5. **P44e**: P29 error classification mapping. Add fallow rule taxonomy to `lib/harness-errors.ts`.
6. **P44f**: L6 baseline storage. Create `.fallow-baselines/` config.
7. **P44g**: P42 automation schedule. Add to cron-style harness jobs.
