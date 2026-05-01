---
type: source
source_type: engineering-blog
author: Birgitta Böckeler (Thoughtworks)
date_published: 2026-04-02
date_accessed: 2026-05-01
url: https://martinfowler.com/articles/harness-engineering.html
confidence: high
key_claims:
  - Harness = everything in agent except the model itself
  - Two control types: Feedforward (guides, prevent) + Feedback (sensors, self-correct)
  - Two execution types: Computational (deterministic, fast) + Inferential (LLM-based, expensive)
  - Three regulation categories: Maintainability, Architecture Fitness, Behaviour
  - The steering loop: human iterates on harness when issues recur
  - Keep quality left: fast checks pre-commit, expensive checks post-integration
  - Harnessability: not every codebase equally amenable. "Ambient affordances" matter.
  - Ashby's Law: regulator must have at least as much variety as system it governs
  - Behaviour harness is the elephant in the room — unresolved
---

# Martin Fowler: Harness Engineering for Coding Agent Users

## What It Is

Canonical framework for harness engineering from Martin Fowler (Thoughtworks). Published April 2, 2026. Supersedes earlier memo from Feb 2026. Defines the mental model for building trust in coding agents through constraints and feedback loops.

## Core Framework

### Feedforward and Feedback

- **Guides (feedforward controls)**: Anticipate agent behaviour, steer before it acts. Increase probability of good first-attempt results.
- **Sensors (feedback controls)**: Observe after agent acts, help it self-correct. Most powerful when signals are optimized for LLM consumption (e.g., custom linter messages with fix instructions).
- Separately: agent repeats mistakes (feedback-only) OR encodes rules never tested (feedforward-only). Both needed.

### Computational vs Inferential

| Type | Computational | Inferential |
|------|--------------|-------------|
| Speed | milliseconds-seconds | seconds-minutes |
| Cost | cheap | expensive |
| Determinism | deterministic | non-deterministic |
| Examples | linters, tests, type checkers | AI code review, "LLM as judge" |
| Run frequency | every change | selectively |

### The Steering Loop

Human iterates on harness. When issue happens multiple times → improve feedforward/feedback controls. Agents can help write harness controls (custom linters, structural tests, how-to guides).

### Regulation Categories

1. **Maintainability harness**: Code quality, conventions. Easiest — lots of pre-existing computational tooling.
2. **Architecture fitness harness**: Fitness functions for architecture characteristics (performance, observability, etc.).
3. **Behaviour harness**: Functional correctness. "Elephant in the room" — AI-generated tests aren't reliable enough yet. Approved fixtures pattern shows promise.

### Harnessability

Not every codebase equally harnessable. Strongly typed languages, clear module boundaries, frameworks that abstract details all increase harnessability. "Ambient affordances" (Ned Letcher): structural properties that make environment legible to agents.

### Harness Templates

Pre-bundled guides + sensors for common service topologies (CRUD business service, event processor, data dashboard). Teams may pick tech stacks based on available harness templates.

## Relevance to Ultimate-PI

Our 8-layer pipeline directly implements Feedforward+Feedback. L1-L2 (Spec Hardening, Planning) are feedforward. L2.5-L4 (Drift, Grounding, Adversarial) are feedback. L5-L8 (Observability, Memory, Orchestration, Query) are the steering loop infrastructure. Our three drift paradigms map to the three regulation categories: Implementation drift = Maintainability, Spec drift = Behaviour, Tool-call drift crosses all three.

Key gap: we don't separate computational vs inferential controls explicitly. Our drift detection is inferential; we could strengthen with computational sensors (custom linters, structural tests).
