---
type: entity
status: developing
tags:
  - javascript
  - runtimes
  - nodejs
  - deno
  - bun
related:
  - "[[ts-runtimes-comparison-betterstack]]"
  - "[[Research: TypeScript Best Practices and Codebase Structure]]"
created: 2026-05-02
updated: 2026-05-02

---# JavaScript Runtimes (Node.js, Deno, Bun)

Three major JavaScript/TypeScript runtimes for server-side development, as of 2026.

## Node.js

- **Established**: 2009, V8 engine, OpenJS Foundation
- **TS support**: Experimental (`--experimental-strip-types`), limited to inline type annotations
- **Performance**: Slowest (13K req/s Express benchmark)
- **Ecosystem**: Largest — 2M+ npm packages
- **Best for**: Production stability, broad deployment support, largest talent pool

## Deno

- **Released**: 2020, created by Node.js original author (Ryan Dahl), Rust + V8
- **TS support**: First-class, auto-transpiles, REPL supports TS
- **Performance**: Mid-tier (22K req/s)
- **Key differentiator**: Security-first with permissions model and sandbox. Best built-in tooling (linter, formatter, test runner, REPL).
- **Best for**: Security-sensitive applications, teams that want integrated tooling

## Bun

- **Released**: 2021, Zig + JavaScriptCore (WebKit)
- **TS support**: First-class, auto-transpiles
- **Performance**: Fastest (52K req/s) — designed as drop-in Node.js replacement
- **Key differentiator**: Speed, built-in SQLite, binary lockfile, dual CJS/ESM support
- **Best for**: Performance-critical applications, new greenfield projects

## Decision Framework

- **Stay with Node.js** if you have existing production systems — features from Bun/Deno are being backported
- **Choose Bun** for new projects where raw performance and built-in SQLite matter
- **Choose Deno** if security and integrated tooling are top priorities
