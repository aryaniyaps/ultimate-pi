---
type: source
source_type: github-repo
title: "Fallow - Codebase Intelligence for TypeScript & JavaScript"
author: "Bart Waardenburg (fallow-rs)"
date_published: 2025
date_fetched: 2026-05-01
url: "https://github.com/fallow-rs/fallow"
confidence: high
tags:
  - codebase-intelligence
  - static-analysis
  - dead-code
  - duplication
  - complexity
  - rust
  - typescript
  - javascript
  - harness-tool
key_claims:
  - "Fallow is NOT an AI assistant — it's the codebase truth layer coding agents call"
  - "Rust-native, zero config, sub-second analysis. 91 framework plugins."
  - "Detects dead code: unused files, exports, types, dependencies, circular deps, boundary violations"
  - "Detects duplication: 4 modes (strict/mild/weak/semantic), suffix-array algorithm"
  - "Complexity analysis: health scores, hotspots, refactor targets, per-file maintainability"
  - "Architecture boundary enforcement presets: bulletproof, layered, hexagonal, feature-sliced"
  - "Optional runtime intelligence: hot/cold path detection from V8 coverage (paid)"
  - "MCP server for AI agent integration. JSON output with machine-actionable `actions` array per issue."
  - "Audit mode for CI/CD: pass/warn/fail verdict. baselines for incremental adoption."
  - "Benchmarked 5-41x faster than knip, 8-26x faster than jscpd"
  - "1.7K GitHub stars, 31 forks, 151 releases (v2.58.0 as of May 2026)"
  - "MIT licensed"
related:
  - "[[Research: Fallow Codebase Intelligence Harness Integration]]"
  - "[[codebase-intelligence-harness-integration]]"
  - "[[codebase-intelligence-ecosystem-comparison]]"
---

# Fallow: Codebase Intelligence for TypeScript & JavaScript

Rust-native static analysis tool for TS/JS codebases. Built by Bart Waardenburg (fallow-rs). 1.7K GitHub stars, MIT licensed, 151 releases. Sub-second analysis on projects up to 20K+ files (Next.js benchmark: 1.72s).

## Core Capabilities

### Dead Code Detection
- Unused files, exports, types, enum/class members
- Unused dependencies (package.json)
- Circular dependencies (including cross-package in monorepos)
- Boundary violations across layers/modules
- Stale suppression comments
- Private type leaks (opt-in API hygiene)
- Per-file analysis (`--file src/utils.ts` for lint-staged integration)
- Grouping by CODEOWNERS, directory, package, or GitLab CODEOWNERS section

### Duplication Detection
- Suffix-array algorithm (no quadratic pairwise comparison)
- Four detection modes: strict (exact tokens), mild (AST-based, default), weak (different string literals), semantic (renamed variables)
- Cross-directory and per-file scoping
- Clone family grouping with `--trace src/file.ts:42`

### Complexity Analysis
- Health scores (0-100) with letter grades
- Per-file maintainability index
- Hotspot detection (git churn × complexity)
- Refactoring targets ranked by effort (low/medium/high)
- Static test coverage gaps
- Angular template analysis included

### Architecture Boundaries
- Preset configurations: bulletproof, layered, hexagonal, feature-sliced
- Zero manual config for boundary rules
- `fallow list --boundaries` to inspect expanded rules

### Runtime Intelligence (Optional, Paid)
- Hot/cold path detection from V8 coverage dumps
- Istanbul coverage-final.json integration
- CRAP scoring (Change Risk Analysis and Predictions) with exact coverage data
- Feature flag staleness detection
- Cloud analysis via `fallow coverage analyze --cloud`

## Agent Integration

```
npx fallow --format json
npx fallow audit --format json
npx fallow fix --dry-run --format json
```

- MCP server for Claude Code, Codex, Cursor, Windsurf
- Agent Skill shipped in npm package
- JSON output includes per-issue `actions` array with `auto_fixable` flag
- Audit mode returns verdict: pass/warn/fail with machine-readable exit codes

## Benchmarks (Apple M5, median of 5 runs with 2 warmups)

| Project | Files | fallow | knip v6 | Speedup |
|---------|-------|--------|---------|---------|
| zod | 174 | 25ms | 330ms | 13x |
| fastify | 286 | 27ms | 222ms | 8x |
| preact | 244 | 200ms | 2.15s | 11x |
| vue/core | 522 | 68ms | N/A | N/A |
| TanStack/query | 901 | 330ms | 1.08s | 3.3x |
| vite | 1,420 | 378ms | N/A | N/A |
| svelte | 3,337 | 363ms | 714ms | 2x |
| next.js | 20,416 | 1.72s | N/A | N/A |

knip does not produce valid JSON for vite, vue/core, and next.js on benchmark fixtures.

## Limitations

- Syntactic analysis only: no type-level dead code detection
- TS/JS only. No Python, Go, Rust, or Elixir support.
- Runtime intelligence requires paid license

## Relevance to ultimate-pi Harness

Fallow is the **Phase 16 deterministic quality gate** and **P15b pre-verification sandbox tool** for our harness. It provides:
1. Post-L4 lint-style gate with pass/warn/fail verdict (`fallow audit`)
2. Pre-verification scoped to changed files (`fallow audit --changed-since main`)
3. L5 observability substrate (health trends, complexity scores)
4. P21 Keep Rate proxy (health snapshots over time)
5. P29 error classification substrate (per-issue `actions` with `auto_fixable` flags)
6. MCP server integration for L3 execution layer agent tool calling
