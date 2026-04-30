---
type: meta
title: "Hot Cache"
updated: 2026-04-30T14:00:00
created: 2026-04-30
tags: []
status: active
---

# Recent Context

## Last Updated
2026-04-30. Augment embedding/chunking research complete — 3 open questions resolved from [[Research: Augment Code Context Engine]]. See below.

## Augment Code Context Engine Research (2026-04-30)

### Key Findings
- Context Engine: semantic codebase indexing (1M+ files), real-time knowledge graph, not grep/ keyword.
- #1 SWE-bench Pro (51.80%) — same model (Opus 4.5) beats Cursor by 1.59%, Claude Code by 2.05%.
- #1 open-source SWE-bench Verified agent (65.4%) — dual-model: Claude Sonnet 3.7 + OpenAI o1 ensembler.
- Prompt Enhancer: auto-enriches queries with codebase context before LLM sees them.
- Context as MCP: launched Feb 2026 — 30-80% improvement when used as context provider for other agents.
- "Contractor vs Employee" model: context is the bottleneck, not intelligence.

### Integration Plan (6 Modules)
1. **Semantic Codebase Indexer** — embeddings via sentence-transformers, LanceDB storage, tree-sitter chunking, watchdog sync.
2. **Context Retrieval Engine** — hybrid BM25 + semantic search, multi-source (code + wiki + git + knowledge).
3. **Prompt Enhancer** — pre-process queries, inject context, detect reuse opportunities.
4. **MCP Context Server** — expose `query_codebase` tool, read-only.
5. **Dual-Model Agent Loop** — primary model (Claude) for iteration + ensembler (GPT-5/o1) for selection.
6. **Multi-Source Context Aggregator** — unify lean-ctx + semantic index + wiki + ctx_knowledge + git history.

### Pages Created (15)
Sources: [[Augment Context Engine Official]], [[Augment SWE-bench Agent GitHub]], [[Augment SWE-bench Pro Blog]], [[Augment Code WorkOS ERC 2025]], [[Augment Code Codacy AI Giants]], [[Augment Code MCP SiliconAngle]], [[Auggie Context MCP Server]]
Concepts: [[Context Engine (AI Coding)]], [[Semantic Codebase Indexing]], [[Dual-Model Agent Architecture]], [[Prompt Enhancement]], [[Majority Vote Ensembling]], [[Contractor vs Employee AI Model]]
Entity: [[Augment Code]]
Synthesis: [[Research: Augment Code Context Engine]]

### Open Questions → NOW RESOLVED (2026-04-30 follow-up research)
- **Q1: Augment's embedding model & vector DB** — Still undisclosed. Inferred: likely custom variant of Voyage-code-3 / BGE-code-v1 / SFR-Embedding-Code fine-tuned on proprietary corpus. Vector DB candidates: Pinecone serverless, Weaviate, or custom sharded FAISS. See [[coir-code-retrieval-benchmark]] for top code embedding models.
- **Q2: Chunking strategy & compression** — Resolved. State of the art is AST-aware chunking (cAST paper, June 2025) + contextualized text prepending. Chunking matters MORE than embedding model (Vectara NAACL 2025). Augment almost certainly uses this approach. See [[cast-code-chunking-paper]], [[AST-Aware Code Chunking]].
- **Q3: MiniLM-L6-v2 vs larger models** — Resolved. MiniLM-L6-v2 is 5-8% less accurate than larger models (78.1% vs 86.2% top-5 on general text, gap wider for code). But gap can be partially closed by AST-aware chunking + contextualized text + hybrid search. Start with MiniLM + good chunking, upgrade to BGE-code-v1 if CoIR benchmark shows insufficient quality. See [[embedding-models-benchmark-supermemory-2025]], [[code-chunk-library-supermemory]].

### New Sources (5)
[[cast-code-chunking-paper]], [[vectara-chunking-vs-embedding-naacl2025]], [[coir-code-retrieval-benchmark]], [[code-chunk-library-supermemory]], [[embedding-models-benchmark-supermemory-2025]]

### New Concepts (3)
[[AST-Aware Code Chunking]], [[Contextualized Text Embedding]], [[Late Chunking vs Early Chunking]]

### Remaining Open Questions
- Real-time sync at scale (1M+ files) — implementation detail not available.
- Context compression algorithm — black box.
- Retrieval pipeline (candidate generation → re-ranking) — partial information only.
- Empirical CoIR benchmark validation needed for our setup.

---

**46 open questions resolved across 6 themes — see [[resolved-context-pruning-inplace-vs-restart]] and 5 other resolution pages.**

## Consensus-to-Wiki Filing Rule (2026-04-30)

**Mandatory**: Winning consensus from any agent debate MUST be filed in `wiki/consensus/`. All 4 verdict types file (CONSENSUS_REACHED, DEADLOCK, BUDGET_EXHAUSTED, TIMEOUT). Purpose: permanent agent alignment — future agents query before forming positions, harness blocks contradictions.

