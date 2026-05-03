---
type: concept
title: "Context-Aware System Reminders"
created: 2026-05-03
updated: 2026-05-03
status: developing
tags:
  - context-engineering
  - long-horizon
  - behavioral-steering
  - attention-decay
related:
  - "[[context-engineering]]"
  - "[[context-anxiety]]"
  - "[[Source: OpenDev — Building AI Coding Agents for the Terminal]]"
sources:
  - "[[Source: OpenDev — Building AI Coding Agents for the Terminal]]"

---# Context-Aware System Reminders

A mechanism for **counteracting instruction fade-out** in long-running agent sessions. From OpenDev ([Section 2.3.4](https://arxiv.org/html/2603.05344v1#S2.SS3.SSS4)). The core problem: after 30+ tool calls, agents silently stop following system prompt instructions — even though the instructions are still in the context window.

## How It Works

Instead of putting all instructions in the system prompt (which sits at the conversation's beginning and loses influence over time), inject **short, targeted reminders at the exact point of decision**.

Each reminder is a brief `role: user` message placed at maximum recency in the conversation, immediately before the next LLM call. The model treats it as "something that just happened requiring a response."

## Event Detectors

Eight conditions trigger reminders:
- Tool failure without retry (6 error-specific templates)
- Exploration spiral (5+ consecutive reads)
- Denied tool re-attempts
- Premature completion with incomplete todos
- Continued work after all todos done
- Plan approval without follow-through
- Unprocessed subagent results
- Empty completion messages

## Guardrail Counters

Each reminder type has a counter or one-shot flag to prevent degenerating into noise:
- Incomplete-todo nudges: max 2
- Error-recovery nudges: max 3
- Plan-approved, all-todos-complete, completion-summary: fire exactly once

## Why role: user beats role: system

Early experiments with `role: system` injection confirmed: user-role reminders produced noticeably higher compliance rates. After 40 turns, another system message blends into the background. A user message appears at the position of highest recency — the model treats it as something demanding a response.

## Relevance to Our Harness

Our harness's instruction drift is a known problem in long sessions. System reminders provide a lightweight, targeted mechanism:
1. Catalog our failure modes (what instructions does our agent stop following?)
2. Create a reminder template for each
3. Detect the triggering condition at iteration boundaries
4. Inject at decision point with `role: user`
5. Cap frequency to prevent noise

This is **cheaper than context resets** and **more targeted than full system prompt re-injection**.
