# Codebase Map & Architecture Wiki

## Overview
This wiki maps the codebase architecture, tracks key software design decisions, and serves as the persistent memory layer for the ultimate-pi agentic harness. See [[harness-implementation-plan]] for the authoritative master plan.

## Harness Pipeline

| Layer | Module | Summary |
|-------|--------|---------|
| — | [[harness]] | 8-layer mandatory pipeline with drift monitor + cross-cutting tool enhancements |
| — | [[harness-implementation-plan]] | Master build plan: 27 phases, unified token budget, all research integrated |
| L1 | [[spec-hardening]] | Block execution until ambiguities resolved |
| L2 | [[structured-planning]] | Machine-readable task DAG + sprint contracts |
| L2.5 | [[drift-detection-unified]] | Runtime drift monitor: 3 paradigms (tool-call, spec, implementation) |
| L3 | [[grounding-checkpoints]] | Smallest verifiable change + spec-drift detection |
| L3 | [[think-in-code-enforcement]] | Mandatory code-over-data paradigm at tool layer |
| L4 | [[adversarial-verification]] | Critic agents attack with hard-threshold pass/fail |
| L5 | [[automated-observability]] | Instrumentation is definition-of-done |
| L6 | [[persistent-memory]] | claude-obsidian wiki as knowledge base |
| L7 | [[schema-orchestration]] | Archon workflow DAG, enforces wiki contract |
| L8 | [[wiki-query-interface]] | LLM-native search via claude-obsidian skills |

## Pipeline Integration

| Page | Summary |
|------|---------|
| [[harness-wiki-skill-mapping]] | Skill-to-layer contract: which wiki skill fires when |
| [[harness-wiki-pipeline]] | Read-first/write-after data flow between harness and wiki |

## Decisions

| Decision | Status | Summary |
|----------|--------|---------|
| [[adr-008]] | active | Spec-Only Black-Box QA |
| [[adr-009]] | active | claude-obsidian Mode B for Persistent Memory |
| [[adr-010]] | active | Agentic Harness ↔ Wiki Tight-Coupling Contract |
| [[adr-011]] | accepted | Multi-Agent Consensus Debate with Selective Routing (iMAD) |
| [[2026-04-30-pi-lean-ctx-native]] | active | Adopt pi-lean-ctx native package, drop custom extension |
| [[colocate-wiki]] | active | Co-locating Wiki with Codebase |

## Formal Models & Control Frameworks

| Framework | Summary |
|-----------|---------|
| [[harness-control-frameworks]] | Unified view: H-Formalism + Feedforward-Feedback + Generator-Evaluator |
| [[harness-h-formalism]] | H = (E, T, C, S, L, V) — 6-component formal model |
| [[feedforward-feedback-harness]] | Guides + Sensors, Computational + Inferential |
| [[generator-evaluator-architecture]] | GAN-inspired separation of generator and evaluator agents |
| [[model-adaptive-harness]] | Harness varies behavior by model profile (entry point) |
| [[harness-configuration-layers]] | Four-layer config: Signal, Gate, Channel, Completion (detailed tables) |
| [[self-evolving-harness]] | Auto-synthesis and meta-optimization of harness code |

## Concepts — Execution & Drift

| Concept | Summary |
|---------|---------|
| [[drift-detection-unified]] | Three complementary drift paradigms at L2.5, L3, L4 |
| [[context-drift-in-agents]] | Progressive degradation of agent behavior over extended interactions |
| [[meta-agent-context-pruning]] | Detect stuck → prune dead context → restart agent (novel synthesis) |
| [[agent-loop-detection-patterns]] | Production patterns: repetition, ping-pong, retry-without-progress |
| [[guardian-agent-pattern]] | Pre-execution and post-execution safety validation |
| [[context-anxiety]] | Models rush to finish as context window fills |
| [[verification-drift-detection]] | Stub — see [[grounding-checkpoints]] |

## Concepts — Context & Search

| Concept | Summary |
|---------|---------|
| [[think-in-code]] | Paradigm: write code to process data, not read raw data |
| [[agentic-harness-context-enforcement]] | 5-layer enforcement for context-efficient behavior |
| [[context-mode]] | FTS5 sandbox architecture for tool output |
| [[lean-ctx]] | Context Runtime with AST compression and 90+ shell patterns |
| [[context-continuity]] | Session state preservation across context compaction |
| [[ast-compression]] | Tree-sitter signature extraction, 60-95% reduction |
| [[shell-pattern-compression]] | 90+ command patterns (git, npm, cargo, docker) auto-compressed |
| [[fts5-sandbox]] | context-mode intercept-and-sandbox architecture |
| [[ast-truncation]] | Stubbing function bodies at AST level for token-efficient reading |
| [[fuzzy-edit-matching]] | Diff algorithm tolerating formatting drift |
| [[inline-post-edit-validation]] | Syntax-only post-edit compiler/parser check (<2s) |
| [[hybrid-code-search]] | BM25 + embeddings + RRF fusion |
| [[agent-search-enforcement]] | 3-layer defense to force semantic search over grep/cat |
| [[mcp-tool-routing]] | MCP protocol for semantic search as first-class agent tool |
| [[codebase-to-context-ingestion]] | Converting entire codebases into structured LLM context |

