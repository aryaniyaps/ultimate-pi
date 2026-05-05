---
type: concept
status: developing
created: 2026-05-05
updated: 2026-05-05
tags:
  - compaction
  - deterministic
  - context-engineering
  - architecture-pattern
related:
  - "[[vcc-conversation-compaction-for-pi]]"
  - "[[structured-compaction]]"
  - "[[context-engineering]]"
  - "[[context-continuity]]"
  - "[[context-folding]]"
---

# Deterministic Session Compaction

## Definition

Deterministic session compaction is the pattern of compressing agent conversation history using algorithmic extraction rather than LLM summarization. Same input always produces identical output. Zero API calls. Sub-second latency.

## Why It Matters

LLM-based compaction introduces three failure modes:
1. **Hallucination**: Summarizer invents facts not in the original conversation
2. **Omission**: Critical state (file paths, decision rationale, uncommitted changes) dropped
3. **Non-reproducibility**: Same session compacted twice produces different summaries, making debugging impossible

Deterministic compaction eliminates all three at the cost of lower compression quality on nuanced context.

## Implementations

### Production
- **pi-vcc** (sting8k): 5 semantic sections, JSONL recall, Pi-native. 75 stars. (Source: [[pi-vcc-github-repo]])
- **MemoSift**: 6-layer pipeline (classify → deduplicate → compress → score → optimize → budget). Framework adapters for OpenAI/Anthropic/Google/LangChain. Sub-2ms latency, 97% fact retention.
- **Distill**: 4-layer context preprocessing (cluster → select → rerank → compress). 143 stars. Different scope — preprocesses context before LLM, not session history. (Source: [[distill-deterministic-context-compression]])

### Proposed (Not Implemented)
- **Codex DSC**: Deterministic checkpoint from session event logs. Structured data model with SUSPECT marking for stale facts. Rejected by OpenAI. (Source: [[codex-dsc-rfc-8573]])

### Adjacent (Deterministic but Different Layer)
- **pi-rtk-optimizer**: Deterministic command rewriting + output compaction. Prevents tokens from entering conversation rather than compressing after. (Source: [[pi-rtk-optimizer-github-repo]])

## Broader Compaction Landscape (May 2026)

The Pi ecosystem now has 7 compaction-related extensions operating at three layers (Source: [[pi-compaction-extensions-ecosystem]]):
1. **Prevention**: pi-rtk-optimizer (deterministic output reduction)
2. **Mid-session**: pi-context-prune (tool-call batch summarization)
3. **Boundary**: pi-vcc (deterministic), pi-omni-compact (large-context LLM), pi-custom-compaction (custom LLM), pi-agentic-compaction (sandboxed LLM), pi-model-aware-compaction (threshold control)

Anthropic's official Context Compaction API (beta, January 2026) adds server-side LLM compaction for Claude models. (Source: [[anthropic-compaction-api]])

Context Folding (arXiv 2510.11967) introduces a fundamentally new approach: learned branch/return sub-trajectories within a single run, achieving 10x context reduction via RL training. (Source: [[context-folding-paper]], [[context-folding]])

## Trade-offs

| Dimension | Deterministic | LLM-Based | Context Folding |
|-----------|--------------|-----------|-----------------|
| Reproducibility | Identical output | Varies per run | Varies (RL-learned) |
| Cost | $0 per compaction | Tokens consumed | Training cost + minimal runtime |
| Latency | 30-470ms | 2-10s | Sub-second (learned policy) |
| Nuance preservation | Weak (structural extraction) | Strong (semantic) | Strong (learned summaries) |
| Hallucination risk | Zero | Non-zero | Low (constrained by RL) |
| Recall capability | Full JSONL access (pi-vcc) | Lost after summarization | Summary only |
| Timing | At compaction boundary | At compaction boundary | Within-run, continuous |

## Pattern for Harness Integration

Deterministic compaction maps to our harness at two points:
1. **L2.5 Drift Monitor**: Deterministic compaction prevents drift introduced by faulty summaries
2. **L6 Memory**: Session lineage recall (pi-vcc's `vcc_recall`) complements wiki as short-term memory

The strongest architecture uses a three-layer approach:
1. **Prevention** (rtk-optimizer): Reduce tool output tokens before they accumulate
2. **Within-run folding** (context folding): Branch/return for exploration sub-tasks
3. **Boundary compaction** (pi-vcc): Deterministic extraction at compaction triggers, with LLM fallback for complex sessions
