# Research: ck vs SeaGOAT vs grepai for Semantic Local-First Code Search

**Date:** 2026-05-08
**Rounds:** 2 | **Sources:** 21 | **Graph Nodes:** 380 | **Graph Edges:** 359 | **Communities:** 43

## Overview

Three leading open-source tools compete for local-first semantic code search: **ck** (Rust, hybrid BM25+embeddings), **SeaGOAT** (Python, ChromaDB+ripgrep), and **grepai** (Go, external embedding providers+call graphs). All share the same core premise: replace literal grep with meaning-based search that understands "find the auth logic" without knowing function names. They diverge sharply on architecture, maturity, embedding strategy, and AI agent integration. The surprise fourth contender, **mgrep** (TypeScript, 4.1k stars), leads in community size and multimodal scope.

No published head-to-head benchmark between ck, SeaGOAT, and grepai exists. The only quantitative comparison is grepai's self-benchmark against plain grep on Claude Code, showing -97% input tokens, -55% tool calls, and -27.5% API cost.

## God Nodes (Core Concepts)

From the graph's highest-degree nodes:
- **7 Best Vector Databases in 2025 - Truefoundry** (43 edges): Positions the broader vector search landscape these tools inhabit
- **ck GitHub README** (36 edges): Most feature-documented tool; hybrid search, MCP, TUI, grep compatibility
- **SeaGOAT GitHub README** (32 edges): Pioneer of the category; server-based architecture, ChromaDB foundation
- **llm-agents.nix** (28 edges): Nix packaging for coding agents; signals the ecosystem integration angle
- **mgrep GitHub README** (24 edges): Largest community; multimodal, web search, calm-CLI philosophy
- **grepai Benchmark** (13 edges): Only quantitative comparison data in the entire corpus
- **grepai GitHub README** (13 edges): Strongest AI agent narrative; call graph tracing unique

## Surprising Connections

- **mgrep emerged as the largest player** (4.1k stars vs 1.7k/1.6k/1.3k for the three tools under comparison), yet was absent from the initial search query. The graph surfaced it as a god node with significant edge count.
- **None of the three tools compete directly with each other** — they target different layers: ck targets the grep-replacement CLI, SeaGOAT targets the server+database pattern, grepai targets the AI agent pipeline with call graphs. The community fragmentation is a feature, not a gap.
- **ck's grep-compatible CLI is strategically overloaded** — HN discussion revealed the design decision: AI agents already understand grep semantics, so adding `--sem` and `--hybrid` flags means zero learning curve for agent integration.
- **grepai's claim of 97% token reduction is real but narrow** — the benchmark shows it eliminates subagent spawning entirely (5→0), which is the dominant factor. On cache-read-dominated workloads, the cost savings narrow to 27.5%.

## Community Structure

The graph identified 43 communities. Key clusters:
- **Community 0** (42 nodes): Vector database landscape — Pinecone, Weaviate, Milvus, Chroma, Qdrant, Vespa, Elasticsearch
- **Community 1** (41 nodes): SeaGOAT documentation and FAQ — server management, language support, configuration
- **Community 2** (38 nodes): Vector search engine comparison criteria — architecture, benchmarking, ecosystem
- **Community 4** (32 nodes): mgrep setup and CLI usage — indexing, search, configuration
- **Community 5** (23 nodes): grepai installation and completions — brew, shell scripts, embedding setup
- **Community 8** (16 nodes): ck features and metadata — indexing, language coverage, license
- **Community 9** (13 nodes): grepai benchmark methodology — token economics, test questions, cost breakdown
- **Community 10** (10 nodes): grepai value proposition — AI agent integration, privacy, call graphs

## Key Findings

### 1. Architectural Divergence Defines the Category

| Dimension | **ck** | **SeaGOAT** | **grepai** | **mgrep** |
|-----------|---------|-------------|------------|-----------|
| Language | Rust | Python | Go (C) | TypeScript |
| Stars | 1.6k | 1.3k | 1.7k | 4.1k |
| Releases | 16 (v0.7.4) | 189 (v0.54.17) | 50 (v0.35.0) | Unknown |
| Embedding | Local: BGE-Small, mxbai, nomic, jina | Local: ChromaDB (all-MiniLM-L6-v2) | External: Ollama, LM Studio, OpenAI | Remote: Mixedbread API |
| Search Modes | Semantic + Regex + Hybrid (RRF) | Semantic + Regex (ripgrep) | Semantic + Call Graph | Semantic + Web Search |
| Agent Integration | MCP server, JSONL output, grep-compatible CLI | Server API (remote capable) | MCP server, daemon file watcher | Claude plugin, MCP |
| Code Understanding | Tree-sitter AST chunking (8+ langs) | Extension-based filtering (12+ types) | File watcher auto-index | Built-in parsers |
| Index Approach | Chunk-level incremental (80-90% cache hit) | Server-based, intentionally throttled | Daemon with file watcher | Background watch mode |
| Unique Feature | TUI (ratatui), grep drop-in compatibility | Most mature, server can be shared | Call graph tracing (who calls X) | Multimodal (code, images, PDFs), web search |

