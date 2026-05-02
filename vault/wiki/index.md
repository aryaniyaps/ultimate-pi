---
type: index
status: active
created: 2026-04-28
updated: 2026-05-02
tags: [meta, index, catalog]
---

# Codebase Map & Architecture Wiki

## Overview
This wiki maps the codebase architecture, tracks key software design decisions, and serves as the persistent memory layer for the ultimate-pi agentic harness. See [[harness-implementation-plan]] for the authoritative master plan.

## Harness Pipeline

| Layer | Module | Summary |
|-------|--------|---------|
| — | [[harness]] | 8-layer mandatory pipeline with drift monitor + cross-cutting tool enhancements |
| — | [[harness-implementation-plan]] | Master build plan: 42 phases, unified token budget, all research integrated (Codex, Cursor, Antigravity, Claude Code) |
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
| [[model-adaptive-harness]] | Harness generates provider-native prompts (v2 redesign, May 2026) |
| [[provider-native-prompting]] | Generate prompts optimized for each provider's official conventions |
| [[Prompt Renderer]] | Build-time compilation: base spec → per-model prompts via pluggable renderers |
| [[Build-Time Prompt Compilation]] | Compile prompts at build time, ship as static JSON in npm — zero runtime cost |
| [[harness-configuration-layers]] | Four-layer config: Signal, Gate, Channel, Completion — now provider-native (v2) |
| [[self-evolving-harness]] | Auto-synthesis and meta-optimization of harness code |

## Concepts — Execution & Drift

| Concept | Summary |
|---------|---------|
| [[drift-detection-unified]] | Three complementary drift paradigms at L2.5, L3, L4 |
| [[context-drift-in-agents]] | Progressive degradation of agent behavior over extended interactions |
| [[meta-agent-context-pruning]] | Detect stuck → prune dead context → restart agent (novel synthesis) |
| [[agent-loop-detection-patterns]] | Production patterns: repetition, ping-pong, retry-without-progress |
| [[guardian-agent-pattern]] | Pre-execution and post-execution safety validation |
| [[codex-harness-innovations]] | Codex innovations: 10 patterns cataloged from open-source Rust agent, first-principles analysis |
| [[codebase-intelligence-harness-integration]] | 7-point integration map for fallow codebase intelligence in harness pipeline |
| [[codebase-intelligence-ecosystem-comparison]] | Cross-language gap analysis: no ecosystem has fallow-equivalent |
| [[cursor-harness-innovations]] | 10 Cursor innovations cataloged with first-principles analysis for harness integration |
| [[context-anxiety]] | Models rush to finish as context window fills |
| [[verification-drift-detection]] | Stub — see [[grounding-checkpoints]] |
| [[fork-safe-spec-storage]] | Fork isolation: gitignored cache + `harness init` bootstrap |
| [[content-addressed-spec-identity]] | Content-hash spec identity + `harness migrate` transfer-on-merge |
| [[harness-engineering-first-principles]] | Synthesized 12 first principles from Fowler, OpenAI, LangChain, Augment |
| [[agent-skills-pattern]] | Progressive disclosure: skills loaded on-demand to prevent context rot |
| [[policy-engine-pattern]] | Pre-execution gates: deterministic constraints vs probabilistic compliance |
| [[gemini-cli-architecture]] | Gemini CLI SOTA: 15 harness innovations, 2-package architecture, weekly releases |

## Concepts — Chunking & Embeddings

| Concept | Summary |
|---------|---------|
| [[AST-Aware Code Chunking]] | Split code at AST boundaries, not character limits; +4.3 Recall@5 |
| [[Contextualized Text Embedding]] | Prepend scope/signatures/imports before embedding raw code |
| [[Late Chunking vs Early Chunking]] | Embed full doc then pool vs embed chunks separately; contextual retrieval is sweet spot |

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
| [[ts-execution-layer]] | Replace flat tool calling with typed TypeScript API + sandboxed runtime (3-4x context reduction) |
| [[mcp-tool-routing]] | MCP protocol for semantic search as first-class agent tool |
| [[codebase-to-context-ingestion]] | Converting entire codebases into structured LLM context |

## Concepts — Agent Architecture