Updated: [[consensus-debate]], [[harness-implementation-plan]] (new First Principle #7, phase P19b, Consensus Filing Contract), [[adr-011]], [[selective-debate-routing]], [[harness]]. Created: [[consensus/index]] (directory + template).

## Consolidation Summary (2026-04-30)

**Completed**: Full first-principles consolidation of ALL April 2026 research into the harness pipeline.

### New Pages Created

- [[harness-control-frameworks]] — Unified view: H-Formalism + Feedforward-Feedback + Generator-Evaluator as orthogonal dimensions
- [[drift-detection-unified]] — Three complementary drift paradigms (L2.5 tool-call, L3 spec, L4 implementation) with clear boundaries
- [[think-in-code-enforcement]] — Formal L3 module for mandatory code-over-data paradigm with 3-layer enforcement architecture

### Pages Significantly Updated

- [[harness-implementation-plan]] — Complete rewrite: 27 properly-numbered build phases (P0-P27 + F1-F3 future), single authoritative token budget (~15K-16K/subtask), all tools/research integrated, proper phase-to-layer mapping
- [[harness]] — Updated to reflect L2.5 drift monitor, cross-cutting tool enhancements, formal models, token budget
- [[index]] — Full reorganization: harness pipeline section, formal models, concepts grouped by domain (execution/drift, context/search, agent architecture), all 30+ concepts listed
- [[adr-011]] — Updated status to "accepted", integrated iMAD selective routing findings, revised token budget (always-debate ~13K → selective ~3K avg), pre-debate gating mechanism
- [[model-adaptive-harness]] — Restructured as canonical entry point with pointer to [[harness-configuration-layers]] for detailed tables. Added Gemini column. Removed redundancy.

### Duplication/Redundancy Resolved

1. **Layer numbering**: Old Phase 1-19 numbering replaced with P0-P27 mapped to layers. L2.5 properly placed. Phase 12 no longer collides with layer L3.
2. **Drift detection**: Three overlapping concepts (L3 grounding, L2.5 meta-agent, L4 adversarial) unified in [[drift-detection-unified]] with clear "why three" justification.
3. **Token budget**: Scattered across 4+ pages → single table in [[harness-implementation-plan]].
4. **Model profiles**: [[model-adaptive-harness]] and [[harness-configuration-layers]] de-duplicated — former is entry point, latter is detailed tables.
5. **Control frameworks**: H-formalism, feedforward-feedback, generator-evaluator unified in [[harness-control-frameworks]] as orthogonal dimensions.
6. **ADR-011 staleness**: Updated from always-debate to selective routing per iMAD findings.
7. **Index freshness**: All ~30 concept pages now listed. Previously missing ~7.

### New Tools in Pipeline

| Tool | Phase | Status |
|------|-------|--------|
| ck (semantic code search) | P13 | Planned — MCP integration + 3-layer enforcement |
| Gitingest (bulk ingestion) | P15 | Planned — `/gitingest` skill |
| pi-messenger (stripped) | P17 | Planned — debate transport layer |
| pi-lean-ctx (native) | F0 | Done — [[2026-04-30-pi-lean-ctx-native]] |

### Key New Paradigms

- **Think-in-Code enforcement** now has its own L3 module with 3-layer architecture (system prompt → interception → compression)
- **Selective debate routing** (iMAD) reduces consensus debate cost by ~92% on high-confidence tasks
- **Context drift as positive feedback loop** — each failed attempt accelerates failure. Meta-agent breaks the loop (detect → prune → restart).
- **Three quality concerns, three timings**: Syntax (inline, blocks progress), Semantics (L4, needs LLM), Style (Phase 16 final gate, deterministic)

### Token Budget (Unified, Per Subtask)

- ~15,000-16,000 total pipeline overhead (down from ~17,500 baseline)
- Savings: AST truncation (30-50%), fuzzy edits (5-15%), inline validation (10-20%), Haiku router (15-25%), selective debate (92% on ~80% tasks), Think-in-Code (30-200× on analysis)

### Active Architecture

```
L1: Spec → L2: Plan → L2.5: Drift Monitor → L3: Execute (+TiC, +AST, +Fuzzy, +Inline, +ck, +Gitingest)
  → L4: Adversarial (+selective debate) → Phase 16: Lint+Format → L5: Observe → L6: Memory → L7: Orch → L8: Query
```

Formal models: H=(E,T,C,S,L,V) + Feedforward-Feedback + Generator-Evaluator. All mapped to our pipeline in [[harness-control-frameworks]].

### GitHub Issues as Harness Spec Storage (2026-04-30)

Research: [[Research: GitHub Issues as Harness Spec Storage]] — GitHub Issues can serve as cloud-persistent spec storage with native sub-issues (parent-child hierarchies, April 2025) and issue dependencies (blocked-by/blocking).

Key architecture: Dual-tier — local `.pi/harness/specs/<id>.json` for speed + GitHub Issue for cross-session ledger. Not every micro-step creates an issue; only major state transitions (spec creation, plan creation, phase completion).

Toolchain: `gh issue create/edit/comment/list/view` for CRUD, `gh-sub-issue` extension (yahsan2, 110 stars, MIT) for parent-child management until `gh` CLI gains native support (cli/cli#10298). GitHub Projects v2 for optional kanban/roadmap visualization.

Labels encode machine-readable state: `harness-spec`, `layer-{n}`, `status:{status}`. Issue comments serve as immutable execution audit trail.

**Fork safety**: `.pi/harness/specs/` is gitignored — never committed, never forked. `ultimate-pi harness init` bootstraps a fork's own issue tracker (enable issues, create labels, set `gh` repo context). Zero upstream spec leakage into forks.

Init flow: detect fork → enable issues → create labels → set repo → gitignore cache → ready. Idempotent re-runs are no-ops.

**Content-addressed spec identity**: Every HardenedSpec carries a `SHA256(intent + criteria + done)` fingerprint embedded in the issue body (`<!-- spec-fp: <hash> -->`). Harness resolves specs by hash search across repos, not by brittle issue numbers. When fork merges upstream: `ultimate-pi harness migrate` transfers specs via `gh issue transfer` + relays labels. Idempotent. ~2-3 days to implement.
