---
type: concept
title: "Drift Detection — Unified Framework (LLM-First v2)"
created: 2026-04-30
updated: 2026-05-02
status: active
tags: [harness, drift-detection, meta-agent, grounding, adversarial, unified, llm-first]
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

# Drift Detection — Unified Framework (LLM-First v2)

**Updated 2026-05-02**: Rethought from first principles. L2.5 primary detection is now **LLM-based with structured context input** using a very cheap and fast model (Haiku/mini). Rule-based (6 patterns) becomes the cost-saving pre-filter and fallback — not the primary detector.

## First-Principles Rethink (May 2026)

### The Problem With Rule-Based Primary Detection

Rule-based stuck-pattern detection (repetition hash, failure counters, tool cycling A-B-A-B) catches ~80% of stuck sessions. But FP #6 states: "Context drift is a positive feedback loop — each failed attempt accelerates failure." The 20% of cases that slip past rule-based detection are the **most dangerous**: semantic drift where the agent makes "progress" (different tool calls, no errors) but heads in the wrong direction. Rule-based cannot catch:

- **Semantic drift**: Agent reads different files, writes code — but implements the wrong feature
- **Spec misunderstanding**: Agent builds correctly against a misunderstood spec
- **Premature completion**: Agent thinks it's done but missed critical requirements
- **Context pollution**: Subtle reliance on stale information that doesn't trigger repetition

### Why LLM-Based Detection From First Principles

1. **The LLM has semantic understanding**. With the TASK and PLAN as context, a cheap LLM can answer: "Is this trajectory making meaningful progress toward the stated goal?" No rule-based system can answer this.

2. **Structured input makes it cheap**. We don't feed the full conversation history. We craft a compact, structured "drift check context" (~500-800 tokens) with exactly what matters: task summary, current subtask, last N tool calls (type + args hash + result summary), files modified, errors, turn count.

3. **Cheap models make it negligible**. Claude Haiku or GPT-4o-mini cost ~$0.0001-0.0005 per check. Running every 8 turns means ~$0.001-0.005 per session. A stuck session costs 100-1000× more in wasted tokens.

4. **The question is classification, not generation**. "Is the agent making progress? Reply JSON." This is the ideal task for a small model — structured input, binary classification, structured output.

5. **Rule-based becomes the accelerator, not the authority**. Rule-based runs first (0 tokens, <1ms). If it detects a clear stuck pattern (hash collision ≥3), skip the LLM check — save tokens. If rule-based is clean, LLM check runs on schedule. If LLM call fails, fall back to rule-based verdict. The LLM is the authoritative detector; rule-based is the cost-saving pre-filter.

### New Detection Architecture

```
Every N turns (configurable, default 8):
  1. Rule-based quick scan (0 tokens, <1ms)
     ├── CLEAR STUCK (hash collision ≥3): skip LLM, escalate immediately
     └── CLEAN or AMBIGUOUS: proceed to LLM check

  2. Build structured drift context (~500-800 tokens):
     {
       task: "Add dark mode toggle to settings",        // from L1 spec
       subtask: "Implement CSS variable switching",     // from L2 plan
       last_12_tool_calls: [
         {tool: "read", file: "theme.css", result: "200 lines CSS"},
         {tool: "edit", file: "theme.css", result: "OK, 15 lines changed"},
         ...
       ],
       files_modified: ["theme.css", "toggle.tsx"],
       errors: [{tool: "bash", error: "tsc --noEmit: 3 type errors"}],
       turn: 24,
       elapsed_minutes: 8
     }

  3. Send to cheap LLM (Haiku/mini):
     "Is this agent making meaningful progress toward the task?
      Reply JSON: {drifted: bool, pattern: string|null, confidence: float, action: continue|nudge|restart}"

  4. Act on verdict:
     - continue: do nothing
     - nudge: inject correction context between turns
     - restart: prune dead context, restart with clean summary
```

### Why This Is Better

