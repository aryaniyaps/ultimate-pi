---
type: synthesis
title: "Research: sentrux.dev"
created: 2026-05-03
updated: 2026-05-03
tags:
  - research
  - sentrux
  - code-quality
  - ai-coding
status: developing
related:
  - "[[sentrux (tool)]]"
  - "[[Quality Signal (sentrux)]]"
  - "[[Five Root Cause Metrics (sentrux)]]"
  - "[[sentrux Rules Engine]]"
  - "[[sentrux MCP Integration]]"
  - "[[harness-implementation-plan]]"
  - "[[harness]]"
sources:
  - "[[sentrux-github-repo]]"
  - "[[sentrux-dev-landing]]"
  - "[[sentrux-docs-quality-signal]]"
  - "[[sentrux-docs-root-cause-metrics]]"
  - "[[sentrux-docs-rules-engine]]"
  - "[[sentrux-docs-pro-architecture]]"
---

# Research: sentrux.dev

## Overview
sentrux is a real-time architectural sensor for AI-agent-written code. Built in Rust (MIT licensed), it computes a single Quality Signal score (0–10,000) from 5 graph-theoretic root cause metrics, visualizes the codebase as an interactive treemap, and integrates with AI coding agents via MCP (Model Context Protocol). First released March 11, 2026; already at v0.5.7 with 1.9k GitHub stars.

## Key Findings

- **Unique positioning:** sentrux positions itself as the missing feedback loop in AI-assisted development — the "sensor" that observes architectural reality while AI agents are the "actuator" making changes (Source: [[sentrux-dev-landing]])
- **Mathematically grounded scoring:** Uses geometric mean of 5 independent graph-theoretic dimensions, justified by Nash Social Welfare theorem (1950). Claims to be "ungameable by design" (Source: [[sentrux-docs-quality-signal]])
- **5 root cause metrics cover complete structural space:** 3 edge properties (modularity, acyclicity, depth) + 2 node properties (equality, redundancy) — each grounded in peer-reviewed theory (Newman 2004, Martin 2003, Lakos 1996, Gini 1912, Kolmogorov 1963) (Source: [[sentrux-docs-root-cause-metrics]])
- **MCP-first AI agent integration:** 9 MCP tools allow agents to scan, baseline, check rules, and detect quality degradation per session — closing the feedback loop automatically (Source: [[sentrux-github-repo]])
- **Pro tier via runtime plugin model:** Pro features ($15/month) live in a separately downloaded dylib, not in the free binary. Ed25519 license keys with offline validation and per-user watermarking for anti-piracy (Source: [[sentrux-docs-pro-architecture]])
- **Rapid development velocity:** From initial commit to v0.5.7 with Pro architecture, Claude Code plugin, universal resolver, and 316+ tests in approximately one week (Source: [[sentrux-github-repo]])
- **52 languages via tree-sitter:** Zero language-specific code in the Rust binary. All language knowledge in plugin.toml + tags.scm query files. New languages require zero Rust code (Source: [[sentrux-github-repo]])

## Key Entities
- [[sentrux (tool)]]: The open-source architectural sensor and quality governance tool
- **yjing:** Primary author; GitHub user "sentrux"; appears as "yjing@sentrux.dev" in license keys
- **claude:** Contributor account — likely represents AI-generated code contributions (the tool was partially built by Claude)

## Key Concepts
- [[Quality Signal (sentrux)]]: Single scalar score 0–10,000 via geometric mean of 5 normalized metrics
- [[Five Root Cause Metrics (sentrux)]]: modularity, acyclicity, depth, equality, redundancy
- [[sentrux Rules Engine]]: TOML-based architectural constraint system for CI and MCP
- [[sentrux MCP Integration]]: 9-tool MCP server for AI agent feedback loops
- **Feedback Loop (cybernetic):** sensor (sentrux) → signal → controller (AI agent) → actuator (code changes) → system (codebase) → loop

## Contradictions

- **Self-assessment gap:** The sentrux repo gives itself a "D" rating when analyzed by its own tool (Source: Reddit comment by ron3090). This raises questions about either the tool's calibration or the repo's code quality — both problematic for credibility.
- **Rapid release pace vs stability:** 17 releases in a single day during launch. Reddit community flagged this as potentially "vibe-coded" with insufficient review and testing. Creator responded to specific feedback (swapped `dirs` crate for `std::env::home_dir()`) suggesting responsiveness but also rapid, reactive development.
- **Conceptual strength vs practical utility:** Community feedback split between praising the concept (human-in-the-loop, feedback loop) and questioning practical usefulness — "it looks okay visually, but doesn't actually show anything useful" and metrics are "meaningless noise" without actionable drill-down.
- **"Ungameable" claim:** The Nash Social Welfare theorem guarantees aggregation properties, not that individual metrics can't be gamed. The claim conflates mathematical properties of aggregation with practical impossibility of gaming.

## Open Questions

