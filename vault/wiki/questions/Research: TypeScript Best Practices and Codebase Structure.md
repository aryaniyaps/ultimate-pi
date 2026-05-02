---
type: synthesis
title: "Research: TypeScript Best Practices and Codebase Structure"
created: 2026-05-02
updated: 2026-05-02
tags:
  - research
  - typescript
  - best-practices
  - codebase-structure
status: developing
related:
  - "[[ts-strict-mode-rishikc]]"
  - "[[ts-runtimes-comparison-betterstack]]"
  - "[[barrel-files-tkdodo]]"
  - "[[ts-monorepo-koerselman]]"
  - "[[vitest-official]]"
  - "[[ts-folder-structure-mingyang]]"
  - "[[ts-best-practices-2025-devto]]"
  - "[[ts-result-error-handling-kkalamarski]]"
  - "[[typescript-strict-mode]]"
  - "[[barrel-files]]"
  - "[[monorepo-architecture]]"
  - "[[result-monad-error-handling]]"
  - "[[javascript-runtimes]]"
  - "[[vitest]]"
sources:
  - "[[ts-strict-mode-rishikc]]"
  - "[[ts-runtimes-comparison-betterstack]]"
  - "[[barrel-files-tkdodo]]"
  - "[[ts-monorepo-koerselman]]"
  - "[[vitest-official]]"
  - "[[ts-folder-structure-mingyang]]"
  - "[[ts-best-practices-2025-devto]]"
  - "[[ts-result-error-handling-kkalamarski]]"

---# Research: TypeScript Best Practices and Codebase Structure

## Overview

Research across 8 authoritative sources covering TypeScript compiler configuration, runtime selection, code organization patterns, monorepo strategies, testing frameworks, and error handling approaches. The ecosystem has matured significantly: strict mode is the default, barrel files are discouraged, monorepo tooling is production-ready, and type-safe API patterns (tRPC) are gaining adoption.

## Key Findings

- **Enable `strict: true` by default** for all new TypeScript projects. `strictNullChecks` alone eliminates a major class of null-reference production bugs. Migrate existing codebases incrementally — one strict flag at a time. (Source: [[ts-strict-mode-rishikc]])
- **Avoid barrel files (`index.ts` re-exports) in application code**. Barrel files cause circular imports and slow dev servers by 68% in real production measurements. Libraries are the only valid use case. (Source: [[barrel-files-tkdodo]])
- **Bun is the fastest runtime** (52K req/s vs Node 13K), but Node.js remains the safe choice for production due to ecosystem maturity and backporting of Bun/Deno features. (Source: [[ts-runtimes-comparison-betterstack]])
- **Built-package strategy with Turborepo** is preferred for TypeScript monorepos. Build packages to JS with a bundler (TSUP, RsLib), use TypeScript project references, and generate `.d.ts.map` files for IDE go-to-definition. (Source: [[ts-monorepo-koerselman]])
- **Vitest has replaced Jest** as the default test runner for new TypeScript projects. Vite-native, Jest-compatible API, smart watch mode. (Source: [[vitest-official]])
- **Name backend folders by technical capability** (controllers, services, repositories), not by business feature. Feature-based structure works better for frontend. Separate database logic from business logic. (Source: [[ts-folder-structure-mingyang]])
- **`Result<Ok, Err>` monad pattern** enables declarative error handling — errors are values, not exceptions. Wrap early, unwrap late. Gaining adoption via libraries like neverthrow and effect-ts. (Source: [[ts-result-error-handling-kkalamarski]])
- **ESLint `@typescript-eslint/recommended-type-checked`** pairs with strict mode for defense-in-depth. Strict mode catches type issues; ESLint catches floating promises and behavioral bugs. (Sources: [[ts-strict-mode-rishikc]], [[ts-best-practices-2025-devto]])

## Key Entities

- [[vitest]]: Vite-native test framework, Jest-compatible, v4.1.5 (2026)
- [[javascript-runtimes]]: Node.js (stable, mature), Deno (secure, tooling-rich), Bun (fast, drop-in Node.js replacement)

## Key Concepts

- [[typescript-strict-mode]]: The `"strict": true` compiler flag enables 8+ sub-checks
- [[barrel-files]]: Re-export files — useful for libraries, harmful for app code
- [[monorepo-architecture]]: Single repo, multiple packages — built-package vs internal-packages strategies
- [[result-monad-error-handling]]: Functional error handling — `Result<Ok, Err>` with map/flatMap/match

## Contradictions

- **Barrel files**: Traditional advice says barrel files clean up imports; TkDodo (2024) demonstrates they cause circular imports and 68% module bloat. Consensus is shifting toward direct imports for app code. Resolution: Use barrels only for library entry points. (Sources: [[barrel-files-tkdodo]] vs common practice)
- **Folder structure**: Mingyang Li argues for technical-capability folders on backend (Clean Architecture). Vertical Slice advocates argue feature-based folders reduce context switching. Resolution: Technical structure for backend stability, feature structure for frontend adaptability. (Source: [[ts-folder-structure-mingyang]])
- **Built vs source-only packages**: Koerselman prefers building packages with bundlers for caching and ESM compatibility. Turborepo team's blog argues source-only is simpler and often sufficient. Resolution: Depends on project size. Small teams: source-only. Large teams with CI/CD: built-package. (Source: [[ts-monorepo-koerselman]])

## Open Questions

- How does tRPC compare to traditional REST in non-TypeScript environments? (Research focused on TS-TS stacks)
- What is the adoption rate of Biome (Rust-based linter/formatter) vs ESLint+Prettier in 2026?
- Are there published benchmarks for `isolatedModules: true` performance impact in large monorepos?
- How does the Oxc-based TypeScript transpiler (used by Vitest) compare to SWC and ESBuild for type stripping?

## Sources

- [[ts-strict-mode-rishikc]]: Rishi Kumar Chawda, 2021/2026 — comprehensive strict mode guide
- [[ts-runtimes-comparison-betterstack]]: Stanley Ulili, 2026 — Node.js vs Deno vs Bun comparison with benchmarks
- [[barrel-files-tkdodo]]: Dominik Dorfmeister, 2024 — argument against barrel files with performance data
- [[ts-monorepo-koerselman]]: Thijs Koerselman, 2023/2026 — deep dive into TS monorepo patterns
- [[vitest-official]]: Vitest contributors, 2026 — official testing framework documentation
- [[ts-folder-structure-mingyang]]: Mingyang Li, 2024 — production-grade Node.js/TS folder structure
- [[ts-best-practices-2025-devto]]: Mitu M, 2025 — broad overview of 2025 best practices
- [[ts-result-error-handling-kkalamarski]]: Krzysztof Kalamarski, 2022 — Result monad pattern implementation
