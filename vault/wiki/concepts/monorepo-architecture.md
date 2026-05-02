---
type: concept
status: developing
tags:
  - typescript
  - monorepo
  - turborepo
  - architecture
related:
  - "[[ts-monorepo-koerselman]]"
  - "[[Research: TypeScript Best Practices and Codebase Structure]]"
created: 2026-05-02
updated: 2026-05-02

---# Monorepo Architecture (TypeScript)

A monorepo stores multiple related packages (apps, libraries, services) in a single version-controlled repository. TypeScript monorepos add the complexity of shared types, build ordering, and module resolution across packages.

## Key Tools

- **Turborepo**: Build orchestration with caching. Defines task dependencies (`dependsOn`), inputs/outputs per task. Optional remote cloud cache.
- **Nx**: Similar to Turborepo but with more integrated code generation and dependency graph visualization.
- **pnpm workspaces**: Fast, disk-efficient package management with strict dependency isolation.

## Internal Package Strategies

### Built-Package (Recommended by Koerselman)
Build TS → JS (with bundler). Point `main` to compiled output. Benefits: efficient caching, path aliases work, ESM output clean. Requires more config.

### Internal-Packages (Source-only)
Point `main` directly to TS source. Benefits: simple setup, live code updates. Downsides: no build caching, slower type-checking in consumers, path aliases conflict across packages.

## ESM in Monorepos

- CJS **cannot** import from ESM at the top level (synchronous vs asynchronous)
- ESM requires file extensions on relative imports (`.js` or `.ts` with `moduleResolution: "bundler"`)
- Bundlers eliminate the need for extensions by combining all code into single output files

## IDE Integration

Use `declarationMap: true` + `tsc --emitDeclarationOnly` to generate type definition map files. Enables go-to-definition from consuming packages back to original TS source.

## Deployment Isolation

Tools like `isolate-package` extract a single package + its internal dependencies into a self-contained directory for deployment (solves Firebase monorepo issues).
