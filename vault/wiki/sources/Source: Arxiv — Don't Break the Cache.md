---
type: source
status: ingested
source_type: academic-paper
title: "Don't Break the Cache: An Evaluation of Prompt Caching for Long-Horizon Agentic Tasks"
author: "Elias Lumer, Faheem Nizar, Akshaya Jangiti, et al. (PricewaterhouseCoopers U.S.)"
date_published: 2026-01-31
url: "https://arxiv.org/html/2601.06007v2"
confidence: high
tags:
  - prompt-caching
  - agentic-workloads
  - multi-provider-evaluation
  - cache-strategies
related:
  - "[[Research: Prompt Renderer for Multi-Model Agent Harness]]"
  - "[[Source: TianPan Prompt Caching Architecture]]"
key_claims:
  - "First comprehensive evaluation of prompt caching for agentic workloads across OpenAI, Anthropic, and Google"
  - "Prompt caching reduces API costs by 41-80% and improves TTFT by 13-31% across providers"
  - "Strategic cache boundary control (system prompt only) outperforms naive full-context caching"
  - "Full context caching can paradoxically increase latency — dynamic tool calls trigger cache writes for non-reusable content"
  - "System prompt only caching provides the most consistent benefits across both cost and latency dimensions"
  - "Cost savings scale linearly with prompt size (54-89% at 50K tokens), stable across tool counts"
  - "Evaluated on DeepResearch Bench: 500 agent sessions, 10K-token system prompts, 4 flagship models"
created: 2026-05-02
updated: 2026-05-02

---# Academic Validation of Prompt Caching Strategies

## Experimental Design

- **3 providers**: OpenAI (GPT-5.2, GPT-4o), Anthropic (Claude Sonnet 4.5), Google (Gemini 2.5 Pro)
- **4 cache strategies**:
  1. **No Cache**: UUID prepended to break all prefix matching
  2. **Full Context Caching**: No UUIDs, automatic caching
  3. **System Prompt Only**: UUID appended after system prompt — only static system prompt cached
  4. **Exclude Tool Results**: UUIDs after system prompt AND after each tool result
- **Benchmark**: DeepResearch Bench — 100 PhD-level research tasks, agents autonomously execute web search tool calls

## Key Results

| Model | Best Mode | Cost ↓ | TTFT ↓ |
|-------|-----------|--------|--------|
| GPT-5.2 | Excl. Tool Results | 79.6% | 13.0% |
| Claude Sonnet 4.5 | System Prompt | 78.5% | 22.9% |
| Gemini 2.5 Pro | System Prompt | 41.4% | 6.1% |
| GPT-4o | System Prompt | 45.9% | 30.9% |

## Cache Strategy Comparison

1. **System prompt only caching** = most consistent benefits across cost AND latency
2. **Full context caching** = similar cost savings BUT paradoxically can increase latency (GPT-4o: -8.8% TTFT regression)
3. **Exclude tool results** = best for models with high tool-call overhead (GPT-5.2)
4. **Cost savings driven by system prompt size**, not tool count — focus on maximizing cacheable prefix

## Strategic Cache Boundary Control

The key insight: **providers abstract the caching mechanism, automatically triggering cache creation when token thresholds are exceeded. Without explicit boundary control, this can cache dynamic, session-specific content.**

Implementation: use UUIDs to explicitly break the cache at boundary points:
- Prepending UUID → breaks ALL caching (baseline)
- UUID after system prompt → ONLY system prompt cached
- UUID after system prompt + after each tool result → excludes tool results from cache

## Minimum Token Thresholds

| Provider | Model | Min Tokens |
|----------|-------|-----------|
| OpenAI | GPT-4o, GPT-5.2 | 1,024 |
| Anthropic | Claude Sonnet 4.5 | 1,024 |
| Google | Gemini 2.5 Pro | 4,096 |

## Ablation Findings

- **Cost savings scale linearly with prompt size**: 10-45% at 500 tokens → 54-89% at 50K tokens
- **Tool count has minimal impact**: cost savings stable across 3-50 tool calls
- **Below threshold**: TTFT regressions of 10-18% at 500 tokens (caching cannot activate)

## Relevance to ultimate-pi Prompt Renderer

1. **Compile-time caching**: Pre-rendered prompts shipped in npm → no runtime cache warmup, no threshold concerns
2. **Static-first structure**: The renderer must place all static/model-agnostic content FIRST, variables/dynamic content LAST
3. **System prompt caching is sufficient**: 75-81% of savings come from caching the system prompt alone — focus rendering optimization there
4. **Per-model threshold awareness**: Minimum 1,024 tokens for caching to engage (OpenAI/Anthropic), 4,096 for Google — renderer should ensure compiled prompts exceed these
