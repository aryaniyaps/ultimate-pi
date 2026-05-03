---
type: synthesis
title: "Research: Automating Software Engineering — Practices from Lovable, Bolt, Emergent, Rocket"
created: 2026-05-03
updated: 2026-05-03
tags:
  - research
  - ai-coding
  - harness
  - multi-agent
  - platform
  - context-engineering
status: developing
related:
  - "[[Lovable (company)]]"
  - "[[Bolt.new (StackBlitz)]]"
  - "[[Rocket.new]]"
  - "[[Emergent Labs]]"
  - "[[Source: Lovable Architecture & Clone Analysis]]"
  - "[[Source: Bolt.new Architecture & Case Study]]"
  - "[[Source: Rocket.new — Vibe Solutioning Platform]]"
  - "[[Source: OpenAI Harness Engineering — 0 Lines of Human Code]]"
  - "[[Source: OpenDev — Building AI Coding Agents for the Terminal]]"
  - "[[generator-evaluator-architecture]]"
  - "[[context-engineering]]"
  - "[[progressive-disclosure-agents]]"
  - "[[multi-agent-AI-coding-architecture]]"
  - "[[Context-Aware System Reminders]]"
  - "[[anthropic2026-harness-design]]"
sources:
  - "[[Source: Lovable Architecture & Clone Analysis]]"
  - "[[Source: Bolt.new Architecture & Case Study]]"
  - "[[Source: Rocket.new — Vibe Solutioning Platform]]"
  - "[[Source: OpenAI Harness Engineering — 0 Lines of Human Code]]"
  - "[[Source: OpenDev — Building AI Coding Agents for the Terminal]]"
  - "[[anthropic2026-harness-design]]"
---

# Research: Automating Software Engineering — Practices from Lovable, Bolt, Emergent, Rocket

## Overview

Four platforms (Lovable, Bolt.new, Emergent Labs, Rocket.new) are attacking full-stack software engineering automation from different angles. Lovable and Bolt.new focus on **prompt-to-production web apps** with browser-based execution. Rocket.new adds **pre-build strategy** ("vibe solutioning"). Emergent builds **autonomous coding agents**. Combined with deep engineering reports from OpenAI (Codex) and Anthropic (harness design), clear first-principles patterns emerge for building an AI coding harness.

## Key Findings

### 1. Multi-Agent Architecture Is Universal
Every successful platform decomposes work across specialized agents. Lovable's clone architecture uses **Planner → Architect → Coder** with Pydantic-typed handoffs. Anthropic uses **Planner → Generator → Evaluator** with sprint contracts. OpenAI Codex uses **agent-to-agent review loops** (Ralph Wiggum pattern). OpenDev uses **dual-agent separation** (thinking vs execution) with subagent spawning. The pattern: **don't make one agent do everything**. (Source: [[Source: Lovable Architecture & Clone Analysis]], [[anthropic2026-harness-design]], [[Source: OpenAI Harness Engineering — 0 Lines of Human Code]], [[Source: OpenDev — Building AI Coding Agents for the Terminal]])

### 2. Environment Control Is the Moat
Bolt.new's key differentiator: **WebContainers give AI complete control** over filesystem, node server, package manager, terminal, and browser console. This is what turned Claude from a code suggester into an app builder. OpenAI replicated this: Codex drives apps via Chrome DevTools Protocol, has its own ephemeral observability stack per worktree. Bolt hit $4M ARR in 4 weeks after adding Claude + WebContainers. (Source: [[Source: Bolt.new Architecture & Case Study]], [[Source: OpenAI Harness Engineering — 0 Lines of Human Code]])

### 3. Structured Outputs Prevent Chaos
The Lovable clone's key insight: moving from text-based AI interactions to **Pydantic-validated structured outputs** transforms AI from demo to production. Each agent receives validated objects, not messy text. OpenAI enforces architectural boundaries mechanically via custom linters — "enforce invariants, not micromanage implementations." OpenDev uses schema-level tool gating: make dangerous tools invisible to the agent, not just blocked. (Source: [[Source: Lovable Architecture & Clone Analysis]], [[Source: OpenAI Harness Engineering — 0 Lines of Human Code]], [[Source: OpenDev — Building AI Coding Agents for the Terminal]])

### 4. Context Engineering Is the Central Constraint
OpenAI's finding: **"Context is a scarce resource."** A giant AGENTS.md file crowds out the task. Instead: short AGENTS.md as table of contents pointing to a structured `docs/` directory. OpenDev implements 5-stage adaptive compaction (70%→99% thresholds), dual-memory architecture (episodic + working memory), event-driven system reminders at decision points. Anthropic found that context resets (not just compaction) are necessary when models exhibit "context anxiety." (Source: [[Source: OpenDev — Building AI Coding Agents for the Terminal]], [[Source: OpenAI Harness Engineering — 0 Lines of Human Code]], [[anthropic2026-harness-design]])

### 5. Repository Knowledge as System of Record
OpenAI's framing: **"What Codex can't see doesn't exist."** All knowledge must live in the repository — not in Slack threads, Google Docs, or people's heads. Design docs, execution plans, quality scores are all versioned and co-located with code. Dedicated "doc-gardening" agents scan for stale documentation. Rocket.new takes this further: **one shared context across strategy → build → competitive intelligence.** (Source: [[Source: OpenAI Harness Engineering — 0 Lines of Human Code]], [[Source: Rocket.new — Vibe Solutioning Platform]])

