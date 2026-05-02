---
type: resolution
title: "Resolved: In-Place Context Pruning vs Session Restart"
created: 2026-04-30
updated: 2026-04-30
tags:
  - resolution
  - context-pruning
  - meta-agent
  - drift-detection
status: resolved
resolves:
  - "[[meta-agent-context-pruning]] Open Questions #1-4"
  - "[[drift-detection-unified]] Open Questions #1-3"
related:
  - "[[meta-agent-context-pruning]]"
  - "[[drift-detection-unified]]"
  - "[[context-drift-in-agents]]"
sources:
  - "[[claude-context-editing-docs]]"
  - "[[opencode-dcp]]"
  - "[[openclaw-session-pruning]]"
  - "[[ms-chat-history-management]]"
  - "[[agent-drift-academic-paper]]"

---# Resolved: In-Place Context Pruning vs Session Restart

## Resolution

**Both in-place editing and session restart exist in production. In-place editing (server-side context clearing) is the preferred pattern when the LLM provider supports it. Session restart (compaction/summarization) is the fallback for providers without in-place support.**

## Evidence

### In-Place Editing (Production Pattern)

Three major implementations confirm in-place context editing as the dominant production pattern:

1. **Claude API Context Editing** (Anthropic, 2025): Server-side strategies `clear_tool_uses_20250919` and `clear_thinking_20251015`. Content is cleared server-side before the prompt reaches Claude. The client maintains the full, unmodified conversation history. Placeholder text replaces cleared content so the model knows it was removed. (Source: [[claude-context-editing-docs]])

2. **OpenCode DCP** (2.5k stars, April 2026): "Your session history is never modified — DCP replaces pruned content with placeholders before sending requests to your LLM." Uses compress tool, deduplication, and purge-errors strategies. Cache hit rate: ~85% with DCP vs ~90% without. (Source: [[opencode-dcp]])

3. **OpenClaw Session Pruning**: "Pruning only targets toolResult messages. It never modifies your actual user messages or the assistant's responses." Two modes: soft-trim (keep start+end, remove middle) and hard-clear (placeholder replacement). (Source: [[openclaw-session-pruning]])

### Session Restart (Compaction/Summarization)

Available as fallback:

- **Claude SDK Compaction**: When token threshold exceeded, Claude generates structured summary, entire history replaced. Summary includes: Task Overview, Current State, Important Discoveries, Next Steps, Context to Preserve. (Source: [[claude-context-editing-docs]])
- **Microsoft Semantic Kernel**: "Summarizing Older Messages" strategy — summarizes chat history, sends system message + summary + recent messages. Supports using small models (SLM) for summarization. (Source: [[ms-chat-history-management]])

## Specific Questions Resolved

### Q1: Can context be pruned in-place or must it always restart?

**In-place. Always in-place for supported providers.** Claude API, OpenCode DCP, and OpenClaw all implement in-place editing — content is cleared before sending to the LLM but client-side history is never modified. Session restart is only needed for providers that lack server-side context editing APIs.

### Q2: Minimum context that must survive pruning?

**Production systems keep: system message, last 3-5 assistant turns (configurable `keepLastAssistants`), all user messages, any tool results containing images, and protected tools (task, skill, write, edit by default).** Everything else is eligible for clearing. The OpenClaw default `keepLastAssistants: 3` is a reasonable starting point.

### Q3: Does pruning break chain-of-thought coherence?

**In-place pruning preserves more coherence than restart.** Since in-place editing only clears old tool results (not assistant reasoning), chain-of-thought is preserved. Session restart (compaction) replaces everything with a summary, which loses fine-grained reasoning. Claude's thinking block clearing strategy (`clear_thinking_20251015`) explicitly controls how many turns of thinking to keep for coherence.

**Recommendation**: Use in-place tool result clearing for routine context management. Reserve restart/compaction for extreme cases (>100k tokens accumulated).

### Q4: How does pruning interact with prompt caching?

**In-place clearing invalidates cache from the clearing point forward, but subsequent requests reuse the newly cached prefix.** The trade-off is quantified: OpenCode DCP reports ~85% cache hit rate with pruning vs ~90% without — a 5% cache hit reduction for significant token savings. Claude API's `clear_at_least` parameter ensures enough tokens are cleared to make cache invalidation worthwhile.

**For the harness**: Configure `clear_at_least` to clear minimum 5000 tokens per operation. This ensures the token savings outweigh the cache write cost.

### Q5: Can Haiku/Flash serve as meta-agent drift detector?

**Yes, for rule-based detection with near-zero overhead. For LLM-based semantic drift detection, Haiku/Flash adds ~200-500 tokens per check (every 10-15 steps).** See [[resolved-small-model-meta-agents]] for full resolution.

### Q6: Does the meta-agent itself need drift monitoring? (Infinite regress)

**No.** The meta-agent uses rule-based detection (hash comparison + counters = 0 LLM tokens). There is no agentic loop to drift. If LLM-based detection is used (every 10-15 steps), it's a single inference, not an agentic session — no regress.

## Harness Implementation

For the ultimate-pi harness Layer 2.5 (Runtime Drift Monitor):

| Strategy | When to Use | Implementation |
|----------|------------|----------------|
| **In-place clearing** | Primary (Claude API available) | Use `clear_tool_uses_20250919` with trigger at 30k tokens, keep 5 recent tool uses |
| **Soft-trim** | Large tool results | Trim middle of oversized results, keep start+end |
| **Hard-clear** | Stale tool results | Replace with `[Content cleared: tool result from step N]` |
| **Compaction/restart** | Fallback (non-Claude providers) | Generate structured summary, restart session |
| **Rule-based detection** | Always-on | 6 pattern signatures, 0 tokens |

## Confidence

**High.** Three independent production systems (Anthropic Claude API, OpenCode DCP, OpenClaw) all implement the same pattern: in-place editing that never modifies client-side history. The pattern is consistent and well-documented.