| Axis | Rule-First (old) | LLM-First (new) |
|------|-----------------|-----------------|
| **Semantic drift** | Cannot detect | Detected by LLM |
| **Cost** | 0 tokens always | ~500-800 tokens every 8 turns (~$0.0001/check) |
| **False positives** | Repetition on polling/retry workflows | LLM understands intent vs noise |
| **False negatives** | ~20% miss rate (semantic drift) | Near-zero (LLM has task context) |
| **Fallback** | None (rule-based is final) | Rule-based catches fast-path stuck patterns if LLM fails |
| **Latency** | <1ms | ~200-500ms (Haiku API call) |

### Token Budget (L2.5)

| Component | Old | New |
|-----------|-----|-----|
| Rule-based scan | 0 tokens (every step) | 0 tokens (every step, pre-filter only) |
| LLM drift check | ~500 tokens every 15 steps | ~700 tokens every 8 steps |
| Avg per subtask (25 steps) | ~0-150 | ~1,500-2,200 |
| Per-step amortized | ~0-6 | ~60-88 |

**Trade-off**: ~2,000 tokens/session for near-perfect semantic drift detection. A single prevented stuck session saves 5,000-50,000 tokens. Net positive.

### Model Selection

| Model | Input $/M | Speed | Best For |
|-------|-----------|-------|----------|
| **Claude Haiku 4.5** | $0.25 | Fastest Anthropic | Primary: JSON classification, reliable |
| **GPT-4o-mini** | $0.15 | Fast | Alternative: cheapest option |
| **Gemini Flash 2.5** | $0.15 | Fast | Alternative: if Google API available |
| **Local (Ollama)** | Free | Variable | Offline: llama3.2-3b, qwen2.5-3b |

Default: **Claude Haiku 4.5**. Configurable via `.pi/harness/config.json → driftMonitor.llmModel`.

---

The harness implements THREE distinct drift detection paradigms at three different pipeline stages. They are complementary, not redundant. Each catches a different failure mode that the others cannot.

## Why Three Paradigms?

Agent failure isn't one thing. It's a cascade:

1. **Tool-call quality decays** (stuck loops, context pollution) → agent can't make progress
2. **Scope creeps** (agent does more or less than spec) → wrong thing gets built
3. **Implementation diverges** (code doesn't match spec) → built thing doesn't work

Each needs different detection timing, mechanism, and intervention.

---

## Paradigm 1: Tool-Call Drift (L2.5 — Runtime Drift Monitor) [LLM-FIRST v2]

**Detects**: Stuck patterns, context pollution, SEMANTIC drift. The agent is spinning its wheels OR heading in the wrong direction.

**When**: Between L2 (Plan) and L3 (Execute). Runs continuously during execution.

**Mechanism** (LLM-First, Rule-Assisted):

1. **Rule-based pre-filter (0 tokens, <1ms)**: Quick scan for obvious stuck patterns:
   - Repetition: 3+ identical tool calls (hash tool+args)
   - Failure spiral: 4+ consecutive errors
   - Tool cycling: A-B-A-B pattern in last 6 calls
   - Silence drift: 15+ iterations without text response
   - Rework churn: 3+ writes to same file without progress
   - Excessive searching: 5+ ls/find/grep without code edits
   
   If CLEAR stuck pattern detected → skip LLM, escalate immediately. If CLEAN or AMBIGUOUS → proceed to LLM check.

2. **LLM-based primary detection (~700 tokens every 8 turns)**: 
   - Build structured "drift check context" from task, plan, recent tool calls, errors, modified files
   - Send to cheap model (Haiku 4.5): "Is agent making meaningful progress? Reply JSON."
   - Model returns: `{drifted: bool, pattern: string|null, confidence: float, action: continue|nudge|restart}`

3. **Fallback**: If LLM call fails (timeout, API error), use rule-based verdict as safety net.

**Structured Drift Context Schema**:
```yaml
task: string            # from L1 hardened spec (~100 tokens)
subtask: string         # current subtask from L2 plan (~50 tokens)
recent_tool_calls:      # last 8-12 calls
  - tool: string
    args_hash: string
    result_summary: string  # 50 chars max
    error: bool
files_modified: [string]   # file paths only
error_count: number
turn: number
elapsed_seconds: number
```

**Intervention** (escalation model):
1. **Soft nudge** (drifted=false but confidence <0.7): System message — "You appear to be making slow progress. Consider summarizing accomplishments and focusing on next step."
2. **Strong nudge** (drifted=true, action=nudge): System message + context summary — "You may be off-track. Here's a clean summary. Re-read the plan and continue."
3. **Forced restart** (drifted=true, action=restart): Terminate session, prune dead-end context entries, restart with clean context + correction prompt.

**Pruning Heuristic**:
| Keep | Prune |
|------|-------|
| Error led to different approach | Identical call returned same result |
| Output contained new information | Pure noise (navigation, boilerplate errors) |
| User explicitly asked for action | Agent retried without direction |
| Established constraint used later | Agent forgot about the call entirely |

**Model-Adaptive**:
| Model | LLM Check Frequency | Rule Pre-Filter | Fallback |
|-------|---------------------|-----------------|----------|
| Opus/Claude | Every 12 turns | Yes | Rule-based |
| GPT | Every 8 turns | Yes | Rule-based |
| Gemini | Every 8 turns | Yes | Rule-based |
| Haiku (cheap) | Every 5 turns | Yes | Rule-based |

**Why this is novel**: Each component exists independently (ironclaw DriftMonitor for detection, SWE-Pruner for pruning, LangSight for loop detection, Vectara for guardian agents). No existing system combines **LLM-first detect → prune → restart** into one pipeline with structured drift context and cheap-model classification. The LLM-first approach catches semantic drift (the 20% rule-based misses) at negligible cost.

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

**Why distinct from L2.5**: L3 detects WHAT the agent is doing wrong (off-spec). L2.5 detects THAT the agent is stuck or semantically off-track. An agent can be stuck while still on-spec. An agent can be off-spec while making rapid progress (in the wrong direction).

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

| Axis | Tool-Call Drift (L2.5) [v2 LLM-First] | Spec Drift (L3) | Implementation Drift (L4) |
|------|--------------------------------------|-----------------|--------------------------|
| **Detects** | Agent stuck/spinning + SEMANTIC drift | Agent off-plan | Code-spec mismatch |
| **Timing** | Continuous during execution | Pre/post each subtask | Post-execution |
| **Mechanism** | LLM-based primary (Haiku) + rule-based pre-filter | State hash + anti-criteria scan | Adversarial critic + debate |
| **Token cost** | ~700/check every 8 turns (~2,000-3,000/session) | ~500/checkpoint | ~4,500/subtask |
| **Intervention** | Nudge → prune → restart | Abort + replan | Rework + re-verify |
| **LLM needed** | Yes (cheap model, primary) | No (hash comparison) | Yes (adversarial reasoning) |
| **Miss rate** | Near-zero (LLM has task context) | Near-zero (structural comparison) | Depends on critic quality |
| **False positives** | Low (LLM distinguishes polling from stuckness) | Near-zero | Low (hard-threshold criteria) |

---

## Why Three Paradigms, Not One?

A single drift detector would have to be:
- Structural enough to catch spec violations (L3)
- Semantic enough to catch stuckness AND direction-drift (L2.5)
- Adversarial enough to catch correctness issues (L4)

That's three different detection mechanisms at three different semantic levels. Trying to unify them into one would produce a weaker detector at each axis. The pipelines are thin and sharp, not thick and dull.

The L2.5 LLM-first redesign catches what the old rule-based design could not: the agent heading confidently in the wrong direction.

---

## Integration Into Pipeline

```
L1 (Spec) → L2 (Plan) → [L2.5: LLM-First Drift Monitor] → L3 (Execute)
                              ↓ rule-based pre-filter (0 tokens)
                              ↓ Haiku/mini drift check every 8 turns (~700 tokens)
                              ↓ detects stuck patterns + semantic drift
                              ↓ prunes + restarts
                              
L3 → L4 (Adversarial) → P20 (Lint+Format) → L5+
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
- ~~Can Haiku/Flash serve as the meta-agent drift detector, keeping overhead near zero?~~ **RESOLVED**: Yes. Haiku 4.5 is the default. ~$0.0001-0.0005 per check. Near-zero overhead.
- What's the optimal turn frequency for LLM checks? (Default 8, adaptive per model to be evaluated in production.)
- Should the structured drift context include git diff summary of agent's changes?
