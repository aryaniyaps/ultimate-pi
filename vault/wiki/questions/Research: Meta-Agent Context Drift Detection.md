---
type: synthesis
title: "Research: Meta-Agent Context Drift Detection"
created: 2026-04-30
updated: 2026-04-30
tags:
  - research
  - meta-agent
  - context-drift
  - harness-design
  - agent-reliability
status: developing
related:
  - "[[context-drift-in-agents]]"
  - "[[meta-agent-context-pruning]]"
  - "[[agent-loop-detection-patterns]]"
  - "[[guardian-agent-pattern]]"
  - "[[ironclaw-drift-monitor]]"
  - "[[langsight-loop-detection]]"
  - "[[agent-drift-academic-paper]]"
  - "[[vectara-guardian-agents]]"
  - "[[model-adaptive-harness]]"
  - "[[harness-configuration-layers]]"
  - "[[agentic-harness-context-enforcement]]"
  - "[[grounding-checkpoints]]"
sources:
  - "[[ironclaw-drift-monitor]]"
  - "[[langsight-loop-detection]]"
  - "[[agent-drift-academic-paper]]"
  - "[[vectara-guardian-agents]]"
---

# Research: Meta-Agent Context Drift Detection

## Overview

A meta-agent that monitors the primary coding agent for context drift — repeated incorrect tool calls, excessive ls/find commands, tool-call loops — and intervenes by pruning irrelevant history from context. This concept exists in fragmented form across industry practice (ironclaw DriftMonitor, LangSight loop detection, Claude Code compaction) and academic research (Agent Stability Index, SWE-Pruner, GUARDIAN), but **no single system combines detection + pruning + context replacement into one pipeline**. The exact composition the user described is a novel synthesis.

## Key Findings

- **Exact match exists**: nearai/ironclaw #1634 "DriftMonitor" (March 2026) implements rule-based stuck-pattern detection with system-message injection — but does NOT prune context (Source: [[ironclaw-drift-monitor]])
- **Loop detection is production-ready**: LangSight detects tool-call repetition via argument hashing, catches 90%+ of real loops with zero false positives at threshold 3 (Source: [[langsight-loop-detection]])
- **Agent drift is academically quantified**: Agent Drift paper (arxiv 2601.04170) shows 42% task success reduction, 3.2x human intervention increase, and introduces ASI (Agent Stability Index) across 12 dimensions (Source: [[agent-drift-academic-paper]])
- **Guardian agents are an active industry pattern**: Vectara built a platform-agnostic benchmark (~900 scenarios) validating pre-execution safety layers that check tool selection, arguments, and sequencing before execution. Overall correct rate only 5-59% across platforms (Source: [[vectara-guardian-agents]])
- **Context pruning exists for code, not conversation**: SWE-Pruner (arxiv 2601.16746) achieves 23-54% token reduction by pruning code context, but operates on source files, not agent conversation history (Source: [[swe-pruner-context-pruning]])
- **The novel gap**: No existing system does the full loop: detect stuck → identify dead-end context entries → prune them → restart agent with clean context. Each piece exists independently. The composition is new.

## First Principles Analysis

### The Problem

Agent starts task → makes wrong tool call → gets error → tries variant → still wrong → tries ls/find/grep repeatedly → context fills with dead ends. Signal-to-noise collapses. Agent gets more lost, not less.

This is a **positive feedback loop of context pollution**. Each failed attempt adds noise that makes the next attempt MORE likely to fail. The agent doesn't just fail — it accelerates into failure.

### The Meta-Agent Solution

A separate observer (meta-agent) that:

1. **Detects stuck patterns** — rule-based signatures of non-progress: repeated identical tool calls, tool cycling (A-B-A-B), consecutive failures, excessive file searching
2. **Identifies dead-end context entries** — which tool calls and responses constitute noise vs. signal
3. **Prunes the context** — removes dead-end entries from the conversation history
4. **Injects a correction** — "You were stuck on [pattern]. Here's what you know so far. Try a different approach."
5. **Restarts the agent** — either by editing in-place (if API supports it) or terminating and resuming with pruned history

### Detection Mechanism

**Rule-based (recommended)**: Zero LLM overhead. Pattern-match on tool call sequences:

```
Pattern              | Threshold   | Detection
Repetition           | 3+ identical | Hash tool+args, count in sliding window
Failure spiral       | 4+ failures  | Consecutive error count
Tool cycling         | A-B-A-B-A-B  | Sequence pattern in last 6 calls
Silence drift        | 15+ iters    | No text response counter
Rework churn         | 3+ writes    | Same file written repeatedly
Excessive searching  | 5+ ls/find   | Count search-type tool calls without code edits
```

