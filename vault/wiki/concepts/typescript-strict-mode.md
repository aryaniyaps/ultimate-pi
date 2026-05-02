---
type: concept
status: developing
tags:
  - typescript
  - strict-mode
  - type-safety
related:
  - "[[ts-strict-mode-rishikc]]"
  - "[[Research: TypeScript Best Practices and Codebase Structure]]"
created: 2026-05-02
updated: 2026-05-02

---# TypeScript Strict Mode

The `"strict": true` compiler option in `tsconfig.json` enables a suite of type-checking flags that catch entire categories of runtime errors at compile time.

## Sub-flags Enabled

| Flag | What it catches |
|------|----------------|
| `noImplicitAny` | Variables/functions without explicit types fall back to `any` |
| `strictNullChecks` | `null` and `undefined` treated as distinct types, must be handled |
| `strictFunctionTypes` | Enforces contravariance on function parameter types |
| `strictPropertyInitialization` | Class properties must be initialized |
| `noImplicitThis` | `this` must be explicitly typed in functions |
| `strictBindCallApply` | Type-checks `.bind`, `.call`, `.apply` arguments |
| `alwaysStrict` | Emits `"use strict"` and prevents `with` statements |
| `useUnknownInCatchVariables` | Catch variables are `unknown`, not `any` |

## Consensus

All authoritative sources agree: enable `"strict": true` for new projects. For existing codebases, migrate incrementally — enable one flag at a time, fix errors per module.

## Pair With

ESLint `@typescript-eslint/recommended-type-checked` for defense-in-depth. Strict mode catches type issues; ESLint catches behavioral issues like floating promises.
