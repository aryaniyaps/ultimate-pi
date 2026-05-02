---
type: source
source_type: engineering-blog
title: "Prompt Caching: The Optimization That Cuts LLM Costs by 90%"
author: "Tian Pan"
date_published: 2026-04-07
url: "https://tianpan.co/blog/2025-10-13-prompt-caching-cut-llm-costs"
confidence: high
tags:
  - prompt-caching
  - cost-optimization
  - multi-model
  - cache-architecture
related:
  - "[[Research: Prompt Renderer for Multi-Model Agent Harness]]"
  - "[[Source: Arxiv — Don't Break the Cache]]"
key_claims:
  - "Most teams overpay 60-90% by reprocessing the same tokens on every request"
  - "Multi-tier caching: Semantic cache (100% savings) → Prefix cache (50-90% savings) → Full inference (0% savings)"
  - "Golden rule: static content first, dynamic content last — injecting timestamps/user IDs breaks the cache"
  - "Parallel execution trap: firing parallel requests before cache warms → 4% hit rate. Fix: dedicated warmup call"
  - "Anthropic: cache write 25% premium, cache read 90% discount — break-even at 1.4 cache hits"
  - "OpenAI: auto-caching, 50% discount, no write premium"
  - "Monitor: cache hit rate = cache_read_input_tokens / total_input_tokens, target 70%+"
---

# Multi-Tier Prompt Caching Architecture

## Three-Tier Stack

```
Request
→ Semantic cache (exact/near-duplicate queries) → 100% savings
→ Prefix cache (shared static context)           → 50-90% savings
→ Full inference                                  → 0% savings
```

Well-tuned system routes 70-80% of tokens through caching layers.

## Prompt Structure IS Cache Architecture

The golden rule: **static content first, dynamic content last.**

```
[System prompt — stable across all requests]         ← CACHED
[Retrieved documents — stable for a given session]   ← CACHED
[Conversation history — grows per turn]              ← PARTIAL
[Current user message — always new]                  ← NEVER
```

Cache-breaking anti-patterns:
- Timestamps in system prompts
- User IDs in static sections
- Request IDs injected early
- Document content that varies slightly across requests

## Provider Differences

| Provider | Cache Control | Write Cost | Read Cost | TTL |
|----------|-------------|-----------|-----------|-----|
| Anthropic | Explicit `cache_control` markers | +25% premium | 90% discount | 5min (extends to 1h) |
| OpenAI | Automatic | None | 50% discount | 5min |
| Google | Explicit context cache | Storage cost | Guaranteed discount | Configurable |
| vLLM (self-host) | Automatic prefix caching (APC) | None | 14-24x throughput | Hash-table KV blocks |

## The Parallel Execution Trap

**Problem**: Firing 10 parallel requests before cache is written → 10 cache writes, 0 reads → 5-10x expected cost.

**Fix**: Dedicated warmup call with `max_tokens=1` before parallel processing.

Cost comparison for 30K-token document with 3 parallel questions: $0.34 without warming vs $0.14 with warming — 59% reduction.

## When Caching Hurts

- One-shot workflows: everything is unique, you're paying write premiums for zero reads
- Dynamic system prompts: personalization undermines prefix caching
- Short prompts: below 1,024-token threshold, caching doesn't engage
- Cold starts: freshly deployed services, cache TTL expiry at low-traffic hours

## Relevance to ultimate-pi Prompt Renderer

The caching layer in the prompt renderer should:
1. **Hash-based cache keys**: hash the base spec + variables → deterministic cache lookup
2. **Pre-compiled prompts shipped in npm**: eliminates cache warmup entirely — prompts are pre-rendered at build time
3. **Output caching for rendered prompts**: if same spec+model+vars produces the same output, return cached result
4. **Monitoring**: track renderer cache hit rate (prompts served from pre-compiled vs runtime-rendered)
