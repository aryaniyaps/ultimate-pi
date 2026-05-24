---
name: naming-and-intent
description: Improve readability through precise names and explicit intent. Use when adding functions, modules, variables, commands, events, errors, tests, or docs. Encourages domain vocabulary, side-effect clarity, consistency, and avoiding vague helper/manager/data names.
---

# Naming and Intent

Use this skill when names carry meaning for future maintainers.

## Naming rules

- Prefer domain vocabulary already used by the project.
- Name by purpose and behavior, not implementation accident.
- Make side effects visible in command/action names.
- Use consistent terms for the same concept.
- Avoid vague names such as manager, helper, util, data, info, item, or handler unless the surrounding code gives them precise meaning.
- Do not rename broadly unless the task is a rename/refactor and verification is available.

## Workflow

1. Identify the concept's role in the domain or system.
2. Search nearby code/docs for existing vocabulary.
3. Pick names that distinguish similar concepts.
4. Ensure tests describe behavior, not implementation detail.
5. Re-read changed code as a sentence: intent should be clear without comments.

## Comments

Use comments to explain non-obvious why, invariants, tradeoffs, and constraints. Do not comment what the code already states clearly.
