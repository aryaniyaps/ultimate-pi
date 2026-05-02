---
type: concept
title: "Harness Engineering First Principles"
created: 2026-05-01
updated: 2026-05-01
status: stable
tags:
  - harness
  - first-principles
  - architecture
related:
  - "[[harness-implementation-plan]]"
  - "[[harness]]"
  - "[[harness-control-frameworks]]"
sources:
  - "[[Source: Martin Fowler - Harness Engineering]]"
  - "[[Source: LangChain - Anatomy of Agent Harness]]"
  - "[[Source: OpenAI Harness Engineering Five Principles]]"
  - "[[Source: Augment - Harness Engineering for AI Coding Agents]]"

---# Harness Engineering: First Principles

## Core Definition

**Agent = Model + Harness.** (LangChain, 2026)

The harness is every piece of code, configuration, and execution logic that isn't the model itself. A raw model is not an agent. It becomes one when a harness gives it state, tool execution, feedback loops, and enforceable constraints.

## First Principles (Synthesized from All Sources)

### P1: Feedforward + Feedback
Every harness control is either a **guide** (feedforward: anticipate, prevent) or a **sensor** (feedback: observe, self-correct). Both are required — feedforward-only encodes rules never tested; feedback-only repeats mistakes. Source: [[Source: Martin Fowler - Harness Engineering]]

### P2: Computational > Inferential (for Enforcement)
Computational controls (linters, type checkers, structural tests) are deterministic, fast, and cheap. Inferential controls (AI code review, LLM-as-judge) are probabilistic, slow, and expensive. Prefer computational for enforcement; use inferential for discovery and guidance. Source: [[Source: Martin Fowler - Harness Engineering]]

### P3: Mechanical Enforcement Over Documentation
Documentation alone cannot keep agent-generated code consistent. Invariant rules must be enforced mechanically (linters, structural tests, CI gates). The linters themselves can be written by agents. Source: [[Source: OpenAI Harness Engineering Five Principles]]

### P4: What the Agent Can't See Doesn't Exist
All decisions, context, architecture, and conventions must live in the repository as structured documents (markdown, schemas, plans). Tacit knowledge, Slack decisions, Google Docs — invisible to agent = nonexistent. Source: [[Source: OpenAI Harness Engineering Five Principles]]

### P5: Ask What Capability Is Missing
When agent fails, ask "what capability is missing from the environment?" — not "why is the agent failing?" Reframe from prompting harder to instrumenting better. Source: [[Source: OpenAI Harness Engineering Five Principles]]

### P6: Give the Agent Eyes
Connect observability, browser automation, logs, metrics directly to agent runtime. Prompts like "make service start under 800ms" become executable when agent can query metrics. Source: [[Source: OpenAI Harness Engineering Five Principles]]

### P7: A Map, Not a Manual
Context must be a bird's-eye view (what rarely changes), not exhaustive documentation. State architectural boundaries as "something does not exist here" rather than long descriptions. Source: [[Source: OpenAI Harness Engineering Five Principles]]

### P8: Keep Quality Left
Distribute checks across development timeline by cost/speed/criticality. Fast checks pre-commit (linters, fast tests). Expensive checks post-integration (mutation testing, broad code review). Continuous drift sensors run outside change lifecycle. Source: [[Source: Martin Fowler - Harness Engineering]]

### P9: Progressive Disclosure
Too many tools/skills loaded at context start degrades performance. Load capabilities on-demand via activation mechanism. Skills solve context rot through progressive disclosure. Source: [[Source: LangChain - Anatomy of Agent Harness]]

### P10: The Steering Loop
Human iterates on harness. When issue recurs → improve feedforward/feedback controls. Agents can help write harness controls (custom linters, structural tests, how-to guides). Source: [[Source: Martin Fowler - Harness Engineering]]

### P11: Model-Harness Independence
Best harness for a task may NOT be the one a model was post-trained with. Co-evolution creates overfitting to specific tool logic. Test model-harness combinations independently. Source: [[Source: LangChain - Anatomy of Agent Harness]]

### P12: Ashby's Law of Requisite Variety
Regulator must have at least as much variety as system it governs. Committing to predefined topologies (harness templates) reduces variety, making comprehensive harness achievable. Source: [[Source: Martin Fowler - Harness Engineering]]

## Three Regulation Dimensions

1. **Maintainability**: Code quality, conventions, structure. Easiest — pre-existing computational tooling.
2. **Architecture Fitness**: Performance, observability, security characteristics. Fitness functions.
3. **Behaviour**: Functional correctness. Hardest — AI-generated tests unreliable. "Elephant in the room."

Source: [[Source: Martin Fowler - Harness Engineering]]

## How Ultimate-PI Maps

| Principle | Ultimate-PI Implementation |
|-----------|---------------------------|
| P1 Feedforward + Feedback | L1-L2 (feedforward), L2.5-L4 (feedback) |
| P2 Computational > Inferential | Phase 16 Lint Gate (computational), L4 Adversarial (inferential) |
| P3 Mechanical Enforcement | Planned P-F1 (pre-execution policy gates) |
| P4 Visibility | L3 Grounding (Gitingest + ck + wiki) |
| P5 Capability Thinking | Tool-first approach (ck, pi-lean-ctx, pi-messenger) |
| P6 Agent Eyes | L5 Observability (lacks browser/CDP — P-F7) |
| P7 Map Not Manual | wiki/overview.md + index.md (lacks formal ARCHITECTURE.md) |
| P8 Keep Quality Left | Phased pipeline (L1→L8) with drift at multiple points |
| P9 Progressive Disclosure | `.pi/skills/` (lacks formal activation — P-F2) |
| P10 Steering Loop | L7 Archon + L8 Wiki Query + wiki/log.md |
| P11 Model-Harness Independence | 4 model profiles × 4 config layers |
| P12 Ashby's Law | Not yet applied (no harness templates) |
