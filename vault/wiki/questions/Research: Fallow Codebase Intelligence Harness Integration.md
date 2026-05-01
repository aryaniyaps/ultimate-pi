---
type: synthesis
title: "Research: Fallow Codebase Intelligence Harness Integration"
created: 2026-05-01
updated: 2026-05-01
tags:
  - research
  - harness
  - fallow
  - codebase-intelligence
  - static-analysis
  - dead-code
  - quality-gate
status: developing
related:
  - "[[fallow-rs-codebase-intelligence]]"
  - "[[codebase-intelligence-harness-integration]]"
  - "[[codebase-intelligence-ecosystem-comparison]]"
  - "[[harness-implementation-plan]]"
  - "[[harness]]"
sources:
  - "[[fallow-rs-codebase-intelligence]]"
---

# Research: Fallow Codebase Intelligence Harness Integration

## Overview

Fallow (fallow-rs/fallow, 1.7K stars, MIT) is a Rust-native codebase intelligence tool for TypeScript and JavaScript. It detects dead code, duplication, complexity, and architecture boundary violations — all sub-second even on 20K+ file codebases. It integrates into our harness as the Phase 16 deterministic quality gate, P15b pre-verification sandbox tool, and L5 observability substrate. No other ecosystem has a single-tool equivalent. Cross-ecosystem coverage requires combining 3-5 tools per language.

## Key Findings

- Fallow is the ONLY tool across TS/JS, Python, Go, Rust, and Elixir that provides dead code + duplication + complexity + boundaries in one sub-second package. (Source: [[fallow-rs-codebase-intelligence]], [[codebase-intelligence-ecosystem-comparison]])
- Fallow is purpose-built for AI agent integration: MCP server, JSON with `actions` array, `auto_fixable` flags, agent skill shipped in npm package. (Source: [[fallow-rs-codebase-intelligence]])
- Fallow fits 7 distinct integration points in our harness: L3 tool calling, P15b pre-verify, Phase 16 gate, L5 observability, P29 error classification, L6 baselines, P42 automations. (Source: [[codebase-intelligence-harness-integration]])
- Fallow beats knip by 2-13x speed with broader feature coverage (duplication, complexity, boundaries, runtime). Beats jscpd by 8-26x. (Source: [[fallow-rs-codebase-intelligence]])
- For Python: Vulture + Skylos + Ruff combo provides dead code coverage. For Go: golangci-lint + deadcode + gocyclo. For Rust: clippy + cargo-udeps + rust-code-analysis. For Elixir: dialyxir + credo. All inferior to fallow's single-command coverage. (Source: [[codebase-intelligence-ecosystem-comparison]])
- Fallow's audit mode with baselines enables incremental adoption — critical for existing codebases with legacy issues. (Source: [[fallow-rs-codebase-intelligence]])
- Fallow's runtime intelligence (paid) provides hot/cold path evidence from V8 coverage — a Keep Rate proxy for production code survival. (Source: [[fallow-rs-codebase-intelligence]])

## Key Entities

- **fallow-rs/fallow**: Rust-native TS/JS codebase intelligence. 1.7K stars, MIT. By Bart Waardenburg.
- **knip**: Legacy dead code detector for TS/JS. ~7K stars. Superseded by fallow on speed and features.
- **Vulture**: Python dead code detector. ~3.5K stars. AST-based, partial coverage.
- **Skylos**: Multi-language SAST (Python, TS, Go, Java, Rust). Most comprehensive Python dead code.
- **deadcode**: Official Go unreachable-function detector. By Alan Donovan (Go team).
- **Staticcheck**: Most comprehensive Go linter. ~7K stars.
- **cargo-udeps**: Rust unused dependency detector. Nightly required.
- **Dialyzer**: Erlang/Elixir BEAM static analysis. Dead code + type errors.
- **Credo**: Elixir code analysis with teaching focus. ~4.9K stars.

## Key Concepts

- [[codebase-intelligence-harness-integration]]: 7-point integration map for fallow into our harness pipeline
- [[codebase-intelligence-ecosystem-comparison]]: Cross-language gap analysis showing no ecosystem has fallow-equivalent
- Harness P44: New phase for codebase intelligence integration. 7 sub-phases (P44a through P44g).

## Contradictions

- **Fallow vs knip**: knip has ~7K stars (older, more established community). Fallow has 1.7K stars but 2-13x faster and broader feature set. Recommendation: fallow for harness. Stars lag features due to younger project.
- **Vulture vs Skylos (Python)**: Vulture is dedicated dead code (3.5K stars, mature). Skylos is multi-language (+ security scanning). For harness: Skylos provides broader coverage. Vulture is simpler if only dead code needed.

## Open Questions

- Fallow is TS/JS only. Should harness invest in per-language tool wrappers (Python, Go, Rust, Elixir), or defer multi-language support to post-v1? Current recommendation: P44 for TS/JS now. Multi-language in future F5 phase.
- Fallow runtime intelligence requires paid license. Is the V8 coverage hot-path data worth the cost for Keep Rate tracking? Recommendation: start with free static layer. Evaluate runtime layer if Keep Rate signal is insufficient.
- Should harness enforce fallow audit gate (fail = block delivery) or use warn-only mode initially? Recommendation: warn-only for adoption period, escalate to fail gate after baselines established.
- Can fallow's per-issue `actions` array be mapped to automated fix application (auto-heal)? Recommendation: P44e maps `auto_fixable=true` issues to auto-heal candidates. `fallow fix --dry-run` previews before applying.

## Sources

- [[fallow-rs-codebase-intelligence]]: Primary source. GitHub repo, docs, benchmarks.
