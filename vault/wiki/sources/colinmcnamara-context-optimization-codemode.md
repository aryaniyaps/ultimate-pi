---
type: source
status: ingested
source_type: blog
title: "Context Optimization in AI Agents: From Sub-Agents to TypeScript Interfaces"
author: "Colin McNamara"
date_published: 2025-09-29
url: "https://colinmcnamara.com/blog/context-optimization-mcp-code-mode"
confidence: medium
tags:
  - agent-tools
  - context-optimization
  - typescript-execution-layer
  - mcp
key_claims:
  - "Traditional tool calling uses ~10,500+ tokens per interaction; Code Mode uses ~3,100 tokens — 3-4x reduction"
  - "Sub-agent pattern is 'non-deterministic to non-deterministic' — LLMs coordinating LLMs"
  - "Code Mode is 'non-deterministic to deterministic' — LLM generates code, runtime executes predictably"
  - "TypeScript has advantages for LLM-generated code: rich training data, type safety as guardrails, deterministic execution"
  - "LLMs have seen millions of lines of TypeScript in training but far fewer synthetic tool-call examples"
created: 2026-05-02
updated: 2026-05-02

---# Context Optimization in AI Agents: From Sub-Agents to TypeScript Interfaces

Colin McNamara's analysis of Cloudflare's Code Mode, comparing context consumption across three agent tool-calling patterns: traditional tool calling, sub-agent architecture, and the TypeScript execution layer.

## Context Efficiency Comparison

| Pattern | Context per Interaction | Mechanism |
|---------|------------------------|-----------|
| Traditional tool calling | ~10,500+ tokens | System prompt + tool defs + history + call/response pairs |
| Sub-agent pattern | ~1,000-1,300 per agent | Supervisor with minimal context, task agents with focused tools |
| Code Mode (TS execution) | ~3,100 tokens | System + type defs + generated code + results only |

## Key Insight: Deterministic Bridge

Traditional sub-agent patterns are "non-deterministic to non-deterministic" — LLMs coordinating LLMs. Code Mode creates a "non-deterministic to deterministic" bridge — an LLM generates code that executes predictably. This has advantages for debugging, reliability, performance, and security.

## TypeScript Advantages

- **Rich training data**: Vast quantities of high-quality TypeScript in open-source
- **Type safety as guardrails**: Type system constrains LLM toward correct implementations
- **Deterministic execution**: Once code is generated, execution is fully predictable

## Relevance to ultimate-pi

The context efficiency comparison directly supports our token budget goals. The "deterministic bridge" concept aligns with our L4 adversarial verification — generated code that's been verified once is reliable, unlike agent intuition which must be re-verified each turn. The sub-agent pattern limitations validate our move toward a TypeScript execution layer (P43).