### 6. "Code Generation Is a Commodity" — The Pre-Build Layer Matters
Rocket.new's thesis: everyone can generate code now. The missing piece is **deciding what to build and tracking what happens after.** Their platform covers the full arc: market research → product strategy → app building → competitive intelligence. Raised $15M, 1.5M users across 180 countries. Pricing: $25-$350/month, with consulting-style reports at $250 tier. (Source: [[Source: Rocket.new — Vibe Solutioning Platform]])

### 7. Generator-Evaluator Loop (GAN-Inspired)
Anthropic's breakthrough: separating generator from evaluator. Agents "confidently praise their own mediocre work" — but tuning a standalone evaluator to be skeptical works. Each criterion has a hard threshold — fall below any, sprint fails. The evaluator uses Playwright to actually click through the app. OpenAI does the same at scale: "Codex reviews its own changes locally, requests additional agent reviews, responds to feedback, iterates in a loop until all agent reviewers are satisfied." (Source: [[anthropic2026-harness-design]], [[Source: OpenAI Harness Engineering — 0 Lines of Human Code]])

### 8. Progressive Disclosure: Maps, Not Encyclopedias
OpenAI tried the "one big AGENTS.md" approach. It failed: context scarcity, too much guidance becomes non-guidance, rots instantly, hard to verify. Instead: **short AGENTS.md (∼100 lines) as table of contents**, pointing to a structured `docs/` directory. OpenDev implements conditional prompt composition: sections load only when contextually relevant (e.g., git workflow section only in git repos). Skills use 2-phase loading: metadata index at startup, full content on-demand. (Source: [[Source: OpenAI Harness Engineering — 0 Lines of Human Code]], [[Source: OpenDev — Building AI Coding Agents for the Terminal]])

### 9. "No Manually-Written Code" Philosophy
OpenAI Codex built a product with **0 lines of human-written code** over 5 months, ∼1 million lines, ∼1,500 PRs, with 3-7 engineers. Humans steer, agents execute. Engineers became systems designers: building scaffolding, guardrails, and feedback loops. Codex wrote even its own AGENTS.md. This required redefining the engineer's role entirely. (Source: [[Source: OpenAI Harness Engineering — 0 Lines of Human Code]])

### 10. Garbage Collection for AI Slop
OpenAI's finding: agents replicate existing patterns — including bad ones. Initially spent Fridays (20% of week) cleaning "AI slop." Solution: encode "golden principles" mechanically, run recurring background cleanup agents, enforce continuously. Technical debt treated as "high-interest loan" — pay continuously in small increments. (Source: [[Source: OpenAI Harness Engineering — 0 Lines of Human Code]])

## Key Entities

- **[[Lovable (company)]]**: Full-stack AI dev platform (formerly GPT Engineer). SOC 2, ISO 27001. Browser-based with GitHub sync. "Orchestration layer, not just models."
- **[[Bolt.new (StackBlitz)]]**: Browser-based AI web dev. WebContainers + Claude. 0→$4M ARR in 4 weeks. Open source. Remix + Radix UI + UnoCSS.
- **[[Rocket.new]]**: "Vibe Solutioning" platform: strategy + building + competitive intel. $15M seed. 1.5M users. Based in Surat, India.
- **[[Emergent Labs]]**: YC S24. "Autonomous coding agents that replace traditional software development." Building full-stack web & mobile apps from conversation.

## Key Concepts

- **[[generator-evaluator-architecture]]**: GAN-inspired multi-agent pattern. Generator builds, evaluator grades against explicit criteria.
- **[[Context-Aware System Reminders]]**: Event-driven injection of behavioral guidance at decision points. Addresses attention-decay in long sessions.
- **[[progressive-disclosure-agents]]**: Give agents maps (short AGENTS.md as ToC), not encyclopedias. Load details on-demand.
- **[[multi-agent-AI-coding-architecture]]**: Planner → Architect → Coder pattern with structured handoffs.

## Contradictions

- **Anthropic says context resets are essential** for Sonnet 4.5 due to "context anxiety." **OpenAI says compaction + progressive disclosure** works for Codex. OpenDev uses **5-stage compaction, not resets.** The difference may be model-specific — Opus 4.6 eliminated the need for resets per Anthropic.
- **Rocket.new says code generation is commoditized** — the frontier is pre-build strategy. **Lovable and Bolt.new** are still competing aggressively on code generation quality. The market hasn't fully shifted yet.
- **OpenAI enforces architecture mechanically** (linters, structural tests). **Anthropic uses prompting + evaluator contracts**. Both work; the OpenAI approach is more robust but requires more upfront investment.

## Open Questions

- How does the planner-generator-evaluator loop scale to existing large codebases (not greenfield apps)? All current demos are new projects.
- Can "sprint contracts" work for bug fixing and refactoring, not just feature building?
- When does the evaluator become unnecessary? Anthropic says as models improve, the boundary moves. How to automatically detect when?
- How to adapt context management strategies (compaction vs resets) per model, automatically?
- Can Rocket.new's "vibe solutioning" pre-build layer be integrated into a coding harness to automate scope definition?

## Sources

- [[Source: Lovable Architecture & Clone Analysis]]: Multi-agent architecture, structured outputs, LangGraph + Groq
- [[Source: Bolt.new Architecture & Case Study]]: WebContainers, Claude integration, Remix frontend, $4M ARR
- [[Source: Rocket.new — Vibe Solutioning Platform]]: Strategy → Build → Intelligence, $15M seed, 1.5M users
- [[Source: OpenAI Harness Engineering — 0 Lines of Human Code]]: Codex, architectural constraints, progressive disclosure, garbage collection
- [[Source: OpenDev — Building AI Coding Agents for the Terminal]]: Compound AI, dual-agent, adaptive compaction, system reminders
- [[anthropic2026-harness-design]]: GAN-inspired harness, generator-evaluator loop, sprint contracts