**LLM-based (higher cost, higher precision)**: Every N steps, a separate small-model call evaluates trajectory for meaningful progress. Can catch semantic drift that rule-based misses.

### Pruning Heuristic

Distinguishing "failed but informative" from "failed and useless":

| Keep | Prune |
|------|-------|
| Error led to different approach on next attempt | Identical call returned same result |
| Output contained new information despite failure | Pure noise (navigation bars, boilerplate errors) |
| User explicitly asked for that action | Agent retried without user direction |
| Established a constraint used later | Agent forgot about the call entirely |

Conservative pruning: when uncertain, keep. The cost of pruning useful context is higher than keeping benign noise.

### Feasibility

**High**. Detection is trivial (rule-based, O(1) per call). Pruning requires careful heuristics but the worst case (keep everything) is identical to current behavior. The intervention mechanism (system message injection) is already proven in ironclaw.

### Overhead Analysis

| Component | Cost | Notes |
|-----------|------|-------|
| Rule-based detection | ~0 tokens | Hash comparison + counters per tool call |
| LLM-based detection | ~500 tokens per check | If checking every 10 steps, 5 checks in 50-step session = 2,500 tokens |
| Context pruning | ~0 tokens | Metadata operation, no LLM call |
| Correction injection | ~150 tokens | System message |
| Session restart | 1 API call + cache miss | One-time cost if restarting; zero if in-place editing |
| **Total overhead** | **~2,500-3,000 tokens** | vs. 20,000+ tokens wasted in bloated failed context |

**Net savings**: 5-10x token reduction for stuck sessions. The meta-agent pays for itself after 1-2 interventions.

### Edge Cases

- **Polling agents**: Legitimate repeated calls to status endpoints. Whitelist polling tools or use time-based windows instead of count-based.
- **Retry-heavy workflows**: Some tools legitimately fail transiently. Increase threshold to 5-7 for these agents.
- **Exploratory searching**: Browsing many files is sometimes correct behavior. Distinguish by whether code edits follow the searches.
- **False positive prune**: Removing useful context is worse than failing to prune. Conservative defaults + escalation levels.

### Escalation Model

1. **Soft nudge** (first detection): System message — "You've called [tool] with same args 3 times. Summarize what you know and try a different approach."
2. **Strong nudge** (second detection): System message + context summary — "You're stuck. Here's a clean summary of what you've accomplished. Start fresh from here."
3. **Forced restart** (third detection): Terminate session, prune history, restart with clean context and correction message.

## Integration with Existing Harness Pipeline

The meta-agent concept maps to the existing harness architecture:

### New Layer: L2.5 — Runtime Drift Monitor

Sits between L2 (Structured Planning) and L3 (Grounding Checkpoints). While L3 already has "drift detection" for scope creep against the spec, it does NOT monitor tool-call quality or context pollution.

```
L2 (Plan) → L2.5 (Drift Monitor) → L3 (Execute + Grounding)
                ↑                          ↓
                └── injects corrections ───┘
```

**Why between L2 and L3**: The plan defines expected tool sequences. The drift monitor compares actual tool calls against the plan AND against stuck-pattern signatures. It catches both "off-plan" drift (scope creep) and "stuck-on-plan" drift (repetitive failures).

### Integration Points

| Component | Harness File | Change |
|-----------|-------------|--------|
| DriftMonitor struct | `lib/harness-drift-monitor.ts` | **New** — pattern detection, correction injection |
| DriftMonitor config | `.pi/harness/drift-monitor.json` | **New** — thresholds, escalation levels, whitelists |
| Extension hook | `extensions/harness-drift-monitor.ts` | **New** — hooks into before_llm_call / after_tool_call |
| L3 grounding | `lib/harness-executor.ts` | Add drift_monitor field, call check() before each LLM call |
| Harness plan | `lib/harness-planner.ts` | Layer renumbering (L3→L4, L4→L5, etc. or insert as L2.5) |
| Implementation plan | [[harness-implementation-plan]] | Add Phase 17: Runtime Drift Monitor |

### Configuration Schema

```typescript
interface DriftMonitorConfig {
  enabled: boolean;                    // default: true
  detection: {
    repetition_threshold: number;      // default: 3
    failure_spiral_threshold: number;  // default: 4
    cycle_window: number;              // default: 6
    silence_threshold: number;         // default: 15 iterations
    rework_threshold: number;          // default: 3
    excessive_search_threshold: number;// default: 5
  };
  intervention: {
    prune_context: boolean;            // default: true (prune dead-end entries)
    inject_correction: boolean;        // default: true (system message)
    escalation: "soft" | "strong" | "forced_restart";
    max_escalations: number;           // default: 3
  };
  whitelist: {
    polling_tools: string[];           // tools allowed repeated calls
    retry_tools: string[];             // tools with legitimate retry patterns
  };
  model_profile: "auto" | "opus" | "gpt" | "gemini" | "strict";
}
```

