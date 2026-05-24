---
name: tradeoff-analysis
description: Make engineering tradeoffs explicit before choosing an implementation. Use when multiple viable approaches exist or when simplicity, maintainability, performance, reliability, compatibility, security, and delivery speed conflict. Chooses the least-worst option with rationale.
---

# Tradeoff Analysis

Use this skill when there is no single obviously best approach.

## Workflow

1. State the decision to make.
2. List forces: correctness, simplicity, maintainability, performance, reliability, scalability, security, compatibility, cost, delivery speed, and operability.
3. Identify two or three realistic options.
4. Compare each option against the forces and project constraints.
5. Choose the least-worst option for the current context.
6. Record why rejected options were not chosen when the decision matters.
7. Keep the implementation aligned with the chosen tradeoff.

## Output shape

- Decision:
- Constraints:
- Options:
- Chosen approach:
- Why:
- Risks:
- Verification:

## Avoid

- Generic best-practice claims without project context.
- Optimizing for future scale without evidence.
- Choosing complexity because it feels more professional.
