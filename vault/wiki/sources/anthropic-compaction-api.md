---
type: source
source_type: official-docs
title: "Anthropic Context Compaction API (Beta)"
author: Anthropic
date_published: 2026-01-12
date_accessed: 2026-05-05
url: "https://docs.anthropic.com/en/docs/build-with-claude/compaction"
confidence: high
tags:
  - anthropic
  - claude
  - compaction
  - api
  - context-management
key_claims:
  - "Server-side automatic summarization when input tokens exceed threshold"
  - "Beta, launched January 2026, header: compact-2026-01-12"
  - "Supported models: Claude Mythos Preview, Opus 4.7, Opus 4.6, Sonnet 4.6"
  - "Creates compaction block, drops all prior messages on next request"
  - "ZDR (Zero Data Retention) eligible"
  - "Context Folding available as first-class API primitive in context-management"
---

# Anthropic Context Compaction API

## Summary

Anthropic released a server-side context compaction API in beta (January 2026). When enabled, the API automatically detects when input tokens exceed a configurable threshold, generates a summary, creates a `compaction` block, and drops all prior messages on the next request.

## How It Works

1. Add `compact_20260112` to `context_management.edits` in Messages API request
2. Include beta header `compact-2026-01-12`
3. API detects when tokens exceed trigger threshold
4. Generates summary → creates compaction block → continues response
5. Subsequent requests automatically drop all pre-compaction messages

## Supported Models

- Claude Mythos Preview
- Claude Opus 4.7
- Claude Opus 4.6
- Claude Sonnet 4.6

## Ideal Use Cases

- Long-running chat conversations
- Tool-heavy agentic workflows
- Multi-turn conversations exceeding context limits

## Relevance to pi-vcc

This is Anthropic's official take on compaction — LLM-based, server-side, automatic. It validates that compaction is a first-class concern. However, it has all the failure modes pi-vcc avoids: non-deterministic, no recall, LLM cost. Pi could theoretically use this API as a backend for its compaction, but pi-vcc's deterministic approach remains architecturally distinct.

## Context Folding

Context Folding (arXiv 2510.11967) is now available as a first-class API primitive in Anthropic's beta context-management. Agents can branch/return sub-trajectories, with intermediate steps "folded" away.