### Model-Adaptive Behavior

Maps to L3 State Channel and L2 Gate Design from the [[harness-configuration-layers|four-layer harness]]:

| Model | Detection | Intervention |
|-------|-----------|-------------|
| Opus | LLM-based every 15 steps (trusts self-assessment) | Soft nudge → self-corrects reliably |
| GPT | Rule-based every step (needs frequent checks) | Hard escalation → auto-restart after 3 detections |
| Gemini | Rule-based every 10 steps (moderate frequency) | Soft nudge → escalate if unresponsive |
| Strict | Rule-based every step (maximum enforcement) | Hard escalation → auto-restart after 2 detections |

### Token Budget

Estimated overhead for a 50-step agent session:

| Profile | Checks | Tokens per check | Total overhead |
|---------|--------|-----------------|----------------|
| Rule-based (GPT/strict) | 50 | ~0 | 0 |
| Rule-based (Gemini) | 5 | ~0 | 0 |
| LLM-based (Opus) | 3 | ~500 | 1,500 |

All profiles: correction messages ~150 tokens each, max 3 interventions = 450 tokens. Pruning: zero token cost (metadata operation).

## Key Entities

- **nearai/ironclaw**: Open-source agent framework with proposed DriftMonitor (Source: [[ironclaw-drift-monitor]])
- **LangSight**: Production agent monitoring with loop detection, budget guardrails, circuit breakers (Source: [[langsight-loop-detection]])
- **Vectara**: Guardian Agents benchmark and pre-execution safety layer (Source: [[vectara-guardian-agents]])
- **Abhishek Rath**: Author of Agent Drift paper, introduced ASI (Agent Stability Index) (Source: [[agent-drift-academic-paper]])
- **Anthropic Applied AI team**: Published context engineering framework including compaction, note-taking, sub-agent architectures

## Key Concepts

- [[context-drift-in-agents]]: Progressive degradation of agent behavior over extended interactions
- [[meta-agent-context-pruning]]: The proposed system — detect stuck, prune history, restart
- [[agent-loop-detection-patterns]]: Three production patterns (direct repetition, ping-pong, retry-without-progress)
- [[guardian-agent-pattern]]: Pre-execution safety layers that validate agent actions before they execute

## Contradictions

- **ironclaw vs. Vectara on intervention timing**: Ironclaw DriftMonitor injects corrections AFTER tool calls (reactive). Vectara Guardian Agents validate BEFORE tool execution (proactive). (Source: [[ironclaw-drift-monitor]] vs [[vectara-guardian-agents]]). The meta-agent concept is reactive (post-hoc pruning), so it aligns with ironclaw's approach. Vectara's proactive approach could complement it as a first line of defense.
- **LangSight says terminate on loop detection**. Ironclaw says inject correction message. Both are valid for different risk profiles. The proposed escalation model (soft → strong → forced) synthesizes both.

## Open Questions

- Can context pruning be done in-place (API-supported message editing) or must it always be a session restart? Most APIs (Anthropic, OpenAI) support message truncation but not selective deletion from middle of history.
- What is the "minimum viable context" that must survive pruning? The original task, key decisions made, constraints discovered, and the last successful state.
- Does pruning break the model's chain-of-thought? If the model was mid-reasoning when stuck, restarting with pruned history may lose coherence. Needs testing.
- How does this interact with prompt caching? Pruning may invalidate cached prefixes, increasing short-term cost.
- Can a small/cheap model (Haiku, Flash) serve as the meta-agent detector, keeping overhead near zero?

## Sources

- [[ironclaw-drift-monitor]]: nearai/ironclaw #1634, March 2026 — Proposed DriftMonitor with 5 rule-based patterns
- [[langsight-loop-detection]]: LangSight Engineering, March 2026 — Production loop detection with argument hash comparison
- [[agent-drift-academic-paper]]: Abhishek Rath, January 2026 — Agent Stability Index (ASI) across 12 dimensions
- [[vectara-guardian-agents]]: Vectara, November 2025 — Platform-agnostic guardian agents benchmark (~900 scenarios)
- [[swe-pruner-context-pruning]]: Wang et al., January 2026 — Self-adaptive context pruning for coding agents (ACL 2026)
- [[anthropic-context-engineering]]: Anthropic Applied AI, September 2025 — Context engineering framework
