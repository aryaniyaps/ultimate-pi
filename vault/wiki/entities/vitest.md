---
type: entity
status: developing
tags:
  - testing
  - vitest
  - vite
  - typescript
related:
  - "[[vitest-official]]"
  - "[[Research: TypeScript Best Practices and Codebase Structure]]"
created: 2026-05-02
updated: 2026-05-02

---# Vitest

Vitest is a next-generation testing framework for JavaScript and TypeScript, designed as a Vite-native alternative to Jest.

## Key Facts

- **Current version**: v4.1.5 (2026)
- **Maintainer**: VoidZero Inc. + open-source community
- **Engine**: Vite-powered (reuses Vite config, plugins, and transform pipeline)
- **Compatibility**: Jest-compatible API (`expect`, `describe`/`it`, snapshots, coverage)
- **TypeScript**: Native support via Oxc transpiler — zero config

## Core Features

- **Smart watch mode**: Only reruns tests affected by code changes (HMR for tests)
- **ESM native**: No transforms needed for ES module syntax
- **JSX/TSX**: Built-in support for React, Vue, Svelte, Solid, and others
- **Works without Vite**: Can be used in non-Vite Node.js backends
- **Concurrent test execution**: Worker threads for parallelism

## When to Use

Primary choice for Vite-based projects (React, Vue, Svelte). Also recommended for new projects replacing Jest — migration is straightforward. Not ideal for legacy projects with heavy Jest-specific plugin dependencies.

## Ecosystem Position

Vitest has largely replaced Jest as the default test runner for new frontend and full-stack TypeScript projects in the Vite ecosystem. Official recommendation from the Vite team.
