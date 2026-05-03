---
type: source
source_type: article
author: "Birgitta Böckeler (Thoughtworks)"
date_published: 2026-04-02
url: https://martinfowler.com/articles/harness-engineering.html
confidence: high
tags:
  - harness-engineering
  - context-engineering
  - agent-trust
  - feedback-loops
key_claims:
  - "Agent = Model + Harness. A harness is everything in an AI agent except the model itself"
  - "Feedforward guides (before action) + Feedback sensors (after action) form the steering loop"
  - "Computational controls (deterministic, fast) vs Inferential controls (LLM-based, semantic)"
  - "Three regulation categories: Maintainability, Architecture Fitness, Behaviour"
  - "The human's job is to steer the agent by iterating on the harness"
  - "Harness templates can encode topologies (CRUD service, event processor, data dashboard)"
---

# Harness Engineering for Coding Agent Users

Martin Fowler blog — April 2026. By Birgitta Böckeler, Distinguished Engineer at Thoughtworks.

## Core Mental Model

**Agent = Model + Harness**. The harness is everything except the model: system prompts, tools, feedback loops, approval gates, context management.

Three concentric circles:
1. **Model** (core)
2. **Builder harness** (coding agent's built-in infrastructure)
3. **User harness** (what we build — guides + sensors specific to our use case)

## Feedforward and Feedback

| Direction | Purpose | Examples |
|-----------|---------|----------|
| **Feedforward (Guides)** | Steer agent *before* it acts | AGENTS.md, Skills, coding conventions, architecture docs |
| **Feedback (Sensors)** | Observe *after* agent acts, enable self-correction | Linters, tests, review agents, type checkers |

Two execution types:
- **Computational**: Deterministic, fast (tests, linters, type checkers, structural analysis)
- **Inferential**: LLM-based, semantic (AI code review, "LLM as judge")

## The Steering Loop

Human's role: Iterate on the harness. When issues recur, improve feedforward guides or feedback sensors to make them less probable. Agents can help build harness components (write structural tests, generate linter rules, create how-to guides).

## Three Regulation Categories

1. **Maintainability Harness**: Code quality, style, complexity, test coverage. Computational sensors catch structural issues reliably. LLMs partially address semantic judgment (duplicate code, brute-force fixes) but expensively.
2. **Architecture Fitness Harness**: Performance requirements, logging standards, observability. Fitness functions as feedback sensors.
3. **Behaviour Harness**: Functional correctness. The hardest category — still relies heavily on human review and manual testing. AI-generated tests put too much faith in AI.

## Key Timing Principle: Keep Quality Left

Checks distributed across the change lifecycle by cost and speed:
- **Pre-commit**: Linters, fast tests, basic code review agent
- **Post-integration pipeline**: Mutation testing, broad architecture review
- **Continuous**: Dead code detection, dependency scanning, SLO monitoring

## Harness Templates

For enterprises with common service topologies (CRUD APIs, event processors, dashboards), harness templates bundle guides + sensors for each topology. Teams pick tech stacks partly based on available harnesses.

## Relevance to Our Harness

- Our `.pi/skills/` system implements feedforward guides
- Our `wiki-lint` and `posthog-analyst` skills implement inferential feedback sensors
- The steering loop is what we're building: improve harness as agents make mistakes
- We need computational sensors: pre-commit hooks, structural tests, architecture fitness checks
- Harness templates are our `lean-ctx` and `wiki` patterns — reusable across projects
