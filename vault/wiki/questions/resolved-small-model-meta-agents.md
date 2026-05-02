---
type: resolution
title: "Resolved: Small Model Meta-Agents (Haiku/Flash) for Drift Detection"
created: 2026-04-30
updated: 2026-04-30
tags:
  - resolution
  - meta-agent
  - model-routing
  - drift-detection
  - cost-optimization
status: resolved
resolves:
  - "[[meta-agent-context-pruning]] Open Question #5"
  - "[[drift-detection-unified]] Open Question #4"
  - "[[research-wozcode-token-reduction]] Open Question #3"
related:
  - "[[meta-agent-context-pruning]]"
  - "[[drift-detection-unified]]"
  - "[[agent-drift-academic-paper]]"
  - "[[model-routing-agents]]"
sources:
  - "[[agent-drift-academic-paper]]"
  - "[[wozcode]]"

---# Resolved: Small Model Meta-Agents for Drift Detection

## Resolution

**Haiku/Flash CAN serve as meta-agent drift detectors. For rule-based drift detection, cost is zero (0 tokens — hash comparison + counters only). For LLM-based semantic drift checks, Haiku/Flash adds ~200-500 tokens per check, run every 10-15 steps. This keeps meta-agent overhead near zero while maintaining detection quality.**

## Evidence

### Rule-Based Detection = Zero LLM Cost

The 6 drift pattern signatures (repetition, failure spiral, tool cycling, silence drift, rework churn, excessive searching) are all rule-based. They use hash comparison and counters — 0 LLM tokens. No model needed at all. This is the primary detection mechanism and it catches ~80% of stuck patterns. (Source: [[agent-drift-academic-paper]], ironclaw DriftMonitor)

### LLM-Based Detection = Small Model Feasible

For the remaining ~20% of drift cases (semantic drift, non-obvious stuckness), an LLM check runs every 10-15 steps:

| Model | Tokens/Check | Cost/Check (approx) | Detection Quality |
|-------|-------------|---------------------|-------------------|
| **Haiku** | ~200-500 | ~$0.001-0.003 | Good for surface patterns |
| **Flash (Gemini)** | ~200-500 | ~$0.0001-0.0005 | Good for surface patterns |
| **Sonnet** | ~300-600 | ~$0.01-0.02 | Better nuance detection |
| **Opus** | ~500-1000 | ~$0.05-0.10 | Best, but overkill for drift |

**Recommendation**: Haiku for routine checks, Sonnet for escalation. Opus reserved for the primary coding agent, not the meta-agent.

### WOZCODE Pattern: Haiku Subagents

WOZCODE already uses Haiku subagents for read-only exploration (~40% of coding work at 15× cheaper than Opus). This validates the pattern: small models can handle auxiliary agent tasks effectively. Drift detection is a similar auxiliary task — read-only observation, no code generation. (Source: [[wozcode]])

## Specific Questions Resolved

### Q1: Can Haiku/Flash serve as meta-agent detector?

**Yes.** For rule-based detection: 0 tokens, any model works (or no model at all). For LLM-based detection: Haiku/Flash provide adequate quality at near-zero cost. The detection task is classification (is the agent stuck?), not generation — small models handle classification well.

### Q2: Can Haiku subagents apply to code review / adversarial verification (L4)?

**Partially.** Haiku can handle:
- **Identification of obvious issues**: Missing error handling, type mismatches, syntax errors. Good fit.
- **Spec compliance checking**: Pattern matching between spec and implementation. Good fit.
- **Deep adversarial reasoning**: Finding subtle logic bugs, edge cases. NOT a good fit — needs Opus/GPT.

**Recommendation**: Use Haiku for L4 pre-filtering (flag obvious issues cheaply). Reserve Opus/GPT for deep adversarial rounds. This mirrors the WOZCODE pattern: Haiku for exploration, frontier model for generation.

### Q3: Does meta-agent itself need drift monitoring? (Infinite regress)

**No infinite regress.** The meta-agent's rule-based detection has no agentic loop — it's a hash function and counter. Hash functions don't drift. The LLM-based check (every 10-15 steps) is a single inference, not a multi-turn agent session — single inferences don't drift.

If the meta-agent were itself a multi-turn agentic system, then yes, it would need its own drift monitor. But the design deliberately avoids this: detection is stateless (per-check) and non-agentic.

## Cost Analysis

For a 50-step agent session:

| Component | Without Meta-Agent | With Rule-Based Only | With Rule + Haiku LLM |
|-----------|-------------------|---------------------|----------------------|
| Drift detection tokens | 0 (no detection) | 0 | ~1,000-2,500 (5 checks × 200-500) |
| Stuck session cost | ~50,000 tokens wasted | ~5,000 (early detection) | ~2,000 (earliest detection) |
| **Net savings** | — | ~45,000 tokens | ~46,000-47,500 tokens |

Rule-based detection alone captures most stuck patterns. Adding Haiku LLM checks every 10 steps captures the remaining non-obvious drift at minimal cost (~$0.005-0.015 per session).

## Harness Implementation

```
L2.5 Runtime Drift Monitor:
├─ Rule-based detection (0 tokens, always-on)
│   ├─ Repetition: 3+ identical tool calls
│   ├─ Failure spiral: 4+ consecutive errors
│   ├─ Tool cycling: A-B-A-B pattern
│   ├─ Silence drift: 15+ iterations without text
│   ├─ Rework churn: 3+ writes to same file
│   └─ Excessive searching: 5+ ls/find/grep without edits
│
└─ LLM-based detection (Haiku, every 10-15 steps)
    └─ Semantic progress check: is the agent making meaningful progress?
        └─ Triggered only when rule-based is ambiguous
```

## Confidence

**High.** Rule-based detection cost is definitively zero (hash functions have no LLM dependency). Haiku/Flash's viability for auxiliary tasks is validated by WOZCODE's production use. The Agent Drift paper's 81.5% combined mitigation rate provides academic grounding. The infinite regress question is resolved by architectural design (stateless, non-agentic detection).
