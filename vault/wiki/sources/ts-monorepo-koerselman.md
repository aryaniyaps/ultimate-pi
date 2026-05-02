---
type: source
status: ingested
source_type: article
author: "Thijs Koerselman"
date_published: 2023-12-26
date_updated: 2026-04-22
url: "https://thijs-koerselman.medium.com/my-quest-for-the-perfect-ts-monorepo-62653d3047eb"
confidence: high
key_claims:
  - "Two strategies for internal packages: built-package (with bundler) vs internal-packages (source-only)"
  - "Turborepo + TypeScript project references provide fast, deterministic builds"
  - "ESM is the future; CJS cannot import from ESM at top level"
  - "Bundlers eliminate the need for `.js` extensions on relative imports"
  - "Type definition map files (`.d.ts.map`) are needed for IDE go-to-definition across packages"
tags:
  - typescript
  - monorepo
  - turborepo
  - esm
created: 2026-05-02
updated: 2026-05-02

---# My Quest for the Perfect TS Monorepo

Source: Thijs Koerselman (Medium), published December 2023, updated with 2026 addendum.

## Summary

Deep-dive into monorepo patterns for TypeScript projects. Covers build orchestration with Turborepo, ESM vs CJS challenges, internal package strategies, deployment isolation for Firebase, IDE go-to-definition setup, and live code updates.

## Key Insights

**Internal packages — two approaches**:
1. **Built-package**: Build/bundle TS → JS, point `main` to output. Benefits: efficient caching, path aliases work, ESM output cleanly. Downsides: more config.
2. **Internal-packages**: Point `main` to TS source directly, no build step. Benefits: simple, live updates. Downsides: no caching, slower builds, path aliases tricky.

**Author's preference**: Built-package with bundler. Treat each package as self-contained unit.

**ESM rules**: CJS cannot import ESM at top level (synchronous vs asynchronous). ESM requires file extensions on relative imports. `moduleResolution: "bundler"` allows `.ts` extensions.

**IDE go-to-definition**: Use `declarationMap: true` + `tsc --emitDeclarationOnly` after bundler for type definition map files.

**Works with**: [mono-ts boilerplate](https://github.com/0x80/mono-ts) (PNPM/NPM branches), Turborepo v2 watch mode, Firebase via `isolate-package`.