| Concept | Summary |
|---------|---------|
| [[Context Engine (AI Coding)]] | Semantic search engine providing deep codebase understanding |
| [[Semantic Codebase Indexing]] | Converting code to vector embeddings for similarity search |
| [[Dual-Model Agent Architecture]] | Fast model for iteration + deliberative model for selection |
| [[Prompt Enhancement]] | Pre-processing queries with retrieved codebase context |
| [[Majority Vote Ensembling]] | Generate N solutions, LLM selects best |
| [[Contractor vs Employee AI Model]] | Context makes the difference, not intelligence |
| [[agentic-harness]] | Central execution pipeline concept |
| [[consensus-debate]] | Multi-agent dialectical debate protocol for harness decisions |
| [[lifecycle-hooks]] | Tool-level deterministic hooks (30+ events, exit-code semantics, 100% compliance) |
| [[structured-compaction]] | Five-layer compaction with forked subagent, ~85% context reduction |
| [[subagent-worktree-isolation]] | Fresh context windows + isolated git worktrees per subagent |
| [[selective-debate-routing]] | iMAD: trigger debate only when beneficial (92% token savings) |
| [[agent-codebase-interface]] | Designing tool interfaces for AI agents, not humans |
| [[progressive-disclosure-agents]] | Layered codebase information (L0-L3) within token budgets |
| [[repo-map-ranking]] | Graph centrality algorithm for selecting important symbols |
| [[execution-feedback-loop]] | Agent debug-test-iterate cycle via structured test output |
| [[model-routing-agents]] | Dispatching exploration to cheap models, code gen to frontier |
| [[pi-messenger-analysis]] | What we adopt/strip from pi-messenger for consensus transport |

## Concepts — Antigravity Innovations

| Concept | Summary |
|---------|--------|
| [[antigravity-agent-first-architecture]] | Two-view control plane: Editor View + Manager View for multi-agent orchestration |
| [[agent-artifacts-verifiable-deliverables]] | Trust via human-reviewable deliverables instead of raw tool logs |
| [[agent-browser-browser-automation]] | Vercel Labs agent-browser (31.4K stars, Apache 2.0, Rust-native) — browser automation CLI for AI agents. Snapshot + refs, annotated screenshots, structured diff. Replaces browser-harness for P30 May 2026. |
| [[browser-subagent-visual-verification]] | Headless browser agent that visually verifies UI changes (now uses Vercel Labs agent-browser — May 2026) |

## Modules — Other

| Module | Summary |
|--------|---------|
| [[skills]] | Agent capability plugins |
| [[extensions]] | Programmatic hooks |
| [[bench]] | Evaluation tools (terminal-bench) |

## Entities

| Entity | Summary |
|--------|---------|
| [[Augment Code]] | AI coding platform with Context Engine, #1 SWE-bench Pro |
| [[lean-ctx]] | Context Runtime for AI Agents — adopted via pi-lean-ctx native |
| [[ck-tool]] | Hybrid code search tool, Rust, 1.6k ⭐, MCP-native |
| [[vgrep-tool]] | Vector embedding search engine, Rust, 144 ⭐ |
| [[autodev-codebase]] | TypeScript MCP server with call graphs + Ollama embeddings |
| [[ops-codegraph-tool]] | Python dependency graph engine + semantic search |
| [[codesearch]] | Rust MCP server for Claude Code/OpenCode |
| [[javascript-runtimes]] | Node.js (stable, mature), Deno (secure, tooling-rich), Bun (fast, drop-in replacement) |
| [[vitest]] | Vite-native test framework, Jest-compatible, v4.1.5, Oxc-powered TypeScript |

## Concepts — TypeScript & Code Organization

| Concept | Summary |
|---------|--------|
| [[typescript-strict-mode]] | `strict: true` enables 8+ compiler checks that prevent null reference bugs |
| [[barrel-files]] | Re-export files: useful for libraries, harmful for app code (circular imports, 68% module bloat) |
| [[monorepo-architecture]] | Single-repo multi-package: built-package vs internal-packages, Turborepo, ESM rules |
| [[result-monad-error-handling]] | Functional pattern: `Result<Ok, Err>` with map/flatMap/match — errors as values |

## Resolved Questions

| Resolution | Resolves |
|-----------|---------|
| [[resolved-context-pruning-inplace-vs-restart]] | In-place vs restart, cache interaction, chain-of-thought, meta-agent regress |
| [[resolved-treesitter-dynamic-languages]] | Tree-sitter + dynamic languages, 3-layer solution (syntax→types→runtime) |
| [[resolved-imad-debate-gating-transfer]] | iMAD QA→code review transfer, selective routing, model-specific classifiers |
| [[resolved-small-model-meta-agents]] | Haiku/Flash for drift detection, cost analysis, infinite regress resolved |
| [[resolved-mcp-tool-preference]] | MCP priority system (none exists), 3-layer enforcement, false positive rates |
| [[resolved-context-window-economics]] | Token allocation model, monorepo handling, caching, Gitingest questions |

