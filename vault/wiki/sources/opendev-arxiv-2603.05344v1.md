---
type: source
source_type: academic-paper
author: "Nghi D. Q. Bui (OpenDev)"
date_published: 2026-03-05
url: https://arxiv.org/html/2603.05344v1
confidence: high
tags:
  - terminal-agents
  - context-engineering
  - agent-architecture
  - safety
  - multi-model
key_claims:
  - "OpenDev is the first comprehensive technical report for an open-source, terminal-native, interactive coding agent"
  - "Compound AI system architecture with per-workflow LLM binding (action, thinking, critique, vision, compact models)"
  - "Defense-in-depth safety with 5 independent layers: prompt guardrails, schema gating, runtime approval, tool validation, lifecycle hooks"
  - "Adaptive Context Compaction (ACC) with 5 graduated stages reduces peak context consumption by ~54%"
  - "Event-driven system reminders counteract instruction fade-out in long-running sessions"
  - "Dual-agent architecture separating planning from execution via schema-level tool restrictions"
---

# Building AI Coding Agents for the Terminal: Scaffolding, Harness, Context Engineering, and Lessons Learned

arXiv:2603.05344v1 — March 2026. OpenDev technical report by Nghi D. Q. Bui.

## Core Architecture

Four-layer system: Entry & UI → Agent → Tool & Context → Persistence.

### Scaffolding vs Harness
- **Scaffolding**: System prompt compilation, tool schema building, subagent registration — runs once before first prompt
- **Harness**: Runtime orchestration — tool dispatch, context management, safety enforcement, session persistence

### Compound AI System
Five model roles with fallback chains:
1. **Action model** — primary execution, tool-based reasoning
2. **Thinking model** — extended reasoning without tool access (prevents premature action)
3. **Critique model** — self-evaluation (Reflexion-inspired, selective)
4. **Vision model** — screenshots/images
5. **Compact model** — fast summarization during compaction

### Extended ReAct Loop
Four phases per iteration:
- **Phase 0**: Staged context management (5 thresholds: 70%→80%→85%→90%→99%)
- **Phase 1**: Thinking (4 depth levels, HIGH includes self-critique)
- **Phase 2**: Action (LLM with full tool schemas)
- **Phase 3**: Decision/dispatch with doom-loop detection (MD5 fingerprinting, 3-repeat threshold)

## Context Engineering Highlights

### Adaptive Context Compaction (ACC)
Five graduated stages: Warning (70%) → Observation Masking (80%) → Fast Pruning (85%) → Aggressive Masking (90%) → Full Compaction (99%). Each stage applies progressively aggressive reduction.

### System Reminders
24 named reminders organized into 6 categories. Injected as `role: user` messages at maximum recency. Governed by guardrail counters (one-shot flags, attempt budgets). Addresses attention-decay where agents violate instructions after 30+ tool calls.

### Dual-Memory Architecture
- **Episodic memory**: LLM-generated summary of full history (regenerated every 5 messages from full history to prevent drift)
- **Working memory**: Last 6 exchanges verbatim for operational detail

## Safety Architecture (Defense-in-Depth)

1. **Prompt-Level Guardrails** — security policy in system prompt
2. **Schema-Level Tool Restrictions** — plan-mode whitelist, per-subagent allowed_tools
3. **Runtime Approval System** — Manual/Semi-Auto/Auto levels, pattern/command/prefix/danger rules
4. **Tool-Level Validation** — DANGEROUS_PATTERNS blocklist, stale-read detection, output truncation
5. **Lifecycle Hooks** — pre-tool blocking (exit code 2), argument mutation, JSON stdin protocol

Key insight: "Make unsafe tools invisible, not blocked" — removing tools from schema is more robust than runtime permission checks.

## Lessons for Our Harness

- Separate thinking from action (tool-free thinking phase produces better reasoning)
- Inject reminders at decision points, not upfront (use `role: user`)
- Treat context as a budget with graduated reduction (not binary emergency compaction)
- Schema gating > runtime permission checks for safety
- Design tools to absorb LLM imprecision (9-pass fuzzy edit matching chain)
- Bound every resource that grows with session length (iteration caps, nudge budgets, undo history)
