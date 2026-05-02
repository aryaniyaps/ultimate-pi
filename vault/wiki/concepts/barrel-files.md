---
type: concept
status: developing
tags:
  - typescript
  - barrel-files
  - code-organization
  - performance
related:
  - "[[barrel-files-tkdodo]]"
  - "[[Research: TypeScript Best Practices and Codebase Structure]]"
created: 2026-05-02
updated: 2026-05-02

---# Barrel Files

A barrel file is a module (typically `index.ts`) that does nothing but re-export symbols from other files in the same directory. It provides a single import entry point for consumers.

## The Debate

**Pro-barrel** (traditional view): Clean imports (`import { X, Y } from '@/dir'`), hides internal structure, simplifies refactoring.

**Anti-barrel** (emerging consensus, 2024+): Causes circular imports, slows development servers, blocks bundler optimizations.

## Known Problems

1. **Circular imports**: When a module inside a directory imports from its own barrel, a circular dependency forms.
2. **Dev server slowdown**: JavaScript loads and parses every module in the barrel synchronously. Real-world case: 11K → 3.5K modules (68% reduction) by removing barrels, cutting startup from 5-10 seconds.
3. **Blocks `optimizePackageImports`**: Next.js optimization only works on "pure" re-export barrels with no side-effect code.

## Current Best Practice (2024+)

**Application code**: Avoid barrel files. Import directly from source files.

**Library code**: Barrel files are appropriate as the public API entry point (specified in `package.json` `main` field).

**Linting**: Enable `import/no-cycle` ESLint rule to catch circular imports from barrels.