## Research Syntheses

| Synthesis | Summary |
|-----------|---------|
| [[Research: Augment Code Context Engine]] | Context Engine architecture, benchmarks, integration plan for harness |
| [[Research: Model-Adaptive Agent Harness Design]] | Four-layer harness must be specialized per model |
| [[Research: context-mode vs lean-ctx]] | context-mode vs lean-ctx + Think in Code enforcement |
| [[Research: semantic code search tools]] | Self-hosted semantic code search — ck recommended |
| [[research-agent-first-codebase-exploration]] | Rethinking OSS strategies for AI agents (ACI design) |
| [[research-wozcode-token-reduction]] | WOZCODE architecture analysis and harness integration |
| [[research-gitingest-gitreverse-integration]] | Gitingest adopted, GitReverse skipped |
| [[Research: Meta-Agent Context Drift Detection]] | Novel synthesis: detect → prune → restart |
| [[research-agentic-coding-harness-latest-papers]] | 5 pipeline improvements, 3 future phases, formal H-model |
| [[Research: GitHub Issues as Harness Spec Storage]] | GitHub Issues as cloud-persistent spec storage with sub-issues + dependencies |

| [[Research: Codex State-of-the-Art Harness Improvements]] | Codex open-source architecture: 7 validations, 5 new gaps, 3 novel patterns, 5 new phases |
| [[Research: Fallow Codebase Intelligence Harness Integration]] | Fallow: 7 harness integration points, cross-ecosystem gap analysis, P44 phases |
| [[Research: Claude Code State-of-the-Art Harness Improvements]] | Claude Code architecture: 6 gaps, 5 new phases, 4 first principles |
| [[Research: cursor.sh Harness Innovations]] | Cursor production harness: 5 validations, 4 new gaps, first-principles lessons |
| [[Research: Google Antigravity Harness Integration]] | Google Antigravity SOTA: artifacts, browser subagent, agent-first architecture, 3 new phases |
| [[Research: Gemini CLI SOTA Harness Integration]] | Gemini CLI SOTA: 15 innovations mapped, 7 integration priorities from first principles |

| [[Research: TypeScript Execution Layer for Agent Tool Calling]] | TS execution layer: CodeAct → Cloudflare Code Mode → Executor convergence, 3-4x context reduction, P43 phase |
| [[Research: executor.sh Harness Integration]] | executor.sh: integration layer scope, 3 new P43 sub-phases (catalog, discovery, policy), build vs integrate decision |
| [[Research: Prompt Renderer for Multi-Model Agent Harness]] | Build-time prompt renderer: per-model compilation, caching, variable system, npm distribution |
| [[Research: TypeScript Best Practices and Codebase Structure]] | Strict mode, runtimes, barrel files, monorepos, folder structure, error handling, testing |

## Sources (External Research)

