---
name: domain-modeling
description: Model business rules and domain concepts clearly. Use when adding features with domain behavior, invariants, workflows, policies, state transitions, commands, queries, or user/business terminology. Helps agents place rules correctly and avoid data-bag implementations.
---

# Domain Modeling

Use this skill when correctness depends on business meaning, not just data movement.

## Workflow

1. Extract domain language from requirements, existing code, tests, and docs.
2. Identify core concepts, actors, actions, policies, and invariants.
3. Distinguish commands that change state from queries that observe state.
4. Place invariants in the domain/core path, not only in UI or transport boundaries.
5. Represent meaningful values explicitly rather than passing ambiguous primitives everywhere.
6. Keep persistence and transport concerns separate from domain decisions.
7. Test domain rules directly where possible.

## Modeling prompts

- What must always be true?
- What state transitions are allowed or forbidden?
- Who is allowed to perform this action?
- What terms does the business use for this concept?
- Is this a rule, a calculation, a workflow, or mere data storage?

## Avoid

- Anemic data containers when behavior has rules.
- Duplicating the same rule in multiple adapters.
- Naming domain concepts after technical implementation details.
