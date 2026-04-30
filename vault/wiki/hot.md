---
type: meta
title: "Hot Cache"
updated: 2026-04-30T10:00:00
created: 2026-04-30
tags: []
---

# Recent Context

## Last Updated
2026-04-30. pi-lean-ctx native package adopted, custom extension dropped. Wiki lives at vault/wiki/.

## pi-lean-ctx native integration (2026-04-30)

**Verdict**: Adopted. Custom extension dropped.

- `extensions/lean-ctx-enforce.ts` deleted; replaced by `pi-lean-ctx@3.4.5` npm package
- Now get: 48 MCP tools, auto read-mode selection, spawnHook bash wrapping, ls/find/grep tools, compression stats, MCP reconnect
- See [[2026-04-30-pi-lean-ctx-native]] for full ADR

## Semantic Code Search Tools

**Verdict**: Install ck. Enforce with 3-layer defense.

**ck (BeaconBay/ck)** — 1,572 ⭐, Rust, MIT/Apache-2.0:
- Best at: drop-in grep replacement with `--sem` and `--hybrid` modes, MCP server (`ck --serve`), fully offline
- Limitations: no code-aware embeddings (uses fastembed), no custom model training, 80-language max tree-sitter support, 4-8GB RAM for 10M+ LOC
- Install: `npm install -g @beaconbay/ck-search` then `claude mcp add ck-search -s user -- ck --serve`

**vgrep** (144 ⭐) — Strong alternative architecturally (client-server, GPU acceleration) but lacks MCP, grep compatibility, and hybrid search. Not recommended as primary.

**Agent enforcement — 3-layer defense**:
1. System prompt (AGENTS.md): "NEVER use raw grep for codebase exploration. Use ck --sem or ck --hybrid."
2. MCP registration: Register ck as first-class tool. Agent sees `ck_search` alongside `bash`.
3. Harness routing: Add pre-exec hook to lean-ctx bash tool for grep → ck interception.

## Context Mode vs LeanCTX

**Verdict**: Don't replace. Complement.

**context-mode** (11K stars, 48K npm/month):
- Best at: Sandbox enforcement, Think in Code paradigm, intercept-and-block architecture
- Weakness: ELv2 license (not open source), TypeScript runtime overhead, less governance

**lean-ctx** (924 stars, 3K crates.io):
- Best at: Intelligent compression (AST + patterns), agent governance (profiles/budgets/SLOs), Rust binary + Apache 2.0
- Weakness: No mandatory Think in Code enforcement, smaller community, newer

**For ultimate-pi harness**:
- lean-ctx is now the compression + governance layer via [[2026-04-30-pi-lean-ctx-native|pi-lean-ctx native package]]
- Add "Think in Code" rules to AGENTS.md (from context-mode's playbook)

## Key Recent Facts

### GitIngest Integration (New)
- **Gitingest**: Converts any Git repo into structured LLM-ready text (summary + tree + files). Python package, CLI, web UI. Public + private repos. No LLM dependency.
- **GitReverse**: Generates synthetic user prompts FROM repos via OpenRouter LLM. Metadata-only, no code analysis. NOT useful for harness.
- **Recommendation**: Integrate Gitingest via `/gitingest` skill (renamed from `/ingest` to avoid clash with `wiki-ingest`). MVP via direct bash wrapping. Skip GitReverse.
- **Concept**: [[codebase-to-context-ingestion]] — converting entire codebases into structured LLM context. Complements lean-ctx (file-by-file) with bulk ingestion.
- **Open questions**: Max repo size handling, lean-ctx AST compression on Gitingest output, GitHub API rate limits.

### WOZCODE Architecture (New)
- **Three compounding levers**: Smarter search (AST truncation) → fuzzy edits (near-miss tolerance) → quality loop (inline validation). Each lever compounds the next.
- **25-55% token reduction** claimed, measured from live Anthropic API usage fields.
- **AST truncation**: Return function signatures, stub bodies. Reduces input tokens 70-90% per file explored.
- **Fuzzy edit matching**: Tolerates whitespace drift, indentation, curly vs straight quotes. Eliminates retry round-trips.
- **Inline post-edit validation**: TS compiler, linters, parsers run after each edit — before model sees errors. Catches syntax errors at tool layer.
- **Haiku subagents**: ~40% of coding work is read-only exploration → routed to Haiku (15× cheaper than Opus). Frontier model reserved for code generation.
- **100% local**: Code never leaves machine. WOZCODE in loop for tool execution, not API transport.

### Harness Changes Required (5 Fundamental)
1. **Model router layer**: Cross-cutting component between L7 (orchestration) and L3/L8 (execution) — dispatch operations to different models
2. **Inline validation pipeline**: Interpose after each tool invocation, not after phase complete. Tighter feedback loop.
3. **AST-aware tool primitives**: `read`, `search`, `grep` become AST-aware. Tree-sitter at tool layer.
4. **Non-exact tool matching**: Edit contract changes from "exact string match" to "fuzzy match with exact fallback." Semantic change to core primitive.
5. **Tool result intermediation**: Pipeline intercepts results, runs validators, attempts auto-fixes, then surfaces to model.

## Recent Changes
- Created: [[research-wozcode-token-reduction]] (synthesis), [[wozcode]] (source)
- Created concepts: [[ast-truncation]], [[fuzzy-edit-matching]], [[inline-post-edit-validation]], [[model-routing-agents]]
- Updated: [[harness-implementation-plan]] (added Phases 10-13, revised token budget, architecture changes section)
- Updated: [[index]] (added concepts, research, sources), [[log]] (autoresearch entry)

## Active Threads
- **Harness Phase 10**: AST truncation — leverage existing tree-sitter infra from repo-map-ranking
- **Harness Phase 11**: Fuzzy edit matching — add normalization layer to edit tool
- **Harness Phase 12**: Inline post-edit validation — add post-edit-validate hook to L3 grounding checkpoints
- **Harness Phase 13**: Haiku model router — new ModelRouter component, woz:explore subagent
- **Revised token budget**: ~17,500 → ~12,500-15,000 tokens per subtask (15-30% overhead reduction)
- **Open questions**: AST truncation on dynamic languages, fuzzy matching false-positive rate, Haiku hallucination risk in summaries

## Previous Context (Agent-First Codebase Exploration)
- Agent-Codebase Interface (ACI): Humans use projects; agents map them.
- Progressive Disclosure (L0-L3): Project map → symbol map → file context → deep context
- Repo Map Ranking: Graph centrality beats git-log churn for identifying important code
- 3 agent-superior capabilities: Symbol ingestion, cross-reference tracking, multi-file correlation
- 3 agent-weak areas: No visual patterns, fixed context windows, no cross-session learning without persistent memory
