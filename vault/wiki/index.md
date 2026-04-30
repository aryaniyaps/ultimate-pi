# Codebase Map & Architecture Wiki

## Overview
This wiki maps the codebase architecture and tracks key software design decisions.

## Modules

| Module | Layer | Summary |
|--------|-------|---------|
| [[harness]] | — | 8-layer mandatory pipeline — every task flows through all layers |
| [[spec-hardening]] | L1 | Block execution until ambiguities resolved |
| [[structured-planning]] | L2 | Machine-readable task DAG before code |
| [[grounding-checkpoints]] | L3 | Smallest verifiable change + drift detection |
| [[adversarial-verification]] | L4 | Critic agents attack, not review |
| [[automated-observability]] | L5 | Instrumentation is definition-of-done |
| [[persistent-memory]] | L6 | claude-obsidian wiki as knowledge base |
| [[schema-orchestration]] | L7 | Archon workflow DAG orchestrates all layers |
| [[wiki-query-interface]] | L8 | LLM-native search via claude-obsidian skills |
| [[harness-implementation-plan]] | — | Build phases, token budgets, risk surface |
| [[harness-wiki-skill-mapping]] | — | Skill-to-layer contract: which wiki skill fires when |
| [[skills]] | — | Agent capability plugins |
| [[extensions]] | — | Programmatic hooks |
| [[bench]] | — | Evaluation tools |

## Decisions

| Decision | Summary |
|----------|---------|
| [[2026-04-30-pi-lean-ctx-native]] | Adopt pi-lean-ctx native package, drop custom extension |
| [[colocate-wiki]] | Co-locating Wiki with Codebase |
| [[adr-008]] | Spec-Only Black-Box QA |
| [[adr-009]] | claude-obsidian Mode B for Persistent Memory |
| [[adr-010]] | Agentic Harness ↔ Wiki Tight-Coupling Contract |
| [[adr-011]] | Multi-Agent Consensus Debate via pi-messenger transport |

## Concepts

| Concept | Summary |
|---------|--------|
| [[agent-codebase-interface]] | Designing tool interfaces for AI agents, not humans |
| [[progressive-disclosure-agents]] | Layered codebase information (L0-L3) within token budgets |
| [[repo-map-ranking]] | Graph centrality algorithm for selecting important codebase symbols |
| [[execution-feedback-loop]] | Agent debug-test-iterate cycle via structured test output |
| [[ast-truncation]] | Stubbing function bodies at AST level for token-efficient code reading |
| [[fuzzy-edit-matching]] | Diff algorithm tolerating formatting drift to eliminate edit retries |
| [[inline-post-edit-validation]] | Compiler/parser validation after each edit (syntax only — lint/format deferred to Phase 16) |
| [[model-routing-agents]] | Dispatching exploration to cheap models (Haiku), code gen to frontier |
| [[codebase-to-context-ingestion]] | Converting entire codebases into structured LLM context |
| [[think-in-code]] | Paradigm: write code to process data, don't read raw data into context |
| [[agentic-harness-context-enforcement]] | How to enforce context-efficient behavior in agentic harnesses |
| [[hybrid-code-search]] | BM25 + embeddings + RRF fusion for best-of-both-worlds code search |
| [[agent-search-enforcement]] | Strategies to force AI agents to use semantic search over grep/cat |
| [[mcp-tool-routing]] | Using MCP to register semantic search as first-class agent tool |
| [[consensus-debate]] | Multi-agent dialectical debate protocol for harness decisions |
| [[pi-messenger-analysis]] | Analysis of pi-messenger: what we adopt, what we strip for harness |

## Components
*(Index of components will go here)*

## Entities

| Entity | Summary |
|--------|---------|
| [[lean-ctx]] | Context Runtime for AI Agents |
| [[ck-tool]] | Hybrid code search tool, Rust, 1.6k ⭐, MCP-native |
| [[vgrep-tool]] | Vector embedding search engine, Rust, 144 ⭐ |

## Questions / Research

| Question | Summary |
|----------|---------|
| [[Research: context-mode vs lean-ctx]] | context-mode vs lean-ctx comparison + "Think in Code" enforcement |
| [[Research: semantic code search tools]] | Self-hosted semantic code search for AI coding agents |
| [[research-agent-first-codebase-exploration]] | Rethinking OSS codebase strategies for AI agents |
| [[research-wozcode-token-reduction]] | WOZCODE architecture analysis and harness integration plan |
| [[research-gitingest-gitreverse-integration]] | Evaluation of GitIngest and GitReverse for harness integration |

## Sources

| Source | Type | Summary |
|--------|------|---------|
| [[ck-semantic-search]] | docs | Official ck documentation (BeaconBay, 2025-2026) |
| [[vgrep-semantic-search]] | readme | vgrep GitHub readme and docs (CortexLM, 2025-2026) |
| [[context-mode-website]] | website | context-mode.com landing page |
| [[leanctx-website]] | website | leanctx.com landing page |
| [[think-in-code-blog]] | blog | "Think in Code" by B. Mert Köseoğlu |
| [[oss-guide-codebase-exploration]] | blog | Human-centric OSS codebase exploration guide (2020) |
| [[aider-repomap-tree-sitter]] | blog | Tree-sitter + graph ranking for LLM code context |
| [[swe-agent-aci]] | paper | Agent-Computer Interfaces concept (2024) |
| [[swe-bench]] | paper | Real-world software engineering benchmark (2023) |
| [[openhands-platform]] | paper | Open platform for AI developer agents (2024) |
| [[wozcode]] | product-doc | WOZCODE token-reduction architecture for Claude Code (2026) |
| [[gitingest]] | tool | Codebase-to-structured-text for LLM context ingestion |
| [[gitreverse]] | tool | Repo-to-synthetic-prompt via OpenRouter LLM |

## Dependencies
*(Index of dependencies will go here)*

## Flows
| Flow | Summary |
|------|---------|
| [[harness-wiki-pipeline]] | Read-first/write-after data flow between harness and wiki |
| [[consensus-debate-flow]] | Multi-agent debate flow: transport, protocol, integration with harness layers |