- **Production adoption unknown:** No evidence found of production usage beyond the creator. Tool is <2 months old. Listed as "developing" status.
- **No independent reviews found:** No blog posts, technical analyses, or third-party evaluations beyond the Reddit launch thread comments. All documentation is from the creator.
- **Accuracy of metrics across languages:** 52 languages supported via tree-sitter but accuracy of dependency graph extraction likely varies significantly by language maturity of tree-sitter grammars.
- **Scalability limits unknown:** No data on performance with large codebases (100K+ files, monorepos). Treemap rendering with dependency edges at scale unverified.
- **Pro plugin security model:** Runtime dylib loading has inherent security risks. The anti-piracy posture explicitly accepts that binary patching defeats all protections — what about malicious plugin substitution?
- **Comparison with existing tools absent:** No positioning relative to SonarQube, CodeClimate, CodeScene, or other established code quality tools. sentrux claims uniqueness via MCP integration and geometric mean, but doesn't benchmark against alternatives.

## Sources
- [[sentrux-github-repo]]: GitHub repository, primary development source, MIT licensed
- [[sentrux-dev-landing]]: Official marketing website (sentrux.dev)
- [[sentrux-docs-quality-signal]]: Quality Signal scoring methodology documentation
- [[sentrux-docs-root-cause-metrics]]: Detailed mathematical definitions of all 5 metrics
- [[sentrux-docs-rules-engine]]: Rules engine TOML configuration and enforcement documentation
- [[sentrux-docs-pro-architecture]]: Pro tier architecture, license system, business model

## Harness Integration Map

sentrux maps onto the ultimate-pi agentic harness at 5 integration points. See [[harness-implementation-plan]] for the updated build plan.

| Harness Layer | What sentrux Provides | Replaces |
|--------------|----------------------|----------|
| **L2.5 Drift Monitor** | `session_start()`/`session_end()` — structural health baseline + degradation detection per agent session | Augments behavioral drift with structural drift signals |
| **L3 Grounding** | `scan()` + `check_rules()` — agent gets real-time structural awareness before/after edits; verifies architectural constraints before committing | Adds architectural grounding to existing manual checkpoints |
| **P20 Gate** | `sentrux check .` — CI-friendly exit 0/1: modularity, acyclicity, depth, equality, redundancy | Joins biome + tsc + fallow (dead code) as fourth deterministic gate |
| **L5 Observability** | Quality Signal trending via `evolution` tool — continuous metric trackable across sessions | Adds structural dimension to Keep Rate + LLM-as-Judge |
| **P44 Structural Gate** | Full Fallow replacement: dead code (redundancy), coupling (modularity), cycle detection (acyclicity), god files (equality), depth analysis — all in one tool with MCP + session diff + rules engine | **Replaces Fallow entirely** for P44a-g. Fallow retained only for dead code detection in P20 gate (complementary). |

### What sentrux Does NOT Replace
- **L1 Spec Hardening** — specification analysis (LLM evaluation)
- **L2 Structured Planning** — task planning (LLM evaluation)
- **L4 Adversarial Verification** — semantic code review, critic agents (LLM evaluation)
- **P13 Semantic Code Search (ck)** — BM25+embeddings grep (different concern: semantic vs structural)
- **P14 Think-in-Code** — coding paradigm enforcement (different concern: process vs structure)
- **P15 Gitingest** — bulk external repo ingestion (different concern: ingestion vs analysis)
- **P30 Browser Subagent** — visual UI verification (different domain)
- **P43 TS Execution Layer** — TypeScript sandbox (different concern: execution vs analysis)
- **L7 Schema Orchestration** — workflow DAG (different concern: orchestration vs analysis)
- **L8 Wiki Query** — knowledge base search (different concern: retrieval vs analysis)

### Token Budget Impact
sentrux MCP calls add **0 LLM tokens** to the pipeline budget. All 9 tools are deterministic Rust computations — structural analysis happens outside the LLM context window. This replaces ~500-1,000 tokens of LLM-based structural review that Fallow required for interpretation of its JSON output.

### Why sentrux Over Fallow
| Capability | Fallow | sentrux |
|-----------|--------|--------|
| Dead code detection | Yes (redundancy metric) | Yes (redundancy metric) |
| Duplication detection | Yes | Via redundancy |
| Complexity (cyclomatic) | Yes | Via equality (Gini) — god file detection |
| Boundary/coupling analysis | Yes | Yes (modularity + acyclicity) |
| Dependency depth | No | Yes (Lakos 1996 levelization) |
| Modularity (Newman 2004) | No | Yes |
| Single scalar 0-10,000 score | No | Yes (Quality Signal) |
| MCP server | Yes | Yes (9 tools vs Fallow's tool set) |
| Session baseline/diff | No | Yes |
| Rules engine (TOML constraints) | No | Yes |
| 52 languages | TS/JS only | 52 languages |
| Open source license | MIT | MIT (free binary) |

**Decision:** sentrux is the primary structural quality tool. Fallow is retained only for TypeScript-specific dead code detection in the P20 gate (complementary, not competitive).
