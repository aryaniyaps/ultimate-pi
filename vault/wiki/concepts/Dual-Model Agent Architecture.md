---
type: concept
title: "Dual-Model Agent Architecture"
created: 2026-04-30
status: developing
tags:
  - agent-architecture
  - llm
  - ensembling
  - swe-bench
aliases:
  - Two-Model Agent
related:
  - "[[Majority Vote Ensembling]]"
  - "[[Agentic Coding Harness]]"
sources:
  - "[[Augment SWE-bench Agent GitHub]]"
  - "[[Augment SWE-bench Pro Blog]]"
updated: 2026-05-02

---# Dual-Model Agent Architecture

An agent architecture that uses two different LLMs for distinct phases: a fast, capable model for iterative reasoning/ coding, and a more deliberative model for solution selection/verification.

## Augment Code's Implementation

### Phase 1: Core Reasoning (Claude Sonnet 3.7)
- Handles the iterative coding loop: read files, write code, run tests, debug.
- Fast, capable, good at following instructions.
- Runs in a loop with tool access (bash, file edit, sequential thinking).

### Phase 2: Solution Ensembling (OpenAI o1)
- After generating N candidate solutions (typically 8).
- Presents all candidates to o1 with evaluation outcomes.
- o1 analyzes and selects the best solution.
- o1 is slower but more deliberative — better at comparative analysis.

## Why Two Models?

1. **Cost optimization**: Fast model for the 95% of work; expensive model only for selection.
2. **Complementary strengths**: Claude excels at code generation; o1 excels at analysis and comparison.
3. **Error reduction**: Majority vote ensembling catches errors that any single run might miss.
4. **Separation of concerns**: Generation and evaluation use different reasoning patterns.

## Alternative Patterns

### Single-Model Multi-Pass
- Same model generates multiple solutions then self-reviews.
- Simpler but less effective than cross-model ensembling.

### Model Cascade
- Start with fast/cheap model; escalate to stronger model on failure.
- Used by SWE-agent and some production systems.

### Committee of Models
- 3+ different models generate solutions independently.
- Voting or LLM-based selection.

## Implementation for Our Harness

We can implement dual-model architecture as a configurable strategy:
- **Primary model**: Claude (fast, code-capable) for the main agent loop.
- **Ensembler model**: GPT-5 or o1 for solution verification and selection.
- Generate 3-5 candidate solutions, use ensembler to pick best.
- Configurable via harness config.
