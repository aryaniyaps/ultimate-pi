---
type: source
status: ingested
source_type: blog
title: "Guardian Agents Benchmark"
author: Vishal Naik, Chenyu Xu (Vectara)
date_published: 2025-11-21
url: https://www.vectara.com/blog/guardian-agents-benchmark
confidence: high
key_claims:
  - "Platform-agnostic benchmark with ~900 real-world scenarios across 6 domains"
  - "Overall Correct rate only 5-59% across platforms (LlamaIndex, LangChain; GPT-5, Claude Sonnet 4.5)"
  - "Most failures from missing required tool calls and incorrect tool selection"
  - "Guardian Agents: pre-execution safety layer validating tools, arguments, and sequencing"
  - "Repeated tool calls are a significant failure category"
tags:
  - source
  - guardian-agents
  - benchmark
  - agent-reliability
  - vectara
related:
  - "[[Research: Meta-Agent Context Drift Detection]]"
  - "[[guardian-agent-pattern]]"
  - "[[context-drift-in-agents]]"
created: 2026-05-02
updated: 2026-05-02

---# Vectara Guardian Agents Benchmark

## Summary

Vectara built a platform-agnostic benchmark evaluating agents in their actual operating environments (not simulated sandboxes). Across 907 real-world scenarios and 6 domains, overall correct rate ranged from 5-59% — even when response quality appeared high, tool-call correctness was low. Introduces Guardian Agents as a pre-execution safety layer that validates proposed tool calls before they run.

## What It Contributes

Provides hard numbers on agent tool-call reliability: the gap between response quality (often 50%+) and overall correctness (5-59%) is enormous. Validates that repeated tool calls and incorrect tool selection are dominant failure modes. The Guardian Agent concept (pre-execution validation) is a complementary approach to the meta-agent (post-execution detection + pruning).

## Benchmark Design

- **Scenario engine**: LLM-driven pipeline generating test scenarios with happy paths and adversarial variations
- **Dual evaluation**: Response Correctness (did the answer use tool outputs correctly?) + Action Trace Correctness (did the agent select/sequence/parameterize tools correctly?)
- **Failure taxonomy**: Incorrect tool selection, invalid/missing parameters, missing required tool calls, repeated tool calls, incorrect sequencing

## Six Domains

Email, Calendar, Financial Analysis, Customer Service, Internal Knowledge Retrieval, Business Intelligence

## Key Results

| Configuration | Response Correct | Action Trace Correct | Overall Correct |
|--------------|-----------------|---------------------|-----------------|
| GPT-5 + LangChain | ~70% | ~30% | ~25% |
| Claude Sonnet 4.5 + LangChain | ~65% | ~25% | ~20% |
| GPT-5 + LlamaIndex | ~55% | ~15% | ~10% |
| Claude Sonnet 4.5 + LlamaIndex | ~60% | ~10% | ~5% |

Action trace correctness is the bottleneck — agents produce fluent answers but execute tools incorrectly.

## Failure Distribution

- Missing required tool calls: 35-45% of failures
- Incorrect tool selection: 25-35%
- Repeated tool calls: 10-15%
- Invalid parameters: 10-15%
- Incorrect sequencing: 5-10%

## Guardian Agents

Pre-execution safety layer with three checks:
1. **Unnecessary tools**: Blocks irrelevant/unsafe actions
2. **Missing required tools**: Ensures plan includes all needed tools
3. **Argument validation**: Checks correctness, presence, structure of arguments

Feedback aggregated and sent back to agent for plan revision. Capped retries to avoid infinite loops.

## Relevance to Meta-Agent Concept

Vectara's Guardian Agents validate proactively (before execution). The meta-agent detects reactively (after stuck pattern emerges). These are complementary: Guardian Agents as first line of defense, meta-agent as recovery mechanism when the agent gets past the guardian but still gets stuck. The failure taxonomy validates that repeated tool calls (10-15% of failures) are a real problem worth detecting.
