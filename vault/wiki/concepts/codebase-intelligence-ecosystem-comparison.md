---
type: concept
title: "Codebase Intelligence Ecosystem Comparison"
created: 2026-05-01
updated: 2026-05-01
status: developing
tags:
  - harness
  - codebase-intelligence
  - static-analysis
  - dead-code
  - ecosystem
  - comparison
related:
  - "[[fallow-rs-codebase-intelligence]]"
  - "[[Research: Fallow Codebase Intelligence Harness Integration]]"
  - "[[codebase-intelligence-harness-integration]]"
  - "[[harness-implementation-plan]]"
sources:
  - "[[fallow-rs-codebase-intelligence]]"

---# Codebase Intelligence Ecosystem Comparison

Comparison of codebase intelligence tools across TypeScript/JavaScript, Python, Go, Rust, and Elixir ecosystems. Focus: tools that provide project-wide dead code detection, duplication analysis, complexity scoring, and architecture boundary enforcement — the capabilities a coding agent harness needs for deterministic quality gating.

## TypeScript / JavaScript

### Fallow (fallow-rs/fallow) — PRIMARY RECOMMENDED
- **Coverage**: Dead code, duplication, complexity, boundaries, runtime intelligence
- **Speed**: Sub-second (Rust-native)
- **Agent integration**: MCP server, JSON output with actions array, agent skill
- **Stars**: 1.7K
- **License**: MIT
- **Limitation**: Syntactic only (no type-level dead code). TS/JS only.
- **Status**: Adopted for P44 in harness implementation plan.

### knip (webpro-nl/knip)
- **Coverage**: Dead code detection (files, exports, dependencies, types)
- **Speed**: Slower than fallow (2-13x on benchmarks). v6 improved but still behind.
- **Agent integration**: JSON output, no MCP server
- **Stars**: ~7K
- **Status**: Legacy reference. fallow beats it on speed, features, and agent integration.

### ts-prune
- **Coverage**: Unused exports only
- **Speed**: Fast but narrow scope
- **Status**: Superseded by fallow/knip for comprehensive analysis.

### jscpd
- **Coverage**: Duplication detection
- **Speed**: 8-26x slower than fallow
- **Status**: Legacy reference.

## Python

### Vulture (jendrikseipp/vulture)
- **Coverage**: Dead code detection (unused functions, variables, classes, imports)
- **Method**: AST-based static analysis
- **Limitations**: Python's dynamic nature causes false positives. No cross-file import graph traversal. No duplication or complexity analysis.
- **Stars**: ~3.5K
- **Agent integration**: CLI only, JSON output available
- **Harness relevance**: Partial P44 coverage for Python projects. Combine with other tools.

### Skylos (duriantaco/skylos)
- **Coverage**: Multi-language SAST (Python, TS, JS, Go, Java, PHP, Rust)
- **Features**: Dead code, security scanning, secrets detection, AI code guardrails
- **Method**: CI/CD PR gate, local-first
- **Agent integration**: JSON output, VS Code extension
- **Harness relevance**: Most comprehensive Python dead code tool. Multi-language support valuable for harness.

### Ruff (astral-sh/ruff)
- **Coverage**: Linting + formatting (Rust-native)
- **Speed**: 10-100x faster than flake8
- **Limitations**: File-local only. No cross-file dead code detection. No duplication or boundaries.
- **Agent integration**: CLI, JSON output
- **Harness relevance**: Inline syntax validation (P11). Complements but doesn't replace fallow-equivalent.

### Py-spy (benfred/py-spy)
- **Coverage**: Sampling profiler for Python
- **Harness relevance**: Runtime intelligence equivalent of fallow runtime (hot path detection)

### pydeps (thebjorn/pydeps)
- **Coverage**: Module dependency graph visualization
- **Method**: Import graph traversal
- **Harness relevance**: Dead file detection via import graph. Graphical output, not structured JSON.

