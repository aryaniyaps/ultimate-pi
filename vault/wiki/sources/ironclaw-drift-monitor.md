---
type: source
status: ingested
source_type: github-issue
title: "ironclaw DriftMonitor — Anti-Drift Self-Checks in Agentic Loop"
author: ilblackdragon (nearai)
date_published: 2026-03-25
url: https://github.com/nearai/ironclaw/issues/1634
confidence: high
key_claims:
  - "Rule-based DriftMonitor detects 5 stuck patterns without additional LLM calls"
  - "Corrections injected as system messages into LLM context"
  - "Integrates via existing delegate hook system, no agentic_loop.rs changes"
  - "Prior art: RuFlo's Continue Gate (checkpoint, rework ratio, budget slope)"
tags:
  - source
  - drift-detection
  - agent-loop
  - ironclaw
  - guardian-agent
related:
  - "[[Research: Meta-Agent Context Drift Detection]]"
  - "[[context-drift-in-agents]]"
  - "[[agent-loop-detection-patterns]]"
created: 2026-05-02
updated: 2026-05-02

---# ironclaw DriftMonitor

## Summary

GitHub issue proposing a lightweight, rule-based `DriftMonitor` for the ironclaw agentic loop. Detects common failure patterns (repetition loops, failure spirals, tool cycling, silence drift, rework churn) and injects corrective system messages — without requiring additional LLM calls. This is the closest existing implementation to the meta-agent context drift detection concept.

## What It Contributes

This is the **primary prior art** for the meta-agent context drift detection concept. It implements detection + injection but does NOT implement context pruning or session restart. The proposed meta-agent extends this by adding pruning heuristics and escalation levels.

## Five Detection Rules

1. **Repetition** — Same tool + same param hash ≥3 times in last 10 calls → inject correction
2. **Failure spiral** — ≥4 consecutive tool failures → inject "reassess approach"
3. **Tool cycling** — A-B-A-B-A-B pattern in last 6 calls → inject "state what's blocking you"
4. **Silence drift** — ≥15 iterations since last text response → inject "provide progress update"
5. **Rework detection** — Same file written ≥3 times → inject "review before writing again"

## Design Details

- `DriftMonitor` struct with `original_goal`, `tool_history` (VecDeque), `IterationMetrics`, `DriftConfig`
- `ToolCallRecord` has `name`, `params_hash` (u64), `succeeded`, `iteration`
- Corrections injected as system messages (same pattern as existing `TOOL_INTENT_NUDGE`)
- Configurable via env vars (`IRONCLAW_DRIFT_*`) or disabled entirely
- Config struct: `enabled`, `repetition_window`, `repetition_threshold`, `max_consecutive_failures`, `cycle_detection_window`, `silence_threshold`, `max_file_rewrites`, `checkpoint_interval`

## Future Extensions (Not in Scope)

- **Semantic drift detection** — LLM-based check comparing current context to original goal
- **Plan adherence** — Compare actual tool sequence to planned sequence
- **Budget slope analysis** — Linear regression over token consumption windows
- **Escalation levels** — Soft nudge → stronger → early loop exit

## Integration Points

| File | Change |
|------|--------|
| `src/agent/drift_monitor.rs` | **New** — struct + detection rules |
| `src/agent/dispatcher.rs` | Add field, call check() in before_llm_call() |
| `src/worker/job.rs` | Same integration for JobDelegate |
| `src/agent/mod.rs` | Module declaration |

No changes to `agentic_loop.rs` — delegates already own the hooks.

## Relevance to Meta-Agent Concept

The ironclaw DriftMonitor is detection + injection. The meta-agent concept adds:
- **Context pruning**: Removing dead-end entries, not just injecting corrections
- **Session restart**: Clean context after pruning
- **Escalation model**: Soft → strong → forced restart
- **Model-adaptive behavior**: Different detection frequencies per model profile

The DriftMonitor validates that rule-based detection is feasible and effective. The missing piece — context pruning — is the novel contribution.
