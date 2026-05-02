---
type: concept
title: "Generator-Evaluator Architecture"
created: 2026-04-30
updated: 2026-04-30
status: seed
tags:
  - harness
  - multi-agent
  - evaluator
  - generator
  - adversarial
related:
  - "[[adversarial-verification]]"
  - "[[consensus-debate]]"
  - "[[agentic-harness]]"
sources:
  - "[[anthropic2026-harness-design]]"

---# Generator-Evaluator Architecture

A GAN-inspired multi-agent pattern where an evaluator agent grades a generator agent's output against explicit criteria. From Anthropic's harness design work (Rajasekaran, 2026).

## Core Pattern

```
Generator ──produces──► Output
                           │
                           ▼
Evaluator ◄──tests────────┘
    │
    ├─ Grade against criteria
    ├─ Write detailed critique
    └─ Feedback → Generator (next iteration)
```

## Why Separate Generator and Evaluator

**Fundamental finding**: When asked to evaluate their own work, agents "respond by confidently praising the work — even when, to a human observer, the quality is obviously mediocre." Separating the two roles solves this. Tuning a standalone evaluator to be skeptical is far more tractable than making a generator critical of its own work.

## Evaluator Tuning

Claude is "a poor QA agent out of the box" — identifies legitimate issues, then talks itself into deciding they aren't a big deal. Requires explicit tuning loop:
1. Read evaluator logs
2. Find examples where its judgment diverges from human judgment
3. Update QA prompt to solve for those issues
4. Repeat until evaluator grades reasonably

## Sprint Contracts

Before writing code, generator and evaluator negotiate a contract:
- Generator proposes what it will build and how success will be verified
- Evaluator reviews proposal to ensure it builds the right thing
- Iterate until agreement
- Generator builds against the agreed-upon contract
- Communication via files

## Relevance to Our Harness

Our L4 (Adversarial Verification) maps to the evaluator role, but with one critical gap: we lack **explicit grading criteria with hard thresholds**. Our critics give narrative feedback, not falsifiable pass/fail on specific criteria. The sprint contract pattern (agree on "done" before code) could be integrated at L2 (plan review) before L3 execution.

## When Is It Worth It?

The evaluator is worth the cost when the task sits beyond what the current model does reliably solo. As models improve, the boundary moves — tasks that used to need evaluation may not anymore. The evaluator is not a fixed yes/no decision.