| Source | Type | Summary |
|--------|------|---------|
| [[Source: Google Gemini CLI Architecture Docs]] | official-docs | Architecture: 2 packages (cli+core), ReAct loop, tool system |
| [[Source: Google Blog - Gemini CLI Announcement]] | official-announcement | Launch: free tier, 1M token window, MCP, Google Search grounding |
| [[Source: Render AI Coding Agents Benchmark 2025]] | benchmark-report | Independent: Cursor 8/10, Gemini 6.8/10, strengths/weaknesses |
| [[Source: Martin Fowler - Harness Engineering]] | engineering-blog | Canonical: feedforward/feedback, computational/inferential, steering loop |
| [[Source: LangChain - Anatomy of Agent Harness]] | engineering-blog | Agent=Model+Harness, primitives derivation, model-harness co-evolution |
| [[Source: OpenAI Harness Engineering Five Principles]] | engineering-blog | 5 principles from 1M-line agent-built codebase |
| [[Source: Augment - Harness Engineering for AI Coding Agents]] | engineering-blog | PEV loop, constraint layers, measurement metrics |
| [[Source: Gemini CLI Changelogs]] | official-changelog | Feature evolution: v0.4–v0.40 across 40+ weekly releases |
| [[Augment Context Engine Official]] | product-page | Context Engine features, benchmarks, team impact |
| [[Augment SWE-bench Agent GitHub]] | github-repo | #1 open-source SWE-bench agent, dual-model architecture |
| [[Augment SWE-bench Pro Blog]] | blog-post | #1 SWE-bench Pro at 51.80%, same-model comparison |
| [[Augment Code WorkOS ERC 2025]] | conference-recap | Context Engine as prompt enhancer, live demo |
| [[Augment Code Codacy AI Giants]] | podcast-recap | Engineering interview: context strategy, pricing, onboarding |
| [[Augment Code MCP SiliconAngle]] | news-article | MCP launch, 30-80% improvement as context provider |
| [[Auggie Context MCP Server]] | github-repo | Community MCP wrapper for Augment context engine |
| [[meng2026-agent-harness-survey]] | paper | H=(E,T,C,S,L,V), 110+ papers, 23 systems |
| [[anthropic2026-harness-design]] | blog | GAN-inspired generator-evaluator architecture |
| [[bockeler2026-harness-engineering]] | blog | Feedforward/feedback controls (Martin Fowler) |
| [[forgecode-gpt5-agent-improvements]] | blog | Model-adaptive harness findings (GPT 5.4 vs Opus 4.6) |
| [[openai-prompt-guidance]] | official-docs | OpenAI prompt guidance: GPT-5.5 through GPT-4.1 |
| [[anthropic-prompt-best-practices]] | official-docs | Anthropic prompt engineering: Claude Opus 4.7 through Haiku 4.5 |
| [[gemini-3-prompting-guide]] | official-docs | Google Gemini 3 prompting guide on Vertex AI |
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
| [[cast-code-chunking-paper]] | paper | cAST: AST-aware code chunking for RAG, +4.3 Recall@5 (June 2025) |
| [[vectara-chunking-vs-embedding-naacl2025]] | paper | Chunking strategy ≥ embedding model for retrieval quality, NAACL 2025 |
| [[coir-code-retrieval-benchmark]] | paper | CoIR: standard benchmark for code retrieval, ACL 2025, pip-installable |
| [[code-chunk-library-supermemory]] | tool | Production AST-aware code chunking library (npm), tree-sitter based |
| [[embedding-models-benchmark-supermemory-2025]] | benchmark | MiniLM vs BGE vs E5 vs Nomic on BEIR TREC-COVID (June 2025) |
| [[context-mode-website]] | website | context-mode.com landing page |
| [[leanctx-website]] | website | leanctx.com landing page |
| [[think-in-code-blog]] | blog | "Think in Code" by B. Mert Köseoğlu |
| [[gitingest]] | tool | Codebase-to-structured-text for LLM context |
| [[gitreverse]] | tool | Repo-to-synthetic-prompt (not adopted) |
| [[github-sub-issues-docs]] | documentation | GitHub official docs on sub-issues (parent-child hierarchies) |
| [[github-issue-dependencies-docs]] | documentation | GitHub official docs on issue dependencies (blocked-by/blocking) |
| [[gh-sub-issue-extension]] | github-repo | Community gh CLI extension for sub-issue management |
| [[gh-cli-sub-issue-rfc]] | github-issue | Official gh CLI feature request for native sub-issue support |
| [[github-fork-issues-discussion]] | github-discussion | Fork issues enablement evolution (Jun-Dec 2025) |
| [[aider-repomap-tree-sitter]] | blog | Tree-sitter + graph ranking for LLM code context |
| [[swe-agent-aci]] | paper | Agent-Computer Interfaces concept (2024) |
| [[swe-bench]] | paper | Real-world software engineering benchmark |
| [[openhands-platform]] | paper | Open platform for AI developer agents |
| [[oss-guide-codebase-exploration]] | blog | Human-centric OSS codebase exploration guide |
| [[cursor-shadow-workspace-2024]] | engineering-blog | Shadow Workspace: hidden Electron window LSP pre-validation |
| [[cursor-agent-best-practices-2026]] | engineering-blog | Agent best practices: Plan Mode, hooks, skills, context management |
| [[cursor-harness-april-2026]] | engineering-blog | Harness evolution: dynamic context, Keep Rate, error classification |
| [[cursor-shipped-coding-agent-2026]] | engineering-blog | Composer system architecture, MoE, latency, sandboxing |
| [[cursor-instant-apply-2024]] | engineering-blog | Speculative edits: 1000 tok/s, fast apply model, diff problem |
| [[cursor-fork-29b-2025]] | analysis | VS Code fork architecture, vertical agent thesis |
| [[codex-open-source-agent-2026]] | github-repo | Codex CLI: 79.2K stars, Rust, sandboxing, hooks, MCP, skills |
| [[claude-code-architecture-vila-lab-2026]] | academic-paper | VILA-Lab arxiv 2604.14228: comprehensive Claude Code architecture analysis |
| [[claude-code-architecture-qubytes-2026]] | blog | Qubytes: five-layer architecture breakdown (agent loop, permissions, tools, state, compaction) |
| [[claude-code-architecture-karaxai-2026]] | blog | KaraxAI: full stack walkthrough — CLAUDE.md, skills, plugins, MCP, hooks |
| [[codeact-apple-2024]] | paper | CodeAct: 20% higher success rate, 30% fewer turns (ICML 2024) |
| [[cloudflare-codemode]] | official-docs | Cloudflare Code Mode: TypeScript execution layer, Worker sandbox |
| [[executor-rhyssullivan]] | github-repo | Executor: local-first TS runtime, 1.3K stars, cross-agent tool catalog |
| [[colinmcnamara-context-optimization-codemode]] | blog | Context optimization: sub-agents vs TypeScript interfaces |
| [[fallow-rs-codebase-intelligence]] | github-repo | Fallow: Rust-native TS/JS codebase intelligence, 1.7K stars, MIT. Dead code, duplication, complexity, boundaries, MCP server |
| [[google-antigravity-official-blog]] | engineering-blog | Google Antigravity: agent-first IDE, Manager View, Artifacts, Skills |
| [[google-antigravity-wikipedia]] | encyclopedia | Antigravity: VS Code fork, Gemini 3.1, Windsurf $2.4B acquisition |
| [[cursor-vs-antigravity-2026]] | comparison | Cursor v2.6 vs Antigravity v1.20: centaur vs manager, benchmarks |
| [[Source: Build-Time Prompt Compilation Architecture]] | architecture-analysis | Real tools: DIY pipeline (js-yaml + PromptWeaver + per-model renderers), replaces fabricated PromptKit PackC |
| [[Source: Vercel Labs agent-browser]] | official-repo | agent-browser: 31.4K stars, Apache 2.0, Rust-native browser automation CLI for AI agents — snapshot + refs, annotated screenshots, structured diff. Replaces browser-harness for P30. |
| [[Source: browser-harness CDP Harness]] | official-repo | browser-harness: 9.4K stars, MIT, thin CDP harness — self-healing LLM-to-Chrome bridge. SUPERSEDED by agent-browser for P30 (May 2026). |
| [[Source: AgentBus Jinja2 Prompt Pipelines]] | engineering-blog | Jinja2 templating: inheritance, conditionals, loops, pipeline runner |
| [[Source: TianPan Prompt Caching Architecture]] | engineering-blog | Multi-tier caching: semantic→prefix→full, 60-90% savings, cache boundary control |
| [[Source: Arxiv — Don't Break the Cache]] | academic-paper | PwC evaluation: 41-80% cost reduction, system-prompt-only caching optimal |
| [[ts-strict-mode-rishikc]] | article | TypeScript strict mode guide: 8+ sub-flags, migration strategy, ESLint pairing |
| [[ts-runtimes-comparison-betterstack]] | article | Node.js vs Deno vs Bun: benchmarks, tooling, security, TS support (2026) |
| [[barrel-files-tkdodo]] | article | Barrel files cause 68% module bloat, circular imports — stop using in app code |
| [[ts-monorepo-koerselman]] | article | Monorepo patterns: built-package vs internal-packages, Turborepo, ESM, IDE setup |
| [[vitest-official]] | official-docs | Vite-native test framework, Jest-compatible, v4.1.5 |
| [[ts-folder-structure-mingyang]] | article | Production-grade Node.js/TS folder structure: Clean Architecture approach |
| [[ts-best-practices-2025-devto]] | article | TS best practices 2025: type safety, advanced types, linting, tooling |
| [[ts-result-error-handling-kkalamarski]] | article | Result monad pattern for declarative error handling in TypeScript |

## Flows

| Flow | Summary |
|------|---------|
| [[harness-wiki-pipeline]] | Read-first/write-after data flow between harness and wiki |
