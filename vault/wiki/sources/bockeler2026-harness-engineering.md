---
type: source
source_type: blog
title: "Harness Engineering for Coding Agent Users"
author: "Birgitta Böckeler, Martin Fowler"
date_published: 2026-04-02
url: "https://martinfowler.com/articles/harness-engineering.html"
confidence: high
key_claims:
  - "Feedforward (guides) + Feedback (sensors) = harness control framework"
  - "Computational controls: deterministic, fast (tests, linters, type checkers)"
  - "Inferential controls: semantic, probabilistic (AI code review, LLM-as-judge)"
  - "Three regulation categories: Maintainability, Architecture Fitness, Behaviour"
  - "Behavioural harness (functional correctness) remains unsolved"
  - "Ashby's Law: harness must match system variety; topologies reduce variety"
tags:
  - harness
  - feedforward
  - feedback
  - martin-fowler
  - maintainability
created: 2026-04-30
updated: 2026-04-30
status: ingested
---

# Harness Engineering for Coding Agent Users

Birgitta Böckeler, Martin Fowler. April 2026.

## The Framework

### Feedforward Controls (Guides)
Anticipate agent behavior, steer BEFORE it acts:
- AGENTS.md, skills, rules, how-to guides
- Language servers, CLIs, scripts, codemods

### Feedback Controls (Sensors)
Observe AFTER agent acts, enable self-correction:
- AI code review agents
- Static analysis, linters, logs, browser testing

### Computational vs Inferential

| Type | Speed | Reliability | Examples |
|------|-------|-------------|----------|
| Computational | ms-sec | Deterministic | Tests, linters, type checkers, structural analysis |
| Inferential | sec-min | Probabilistic | AI code review, LLM-as-judge, semantic analysis |

## Three Regulation Categories

1. **Maintainability Harness**: Internal code quality. Computational sensors catch structural issues reliably. LLMs partially address semantic issues but expensively.

2. **Architecture Fitness Harness**: Architecture characteristics. Fitness functions + observability standards.

3. **Behaviour Harness**: Functional correctness. **THE UNSOLVED PROBLEM.** Current approach (AI-generated tests + manual testing) insufficient.

## Harnessability

Not every codebase is equally harnessable. Strongly typed languages, clear module boundaries, framework abstractions increase harnessability. "Ambient affordances" — structural properties that make the environment legible to agents.

## Harness Templates

Pre-bundled guides + sensors for service topologies (CRUD, event processor, data dashboard). Ashby's Law: topology narrows the solution space, making comprehensive harnesses achievable.

## Key Insight

> "The human's job is to STEER the agent by iterating on the harness. Whenever an issue happens multiple times, the feedforward and feedback controls should be improved."

Harness engineering is an ongoing practice, not a one-time configuration.
