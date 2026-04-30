---
type: concept
title: "Drift Detection — Unified Framework"
created: 2026-04-30
updated: 2026-04-30
status: active
tags: [harness, drift-detection, meta-agent, grounding, adversarial, unified]
related:
  - "[[harness-implementation-plan]]"
  - "[[grounding-checkpoints]]"
  - "[[adversarial-verification]]"
  - "[[context-drift-in-agents]]"
  - "[[meta-agent-context-pruning]]"
  - "[[agent-loop-detection-patterns]]"
  - "[[guardian-agent-pattern]]"
  - "[[Research: Meta-Agent Context Drift Detection]]"
sources:
  - "[[ironclaw-drift-monitor]]"
  - "[[langsight-loop-detection]]"
  - "[[agent-drift-academic-paper]]"
  - "[[vectara-guardian-agents]]"
---

# Drift Detection — Unified Framework

The harness implements THREE distinct drift detection paradigms at three different pipeline stages. They are complementary, not redundant. Each catches a different failure mode that the others cannot.

## Why Three Paradigms?

Agent failure isn't one thing. It's a cascade:

1. **Tool-call quality decays** (stuck loops, context pollution) → agent can't make progress
2. **Scope creeps** (agent does more or less than spec) → wrong thing gets built
3. **Implementation diverges** (code doesn't match spec) → built thing doesn't work

Each needs different detection timing, mechanism, and intervention.

---

## Paradigm 1: Tool-Call Drift (L2.5 — Runtime Drift Monitor)

**Detects**: Stuck patterns, context pollution, repetitive tool calls. The agent is spinning its wheels.

**When**: Between L2 (Plan) and L3 (Execute). Runs continuously during execution.

**Mechanism**:
- **Rule-based (0 tokens)**: 6 pattern signatures
  - Repetition: 3+ identical tool calls (hash tool+args)
  - Failure spiral: 4+ consecutive errors
  - Tool cycling: A-B-A-B pattern in last 6 calls
  - Silence drift: 15+ iterations without text response
  - Rework churn: 3+ writes to same file without progress
  - Excessive searching: 5+ ls/find/grep without code edits
- **LLM-based (~500 tokens/check, every 15 steps)**: Small model evaluates trajectory for semantic progress. Catches non-obvious drift that rule-based misses.

**Intervention** (escalation model):
1. **Soft nudge**: System message — "You've called [tool] 3× with same args. Summarize and try different approach."
2. **Strong nudge**: System message + context summary — "You're stuck. Here's clean summary of accomplishments. Start fresh."
3. **Forced restart**: Terminate session, prune dead-end context entries, restart with clean context + correction.

**Pruning Heuristic**:
| Keep | Prune |
|------|-------|
| Error led to different approach | Identical call returned same result |
| Output contained new information | Pure noise (navigation, boilerplate errors) |
| User explicitly asked for action | Agent retried without direction |
| Established constraint used later | Agent forgot about the call entirely |

**Model-Adaptive**:
| Model | Detection | Intervention |
|-------|-----------|-------------|
| Opus | LLM-based every 15 steps | Soft → self-corrects reliably |
| GPT | Rule-based every step | Hard escalation → auto-restart after 3 detections |
| Gemini | Rule-based every 10 steps | Soft → escalate if unresponsive |
| Strict | Rule-based every step | Hard → auto-restart after 2 detections |

**Why this is novel**: Each component exists independently (ironclaw DriftMonitor for detection, SWE-Pruner for pruning, LangSight for loop detection, Vectara for guardian agents). No existing system combines **detect → prune → restart** into one pipeline. The composition is new.

**Academic foundation**: Agent Drift paper (arxiv 2601.04170, Rath 2026): 42% task success reduction from drift, ASI framework across 12 dimensions, drift emerges after median 73 interactions. Combined mitigation (EMC + DAR + ABA) achieves 81.5% reduction.

---

## Paradigm 2: Spec Drift (L3 — Grounding Checkpoints)

**Detects**: Scope creep, spec violations. The agent goes off-plan.

**When**: Before and after every subtask execution in L3.

**Mechanism**: Compare current execution state against the hardened spec from L1.
- `spec_version` comparison: did the spec change mid-execution?
- `state_hash` verification: does current state match expected?
- Anti-criteria scan: did the agent do something explicitly forbidden?
- Output contract check: does output match declared schema?

**Intervention**: Abort current subtask. Replan from L2. No half-measures — spec drift means the plan is invalid.

**Why distinct from L2.5**: L3 detects WHAT the agent is doing wrong (off-spec). L2.5 detects THAT the agent is stuck (spinning wheels). An agent can be stuck while still on-spec. An agent can be off-spec while making rapid progress (in the wrong direction).

---

## Paradigm 3: Implementation Drift (L4 — Adversarial Verification)

**Detects**: Code doesn't match spec. The built thing is wrong.

**When**: After execution completes. Post-hoc verification.

**Mechanism**: Critic agents attack the implementation against the spec.
- Multi-round adversarial debate (selective routing via iMAD gating)
- Hard-threshold pass/fail criteria (not narrative self-assessment)
- Sprint contracts from L2: "we agreed this is what 'done' means — prove it"

**Intervention**: Rework subtask. Re-verify. Max rounds enforced.

**Why distinct from L3**: L3 checks scope and spec compliance DURING execution. L4 checks correctness AFTER execution. L3 catches "doing the wrong thing." L4 catches "doing the right thing wrong."

---

## Paradigm Comparison

| Axis | Tool-Call Drift (L2.5) | Spec Drift (L3) | Implementation Drift (L4) |
|------|----------------------|-----------------|--------------------------|
| **Detects** | Agent stuck/spinning | Agent off-plan | Code-spec mismatch |
| **Timing** | Continuous during execution | Pre/post each subtask | Post-execution |
| **Mechanism** | Rule-based + LLM-based patterns | State hash + anti-criteria scan | Adversarial critic + debate |
| **Token cost** | ~0-500/check | ~500/checkpoint | ~4,500/subtask |
| **Intervention** | Nudge → prune → restart | Abort + replan | Rework + re-verify |
| **LLM needed** | Optional (rule-based = free) | No (hash comparison) | Yes (adversarial reasoning) |
| **Miss rate** | False positives possible (polling, retry workflows) | Near-zero (structural comparison) | Depends on critic quality |

---

## Why Three Paradigms, Not One?

A single drift detector would have to be:
- Structural enough to catch spec violations (L3)
- Semantic enough to catch stuckness (L2.5)
- Adversarial enough to catch correctness issues (L4)

That's three different detection mechanisms. Trying to unify them into one would produce a weaker detector at each axis. The pipelines are thin and sharp, not thick and dull.

---

## Integration Into Pipeline

```
L1 (Spec) → L2 (Plan) → [L2.5: Tool-Call Drift Monitor] → L3 (Execute)
                              ↓ detects stuck patterns          ↓ detects spec drift
                              ↓ prunes + restarts              ↓ aborts + replans
                              
L3 → L4 (Adversarial) → Phase 16 (Lint+Format) → L5+
        ↓ detects implementation drift
        ↓ rework + re-verify
```

All three drift detectors must pass for a subtask to proceed to L5.

---

## Key Entities

- **ironclaw DriftMonitor**: Reactive stuck-pattern detection (5 rules) with system-message injection. nearai/ironclaw #1634, March 2026.
- **LangSight**: Production loop detection via argument hashing. 90%+ catch rate at threshold 3. March 2026.
- **Vectara Guardian Agents**: Pre-execution safety validation benchmark (~900 scenarios, 6 domains). Correct rate 5-59% across platforms. November 2025.
- **Agent Drift paper**: Academic quantification: 42% task success reduction, ASI (Agent Stability Index) across 12 dimensions. Rath, January 2026.
- **SWE-Pruner**: Context pruning for code agents. 23-54% token reduction. Wang et al., January 2026.

## Open Questions

- Can context pruning be done in-place (API-supported message editing) or always needs session restart?
- Does pruning break chain-of-thought coherence mid-reasoning?
- How does pruning interact with prompt caching? (Invalidated prefixes increase short-term cost.)
- Can Haiku/Flash serve as the meta-agent drift detector, keeping overhead near zero?
