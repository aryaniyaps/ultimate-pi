---
name: routine-function-design
description: Design clear routines, functions, methods, or procedures. Use when adding or restructuring executable units. Guides single purpose, parameter discipline, pre/postconditions, command-query separation, nesting control, and side-effect clarity in a language-agnostic way.
---

# Routine / Function Design

Use this skill when creating or changing a callable unit.

## Design checklist

- One clear purpose.
- Name communicates the result or action.
- Parameters are minimal and cohesive.
- Preconditions and postconditions are explicit or obvious.
- Side effects are intentional and visible.
- Return shape is predictable.
- Error behavior matches caller expectations.
- Nesting and branching stay readable.

## Workflow

1. Decide whether the routine is a command, query, calculation, policy, coordinator, or adapter call.
2. Keep pure calculations separate from IO and mutation where practical.
3. Pass cohesive concepts instead of long unrelated parameter lists.
4. Extract nested decision logic only when the extracted name adds meaning.
5. Test edge cases around boundaries and invariants.

## Avoid

- Boolean flags that create multiple hidden behaviors.
- Hidden reliance on global or ambient state.
- Routines that both decide policy and perform unrelated IO.
- Clever compression that obscures intent.
