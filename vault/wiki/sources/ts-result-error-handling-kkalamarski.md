---
type: source
status: ingested
source_type: article
author: "Krzysztof Kalamarski"
date_published: 2022-07-25
url: "https://kkalamarski.me/a-declarative-approach-to-error-handling-in-typescript"
confidence: medium
key_claims:
  - "Result<Ok, Err> monad treats errors as values, not exceptions"
  - "wrap early, unwrap late — keep values in Result until display time"
  - "Once a Result is Err, all subsequent map/flatMap operations are skipped"
  - "match() method provides pattern matching for safe unwrapping"
tags:
  - typescript
  - error-handling
  - functional-programming
  - result-monad
created: 2026-05-02
updated: 2026-05-02

---# A Declarative Approach to Error Handling in TypeScript

Source: Krzysztof Kalamarski (kkalamarski.me), July 2022.

## Summary

Introduces the Result monad pattern for declarative error handling in TypeScript. Instead of try-catch blocks scattered throughout code, wrap fallible operations in `Result<Ok, Err>` and compose transformations with `map`/`flatMap`. Unwrap at the boundary with `match`.

## Core Pattern

```typescript
// Wrap: return Ok(value) or Err(error)
const parseJson = (json: string): Result<User, Error> => {
  try { return Ok(JSON.parse(json)); }
  catch (e) { return Err(e); }
};

// Compose: operations only run on Ok values
parseJson(input)
  .map(user => user.name)
  .match({
    Ok: name => `Hello, ${name}`,
    Err: error => 'Hello, Stranger'
  });
```

**Key principle**: Once a Result is `Err`, all subsequent `map`/`flatMap` calls are no-ops. The error propagates without additional try-catch.

## Confidence

Medium. Pattern is well-established in functional programming (Rust, Haskell, Elm). Implementation is sound but the source is a single developer blog from 2022.