## Concepts — Agent Architecture

| Concept | Summary |
|---------|---------|
| [[agentic-harness]] | Central execution pipeline concept |
| [[consensus-debate]] | Multi-agent dialectical debate protocol for harness decisions |
| [[selective-debate-routing]] | iMAD: trigger debate only when beneficial (92% token savings) |
| [[agent-codebase-interface]] | Designing tool interfaces for AI agents, not humans |
| [[progressive-disclosure-agents]] | Layered codebase information (L0-L3) within token budgets |
| [[repo-map-ranking]] | Graph centrality algorithm for selecting important symbols |
| [[execution-feedback-loop]] | Agent debug-test-iterate cycle via structured test output |
| [[model-routing-agents]] | Dispatching exploration to cheap models, code gen to frontier |
| [[pi-messenger-analysis]] | What we adopt/strip from pi-messenger for consensus transport |

## Modules — Other

| Module | Summary |
|--------|---------|
| [[skills]] | Agent capability plugins |
| [[extensions]] | Programmatic hooks |
| [[bench]] | Evaluation tools (terminal-bench) |

## Entities

| Entity | Summary |
|--------|---------|
| [[lean-ctx]] | Context Runtime for AI Agents — adopted via pi-lean-ctx native |
| [[ck-tool]] | Hybrid code search tool, Rust, 1.6k ⭐, MCP-native |
| [[vgrep-tool]] | Vector embedding search engine, Rust, 144 ⭐ |
| [[autodev-codebase]] | TypeScript MCP server with call graphs + Ollama embeddings |
| [[ops-codegraph-tool]] | Python dependency graph engine + semantic search |
| [[codesearch]] | Rust MCP server for Claude Code/OpenCode |

## Research Syntheses

| Synthesis | Summary |
|-----------|---------|
| [[Research: Model-Adaptive Agent Harness Design]] | Four-layer harness must be specialized per model |
| [[Research: context-mode vs lean-ctx]] | context-mode vs lean-ctx + Think in Code enforcement |
| [[Research: semantic code search tools]] | Self-hosted semantic code search — ck recommended |
| [[research-agent-first-codebase-exploration]] | Rethinking OSS strategies for AI agents (ACI design) |
| [[research-wozcode-token-reduction]] | WOZCODE architecture analysis and harness integration |
| [[research-gitingest-gitreverse-integration]] | Gitingest adopted, GitReverse skipped |
| [[Research: Meta-Agent Context Drift Detection]] | Novel synthesis: detect → prune → restart |
| [[research-agentic-coding-harness-latest-papers]] | 5 pipeline improvements, 3 future phases, formal H-model |

## Sources (External Research)

| Source | Type | Summary |
|--------|------|---------|
| [[meng2026-agent-harness-survey]] | paper | H=(E,T,C,S,L,V), 110+ papers, 23 systems |
| [[anthropic2026-harness-design]] | blog | GAN-inspired generator-evaluator architecture |
| [[bockeler2026-harness-engineering]] | blog | Feedforward/feedback controls (Martin Fowler) |
| [[forgecode-gpt5-agent-improvements]] | blog | Model-adaptive harness findings (GPT 5.4 vs Opus 4.6) |
| [[lou2026-autoharness]] | paper | AutoHarness: LLM synthesizes harness from feedback |
| [[lee2026-meta-harness]] | paper | Meta-Harness: outer-loop harness optimization |
| [[fan2025-imad]] | paper | iMAD: selective debate routing, 92% token savings |
| [[ironclaw-drift-monitor]] | github-issue | Rule-based stuck-pattern detection (nearai/ironclaw #1634) |
| [[langsight-loop-detection]] | blog | Production loop detection with argument hashing |
| [[agent-drift-academic-paper]] | paper | Agent Drift: ASI framework, 42% task success reduction |
| [[vectara-guardian-agents]] | blog | Guardian Agents benchmark (~900 scenarios, 6 domains) |
| [[wozcode]] | product-doc | WOZCODE token-reduction architecture (25-55% savings) |
| [[ck-semantic-search]] | docs | ck hybrid code search documentation |
| [[vgrep-semantic-search]] | readme | vgrep vector embedding search |
| [[context-mode-website]] | website | context-mode.com landing page |
| [[leanctx-website]] | website | leanctx.com landing page |
| [[think-in-code-blog]] | blog | "Think in Code" by B. Mert Köseoğlu |
| [[gitingest]] | tool | Codebase-to-structured-text for LLM context |
| [[gitreverse]] | tool | Repo-to-synthetic-prompt (not adopted) |
| [[aider-repomap-tree-sitter]] | blog | Tree-sitter + graph ranking for LLM code context |
| [[swe-agent-aci]] | paper | Agent-Computer Interfaces concept (2024) |
| [[swe-bench]] | paper | Real-world software engineering benchmark |
| [[openhands-platform]] | paper | Open platform for AI developer agents |
| [[oss-guide-codebase-exploration]] | blog | Human-centric OSS codebase exploration guide |

## Flows

| Flow | Summary |
|------|---------|
| [[harness-wiki-pipeline]] | Read-first/write-after data flow between harness and wiki |
