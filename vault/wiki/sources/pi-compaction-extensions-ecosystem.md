---
type: source
source_type: ecosystem-analysis
title: "Pi Compaction Extensions Ecosystem (2026)"
author: "Multiple authors"
date_published: 2026-04-25
date_accessed: 2026-05-05
url: "https://www.npmjs.com/search?q=pi%20compaction"
confidence: medium
tags:
  - pi-agent
  - compaction
  - extensions
  - ecosystem
key_claims:
  - "At least 7 compaction-related extensions exist for Pi as of May 2026"
  - "pi-vcc: deterministic algorithmic compaction + recall (only zero-LLM option)"
  - "pi-model-aware-compaction: per-model context threshold triggers"
  - "pi-custom-compaction: swap compaction model/template, fallback chains"
  - "pi-agentic-compaction: virtual filesystem + sandboxed bash/jq approach"
  - "pi-omni-compact: large-context model (1M+) subprocess for high-fidelity summaries"
  - "pi-context-prune: tool-call batch summarization with original preservation"
  - "pi-rtk-optimizer: upstream token reduction via command rewriting + output compaction"
  - "Pi ecosystem has 2,808+ indexed resources and 1,183+ extensions (April 2026)"
---

# Pi Compaction Extensions Ecosystem

## Summary

As of May 2026, Pi's compaction layer has spawned at least 7 community extensions addressing different failure modes and layers of token management. The Pi ecosystem overall has 2,808+ indexed resources and 1,183+ extensions, with compaction as a critical pain point.

## Extensions

### 1. pi-vcc (sting8k) — Deterministic Algorithmic
- **Approach**: No-LLM extraction into 5 semantic sections
- **Differentiator**: Determinism + recall over JSONL lineage
- **Stars**: 75 | **npm**: @sting8k/pi-vcc | **Version**: v0.3.12
- **Install**: `pi install npm:@sting8k/pi-vcc`

### 2. pi-model-aware-compaction — Per-Model Thresholds
- **Approach**: Configurable per-model context-usage thresholds
- **Differentiator**: Different models get different compaction triggers (wildcard support)
- **Version**: v0.1.4 (April 2026)
- **Use case**: Teams using multiple models with different context windows

### 3. pi-custom-compaction (nicobailon) — Model/Template Swap
- **Approach**: Swap the model and prompt template Pi uses for compaction
- **Differentiator**: Fallback model chains, configurable raw context retention (tokens or %)
- **Version**: v0.2.5 (April 2026)
- **Use case**: Teams wanting to use cheaper/faster models for compaction while keeping LLM approach

### 4. pi-agentic-compaction (laulauland/salemsayed) — Virtual Filesystem
- **Approach**: Mounts conversation as `/conversation.json`, uses sandboxed bash/jq for extraction
- **Differentiator**: More efficient for 50K+ token conversations (queries only relevant portions)
- **Version**: Feb 2026
- **Use case**: Long conversations where full-context summarization is too expensive

### 5. pi-omni-compact (Whamp) — Large-Context Model
- **Approach**: Spawns separate Pi subprocess with 1M+ token model to read entire conversation at once
- **Differentiator**: Highest fidelity summaries — maximizes LLM compute for quality
- **Version**: v0.1.2
- **Use case**: When summary quality matters more than cost/speed
- (Source: [[pi-omni-compact-github-repo]])

### 6. pi-context-prune (championswimmer) — Tool-Call Batch Summarization
- **Approach**: Summarizes tool-call batches, prunes verbose outputs, preserves originals in session index
- **Differentiator**: 5 trigger modes + prefix caching integration + on-demand recovery
- **Use case**: Mid-session tool-call bloat reduction
- (Source: [[pi-context-prune-github-repo]])

### 7. pi-rtk-optimizer (MasuRii) — Upstream Token Reduction
- **Approach**: Rewrites bash commands to RTK equivalents + multi-stage output compaction pipeline
- **Differentiator**: Operates UPSTREAM of conversation — prevents tokens from entering context
- **Version**: v0.5.3 (April 2026)
- **Use case**: Reducing tool output tokens before they accumulate
- (Source: [[pi-rtk-optimizer-github-repo]])

## Competitive Landscape

| Extension | LLM Calls | Deterministic | Recall | Layer | Custom Model |
|-----------|-----------|---------------|--------|-------|-------------|
| pi-vcc | No | Yes | Yes | Conversation boundary | N/A |
| model-aware | Yes (default) | No | No | Conversation boundary | No |
| custom-compaction | Yes (custom) | No | No | Conversation boundary | Yes |
| agentic-compaction | Yes (sandboxed) | No | No | Conversation boundary | Configurable |
| omni-compact | Yes (large-ctx) | No | No | Conversation boundary | Yes (1M+ required) |
| context-prune | Yes | No | Yes (originals) | Tool-call batches | Default model |
| rtk-optimizer | No | Yes | N/A | Tool output | N/A |

## Three Layers of Token Management

The ecosystem reveals a layered architecture for token management:
1. **Prevention** (rtk-optimizer): Reduce tokens at tool execution, before they enter conversation
2. **Mid-session pruning** (context-prune): Summarize tool-call batches during conversation
3. **Boundary compaction** (vcc, model-aware, custom, agentic, omni): Compress full conversation at threshold

pi-vcc remains the only fully deterministic conversation compaction option. pi-rtk-optimizer is also deterministic but operates at a different layer (tool output).

## Why This Matters

The ecosystem has grown from 4 to 7 extensions in under a month. This validates compaction as the #1 pain point in the Pi ecosystem. The three-layer architecture that has emerged (prevention → pruning → compression) mirrors our harness's approach to context engineering.