### 2. The Grep Compatibility Strategy is Validated

ck's decision to mirror grep flags (`-i`, `-n`, `-A`, `-B`, `-l`, `-R`, `--exclude`) was initially criticized on HN ("If I want grep, I'll use grep"). But the strategy was confirmed as correct: AI agents like Claude Code are heavily optimized for grep tool calls. Adding `--sem` and `--hybrid` as opt-in flags means agents don't need retraining — they discover the capability organically. grepai takes the opposite approach (entirely new CLI), which creates friction but enables call-graph tracing as a differentiated feature.

### 3. Embedding Strategy is the Core Trade-off

- **ck** bundles embeddings locally (FastEmbed + ONNX), trading initial model download (~100MB) for zero runtime dependencies. Supports 4 models with model switching.
- **SeaGOAT** uses ChromaDB's default embedding (all-MiniLM-L6-v2), which is well-established but not code-optimized. The model is not user-switchable.
- **grepai** outsources embedding to external providers (Ollama, LM Studio, OpenAI), trading zero embedding management for an external dependency. This is pragmatic for users who already run Ollama.
- **mgrep** uses Mixedbread's proprietary API embeddings, making it the only non-fully-local option.

### 4. The AI Agent Integration Story is Uneven

- **grepai** has the strongest narrative: benchmarked on Claude Code, Reddit post with 280K+ views, explicit call-graph tracing ("who calls this function before I change it"). The daemon pattern (continuous indexing via file watcher) is purpose-built for agent workflows.
- **ck** has the most complete technical integration: MCP server with 6 tools, JSONL streaming output, pagination, snippet controls. But its marketing around agents is understated compared to grepai.
- **SeaGOAT** predates the current AI agent wave (2023 launch). Its server-based architecture supports remote queries and team sharing, but it lacks MCP or explicit agent documentation.
- **mgrep** has Claude Code plugin and calm-CLI philosophy. The multimodal angle (search images and PDFs alongside code) is unique.

### 5. Benchmark Data is Scarce but Suggestive

The grepai benchmark on the Excalidraw codebase (155K LOC TypeScript) is the only quantitative comparison:

| Metric | grep-only | grepai | Change |
|--------|-----------|--------|--------|
| Subagents | 5 | 0 | -100% |
| Tool calls | 139 | 62 | -55% |
| Input tokens | 51,147 | 1,326 | -97% |
| Cache creation tokens | 563,883 | 162,289 | -71% |
| API cost | $6.78 | $4.92 | -27.5% |

Key caveat: the benchmark was conducted by the grepai maintainer. The dominant savings mechanism is subagent elimination (each subagent spawns a fresh context requiring cache creation at 1.25× premium). The 97% input token reduction is real but narrow — cache-read tokens (90% cheaper) dominate total cost, so the net API cost reduction is 27.5%, not 97%.

### 6. Community Sentiment

- **ck**: HN launch (179 points, 78 comments) — early performance issues (M2 fan spinning) since resolved. Community contributed Ruby and Zig language support. Active maintainer responsiveness praised.
- **SeaGOAT**: HN launch (240 points, 39 comments) — praised as pioneer but criticized for slow initial indexing. Users requested CUDA acceleration, multi-repo support, and configurable file extensions.
- **grepai**: Reddit launch (280K+ views) — strongest community reaction. Users reported immediate value: "It works great! Takes 5 minutes to install. Crazy!" The token reduction claim resonated with Claude Code users hitting plan limits.
- **mgrep**: Medium review ("250% better results") and 4.1k stars suggest quiet but substantial adoption. Calm-CLI positioning appeals to developers tired of over-engineered tooling.

## Contradictions

- **ck claims grep-compatible CLI is essential; grepai argues for a new paradigm.** ck's approach reduces friction for AI agents (they already know grep). grepai's approach enables unique features (call graph tracing) that don't fit grep's model. Both are valid — the disagreement reveals different target users: ck for developers who want a better grep, grepai for AI agent pipelines specifically.
- **SeaGOAT's server requirement vs ck's zero-daemon approach.** SeaGOAT needs a running server (by design, for speed). ck indexes on first search (transparent to user). HN users found SeaGOAT's server unintuitive but appreciated the remote-server capability it enables.
- **"Local-first" means different things.** ck and SeaGOAT are fully offline (embeddings run locally). grepai requires an external embedding provider but runs code search locally. mgrep uses a remote API for embeddings. The term is aspirational, not absolute.

## Open Questions