### Coverage.py + pytest-cov
- **Coverage**: Runtime test coverage
- **Harness relevance**: Runtime intelligence layer (akin to fallow's V8 coverage integration)

## Go

### deadcode (golang.org/x/tools/cmd/deadcode)
- **Coverage**: Unreachable function detection
- **Method**: Quick inspection of all packages in a Go program. Call graph analysis from main entry points.
- **Built by**: Alan Donovan (Go team), Dec 2023
- **Limitations**: Functions only. No exports check, no duplication, no complexity, no boundaries.
- **Agent integration**: CLI only
- **Harness relevance**: Official Go dead code tool. Narrow scope.

### Staticcheck (dominikh/go-tools)
- **Coverage**: Bugs, performance issues, simplifications, style rules, unused code
- **Method**: Static analysis. Most comprehensive Go linter.
- **Agent integration**: JSON output via golangci-lint wrapper
- **Stars**: ~7K (go-tools monorepo)
- **Harness relevance**: Best single Go static analysis tool. Covers dead code + quality.

### golangci-lint
- **Coverage**: Meta-linter wrapping 50+ Go linters
- **Includes**: staticcheck, unused, deadcode, errcheck, govet
- **Agent integration**: JSON, SARIF, GitHub annotations
- **Harness relevance**: One-command quality gate for Go projects.

### unused (dominikh)
- **Coverage**: Unused identifiers (constants, variables, functions, types, fields)
- **Method**: Part of staticcheck suite
- **Harness relevance**: Dead code detection for Go. Redundant if using golangci-lint with staticcheck.

## Rust

### cargo-udeps (est31/cargo-udeps)
- **Coverage**: Unused dependencies in Cargo.toml
- **Method**: Compiler-level analysis. Requires nightly.
- **Harness relevance**: Dedicated unused dep tool. Complements built-in rustc warnings.

### cargo-machete (bnjbvr/cargo-machete)
- **Coverage**: Unused dependencies (fast path)
- **Method**: Regex-based pre-check. Works on stable Rust.
- **Harness relevance**: Faster alternative to cargo-udeps. Pair with udeps for accuracy.

### Built-in Rust compiler warnings
- `#[warn(dead_code)]`, `#[warn(unused_imports)]`, `cargo clippy`
- **Coverage**: In-crate dead code. No cross-crate dependency checking.
- **Harness relevance**: Foundation layer. `cargo clippy -- -D warnings` as CI gate.

### cargo-deny (EmbarkStudios/cargo-deny)
- **Coverage**: License compliance, security advisories, duplicate dependencies
- **Harness relevance**: Dependency audit layer. Complements udeps/machete.

### rust-code-analysis (mozilla/rust-code-analysis)
- **Coverage**: Code complexity metrics (cyclomatic, cognitive, LOC, HALSTEAD)
- **Method**: Mozilla's tool. Supports Rust, C/C++, JS, Python.
- **Harness relevance**: Complexity analysis for Rust (fallow-equivalent health scores)

## Elixir

### Dialyzer (via dialyxir: jeremyjh/dialyxir)
- **Coverage**: Type errors, dead code, unreachable code, unnecessary tests
- **Method**: Static analysis of BEAM bytecode. Requires typespecs for best results.
- **Limitations**: Slow (bytecode analysis). Setup required. False positives on dynamic code patterns.
- **Harness relevance**: Primary Elixir dead code detection. Dialyxir adds Elixir-friendly interface.

### Credo (rrrene/credo)
- **Coverage**: Code smells, style issues, refactoring opportunities, consistency
- **Method**: AST-based static analysis. Teaching-focused.
- **Stars**: ~4.9K
- **Agent integration**: JSON output, check-style format
- **Harness relevance**: Linting + code smell detection. Complements Dialyzer for quality gating.

### Sobelow (nccgroup/sobelow)
- **Coverage**: Security-focused static analysis for Phoenix
- **Harness relevance**: Security layer for Elixir/Phoenix projects

### CodeScene
- **Coverage**: Behavioral code analysis (git history + complexity + social factors)
- **Harness relevance**: L5 observability (hotspots, bus factor). Not Elixir-specific.

## Gap Analysis: No Ecosystem Has a Fallow Equivalent

| Capability | TS/JS (fallow) | Python | Go | Rust | Elixir |
|---|---|---|---|---|---|
| Dead code (unused files) | ✅ | Vulture (partial) | deadcode (functions only) | cargo-udeps (deps only) | Dialyzer (unreachable) |
| Dead code (unused exports) | ✅ | ❌ No tool | ❌ No tool | ❌ No tool | ❌ No tool |
| Duplication detection | ✅ | ❌ No tool | ❌ No tool | ❌ No tool | ❌ No tool |
| Complexity scoring | ✅ | Radon/wily | gocyclo | rust-code-analysis | Credo (partial) |
| Architecture boundaries | ✅ | ❌ No tool | ❌ No tool | ❌ No tool | ❌ No tool |
| Runtime intelligence | ✅ (paid) | py-spy + coverage.py | pprof | perf/flamegraph | observer_cli |
| MCP server for agents | ✅ | ❌ | ❌ | ❌ | ❌ |
| Audit mode (changed files) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Single unified tool | ✅ | ❌ | ❌ | ❌ | ❌ |

**Key finding**: Fallow is the ONLY codebase intelligence tool across all five ecosystems that provides dead code + duplication + complexity + boundaries in a single, fast, agent-integrated package. Every other ecosystem requires combining 3-5 separate tools to achieve similar coverage.

## Harness Multi-Language Strategy

For a multi-language harness, the approach is:

1. **TS/JS**: `fallow` — single-command comprehensive gate
2. **Python**: `skylos` (dead code + security) + `ruff` (lint) + `radon` (complexity) + `coverage.py` (runtime)
3. **Go**: `golangci-lint` (all-in-one lint + dead code) + `gocyclo` (complexity) + `deadcode` (unreachable functions)
4. **Rust**: `cargo clippy` (lint + dead code) + `cargo-udeps` (unused deps) + `rust-code-analysis` (complexity) + `cargo-deny` (audit)
5. **Elixir**: `mix test` + `credo` (lint) + `dialyxir` (dead code + types) + `sobelow` (security)
