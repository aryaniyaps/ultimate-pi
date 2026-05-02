---
type: source
status: ingested
source_type: engineering-blog
title: "Continually Improving Our Agent Harness"
author: "Stefan Heule & Jediah Katz (Cursor/Anysphere)"
date_published: 2026-04-30
url: "https://cursor.com/blog/continually-improving-agent-harness"
confidence: high
tags: [cursor, agent-harness, model-adaptive, context-window, error-classification, keep-rate]
key_claims:
  - "Moved from static guardrails + pre-loaded context to dynamic context discovery"
  - "Keep Rate metric: fraction of agent code still in codebase after time intervals"
  - "LLM-as-judge for user satisfaction from response semantics"
  - "Per-tool per-model error baselines with anomaly detection alerts"
  - "Weekly automated Cloud Agent for bug triage from log analysis"
  - "Model-specific tool provisioning: patch format for OpenAI, string replace for Anthropic"
  - "Mid-chat model switching with conversation summarization"
  - "Context anxiety: one model started refusing work as context window filled"
  - "Subagent pattern: fresh context window per specialized task"
  - "Future: multi-agent orchestration where system dispatches to specialized subagents"
created: 2026-05-02
updated: 2026-05-02
---
# Continually Improving Our Agent Harness

Cursor's April 30, 2026 engineering blog detailing their harness evolution philosophy, measurement systems, error classification, and model-adaptive customization. Most directly relevant source for our harness plan.

## Dynamic Context Evolution

Early Cursor (2024): static context pre-loaded (folder layout, semantic snippets, compressed files) + guardrails (lint surfacing, read rewriting, tool call limits).

Current Cursor (2026): guardrails removed as models improved. Dynamic context fetched by agent on demand. More ways for agent to pull context and interact with the world.

## Measurement: Keep Rate + LLM-as-Judge

**Keep Rate**: For agent-proposed code changes, track what fraction remains in codebase after fixed time intervals (1hr, 1day, 1week). High keep rate = agent did good work.

**LLM-as-Judge**: Language model reads user's responses to agent output to determine satisfaction semantically. Moving to next feature = good. Pasting stack trace = bad.

A/B testing harness variants on real usage. One experiment: more expensive model for context summarization made negligible difference.

## Error Classification System

Every tool call error classified:

| Error Type | Meaning |
|---|---|
| `InvalidArguments` | Model mistake in tool call |
| `UnexpectedEnvironment` | Contradictions in context window |
| `ProviderError` | Vendor outages |
| `UserAborted` | User cancelled |
| `Timeout` | Tool call timed out |
| Unknown | Always a bug |

Alerts fire on unknown error threshold. Anomaly detection for expected errors vs per-tool per-model baseline.

Weekly Cloud Agent Automation: searches logs, surfaces new/spiked issues, creates/updates tickets with investigation.

## Model-Adaptive Customization

- OpenAI models: patch-based edit format
- Anthropic models: string replacement format
- Custom prompting per provider AND per model version
- Mid-chat model switching: auto-switch harness, summarize conversation, warn about tool set differences
- Subagent pattern: fresh context window per specialized task (planning, editing, debugging)

## Context Anxiety

One model developed "context anxiety": as context window filled, it started refusing work, hedging that tasks seemed too big. Mitigated through prompt adjustments. Independent validation of our P27 Context Anxiety Guard concept.

## Relevance to Harness

**Directly validates**: model-adaptive harness design, provider-native prompting, context anxiety guard (P27), L5 observability need, drift monitor need.

**New gaps identified**: Keep Rate metric missing from L5, per-tool per-model error classification missing, subagent specialization beyond cost routing missing, autonomous harness self-repair (Cloud Agent for harness bugs) missing.
