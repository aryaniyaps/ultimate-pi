---
type: concept
status: developing
tags:
  - typescript
  - error-handling
  - functional-programming
  - result-monad
related:
  - "[[ts-result-error-handling-kkalamarski]]"
  - "[[Research: TypeScript Best Practices and Codebase Structure]]"
created: 2026-05-02
updated: 2026-05-02

---# Result Monad Error Handling

A functional programming pattern for TypeScript that treats errors as **values** rather than exceptions. Instead of throwing and catching, functions return a `Result<Ok, Err>` type that is either a success (`Ok`) or failure (`Err`).

## The Pattern

```typescript
type Result<Ok, Err> = {
  map<O>(f: (v: Ok) => O): Result<O, Err>;
  flatMap<O>(f: (v: Ok) => Result<O, Err>): Result<O, Err>;
  match<O>(handlers: { Ok: (v: Ok) => O; Err: (e: Err) => O }): O;
};
```

## Core Principle: Wrap Early, Unwrap Late

1. **Wrap**: Convert fallible operations to `Result` immediately using `Ok(value)` or `Err(error)`
2. **Compose**: Chain transformations with `.map()` and `.flatMap()`. Operations are only applied to `Ok` values — errors propagate automatically
3. **Unwrap**: Only at the boundary (UI, API response) use `.match()` to handle both cases

## Benefits

- No scattered try-catch blocks
- Error handling is explicit in the type signature
- Impossible to forget to handle errors — the compiler enforces it
- Error information can be carried through the call chain without additional parameters

## Trade-offs

- Not idiomatic TypeScript (language uses exceptions natively)
- Requires team buy-in and consistency
- Library support: neverthrow, ts-results, fp-ts, effect-ts
- Adds abstraction overhead for simple cases