- **No independent head-to-head benchmark exists.** The only comparison data comes from a tool maintainer. An independent benchmark on the same codebase with identical queries across ck, SeaGOAT, and grepai would be high-value.
- **Embedding model quality for code search is unmeasured.** Each tool uses a different model. Which produces better search relevance for code-specific queries? No published comparison.
- **Performance at scale (>1M LOC) is undocumented.** ck claims ~1M LOC in 2 minutes. SeaGOAT intentionally throttles indexing. grepai's daemon approach is unbenchmarked at scale.
- **LSP integration could be a game-changer.** HN comments noted that LSP-aware tools (Serena) outperform raw indexed stores. None of the three tools integrate with language servers yet. ck's tree-sitter chunking is the closest approximation.
- **The category may consolidate around MCP.** All three tools now support or plan MCP. If MCP becomes the standard AI agent interface, the grep-compatible CLI advantage erodes, and the differentiator becomes MCP tool quality and call-graph capabilities.

## Graph Statistics

- Total nodes: 380
- Total edges: 359
- Communities: 43 (18 shown in report, 25 thin)
- Token reduction: 8.3× vs naive full-corpus approach
- God nodes: 7 Best Vector Databases, ck README, SeaGOAT README, llm-agents.nix, mgrep README, grepai Benchmark, grepai README

## Recommendation for Ultimate Pi

**ck** is the right default for the Ultimate Pi coding agent based on this research:

1. **Grep-compatible CLI** means zero retraining for agents that already use grep (which is every coding agent)
2. **Hybrid search (BM25 + semantic with RRF)** provides the best of both worlds — exact matches when you know the name, semantic matches when you don't
3. **MCP server** with pagination and JSONL output is purpose-built for agent consumption
4. **Tree-sitter chunking** provides AST-aware code segmentation that SeaGOAT and grepai lack
5. **Zero external dependencies** (no Ollama, no API keys, no server) fits the local-first philosophy
6. **Chunk-level incremental indexing** with 80-90% cache hit rate keeps repeated searches fast

Consider **grepai** as a secondary tool specifically for call-graph tracing (`grepai trace callers "FunctionName"`), which ck doesn't offer.

## Sources

21 source files in `./raw/`:

| File | Description |
|------|-------------|
| `github.com_BeaconBay_ck.md` | ck GitHub README — full feature list, architecture, performance |
| `beaconbay.github.io_ck_.md` | ck documentation site |
| `github.com_kantord_SeaGOAT.md` | SeaGOAT GitHub README — installation, FAQ, server management |
| `kantord.github.io_SeaGOAT_0.22.x_.md` | SeaGOAT documentation site |
| `github.com_yoanbernabeu_grepai.md` | grepai GitHub README — features, installation, why grepai |
| `yoanbernabeu.github.io_grepai.md` | grepai documentation site — AI agent integration, MCP setup |
| `yoanbernabeu.github.io_grepai_blog_benchmark-grepai-vs-grep-claude-code_.md` | grepai benchmark — token economics, cost breakdown, methodology |
| `news.ycombinator.com_item_id=37583219.md` | SeaGOAT Show HN (240 points, 39 comments) — community feedback |
| `news.ycombinator.com_item_id=45157223.md` | ck Show HN (179 points, 78 comments) — community discussion, LSP debate |
| `reddit_grepai_claude_tokens.md` | Reddit grepai launch (280K+ views) — user testimonials |
| `reddit_demongrep.md` | Reddit demongrep — osgrep rewrite in Rust, hybrid search |
| `github.com_mixedbread-ai_mgrep.md` | mgrep GitHub README — multimodal, calm-CLI, 4.1k stars |
| `medium.com_coding-nexus_me-and-claude-are-in-love-with-mgrep-for-250-better-resu.md` | mgrep review — user experience, 250% improvement claim |
| `www.truefoundry.com_blog_best-vector-databases.md` | Vector database comparison — Pinecone, Weaviate, Milvus, Chroma, Qdrant |
| `medium_vector-search-comparison.md` | Vector search engine comparison — architecture, benchmarking |
| `www.linkedin.com_posts_antaripa-saha_being-a-heavy-user-of-ai-coding-tools-like-.md` | LinkedIn post — grep-based vs semantic search for coding agents |
| `www.linkedin.com_posts_bigaddict_ai-rust-semanticsearch-activity-737044081769147.md` | LinkedIn post — discover ck tool announcement |
| `www.linkedin.com_posts_curiouslearner_10-github-repos-that-actually-earn-their-a.md` | LinkedIn post — 10 GitHub repos for Claude Code workflow |
| `github.com_numtide_llm-agents.nix.md` | llm-agents.nix — Nix packages for AI coding agents ecosystem |
| `github.com_topics_vector-embeddings.md` | GitHub topics — vector embeddings ecosystem overview |
| `www.reddit.com_r_ClaudeAI_comments_1qiv0d3_open_source_i_reduced_claude_code_inp.md` | Reddit grepai discussion (duplicate, richer markdown) |
