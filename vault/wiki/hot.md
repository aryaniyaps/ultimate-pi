---
type: meta
title: "Hot Cache"
updated: 2026-05-01T21:30:00
created: 2026-04-30
tags: []
status: active
---

# Recent Context

## Last Updated
2026-05-01. executor.sh research complete. Executor is an **integration layer**, not just TS execution layer. Three new P43 sub-phases (P43b catalog+discovery, P43c policy-aware execution). Build vs integrate decision: custom for harness-native tools, Executor as dep for external API.

## executor.sh Harness Integration (2026-05-01)

### Key Finding
**executor.sh (RhysSullivan/executor) is an integration layer — a unified tool catalog + auth + policy + execution runtime — not just a TypeScript execution layer.** Our existing wiki classified it alongside CodeAct and Cloudflare Code Mode under P43 (TS Execution Layer). This research finds Executor belongs in a broader category: the agent integration/runtime layer.

### Three Gaps Revealed
1. **No tool catalog with intent-based discovery**: `tools.discover({ query, limit })` lets agents search tools by intent without loading all schemas → new **P43b**
2. **No shared auth for external tools**: Executor centralizes OAuth/keychain across agents → gap for post-v1
3. **No execution pause/resume**: Stateful execution lifecycle with `waiting_for_interaction` state → new **P43c**

### Five Pillars (from executor.sh landing)
1. Unified catalog with intent-based discovery
2. Shared auth (sign in once, all agents share)
3. Policy engine (auto-approve reads, pause on writes, wildcards)
4. Any agent via MCP (single MCP endpoint)
5. Local-first (secrets in keychain, nothing leaves machine)

### Build vs Integrate Decision
- **Harness-native L3 tools (P43)**: Build custom TS runtime with borrowed catalog/discovery/policy patterns
- **External API integration (GitHub, Slack, Stripe)**: Use Executor as MCP dependency (post-v1)

### Source Updated
[[executor-rhyssullivan]] — major rewrite with product positioning, architecture, policy engine, execution lifecycle

### Synthesis
[[Research: executor.sh Harness Integration]]

### Plan Updated
[[harness-implementation-plan]] — P43b (Tool Catalog with Discovery), P43c (Policy-Aware Execution)

---

## Fallow Codebase Intelligence Harness Integration (2026-05-01)

### Key Finding
**Fallow (fallow-rs/fallow, 1.7K stars, MIT, Rust-native) is the ONLY codebase intelligence tool across TS/JS, Python, Go, Rust, Elixir that provides dead code + duplication + complexity + boundaries in one sub-second package.** Purpose-built for AI agents: MCP server, JSON `actions` array, `auto_fixable` flags. Beats knip 2-13x, beats jscpd 8-26x.

### Seven Integration Points (P44a-P44g)
| Phase | Where | What |
|-------|-------|------|
| P44a | L3 tools | MCP tool registration. Agent calls fallow for real-time feedback |
| P44b | P15b sandbox | `fallow audit --changed-since main` scoped pre-verify |
| P44c | Phase 16 gate | `fallow audit --gate all` deterministic pass/warn/fail |
| P44d | L5 observability | Health score snapshots as Keep Rate proxy |
| P44e | P29 errors | Per-issue rule/severity/actions taxonomy mapping |
| P44f | L6 memory | Git-committed baselines in `.fallow-baselines/` |
| P44g | P42 automations | Cron-style weekly health sweeps + daily dead code |

### Ecosystem Gap
**No ecosystem has a fallow-equivalent single-tool.** Python needs Vulture + Skylos + Ruff + Radon. Go needs golangci-lint + deadcode + gocyclo. Rust needs clippy + cargo-udeps + rust-code-analysis. Elixir needs dialyxir + credo.

### Sources
[[fallow-rs-codebase-intelligence]]

### Synthesis
[[Research: Fallow Codebase Intelligence Harness Integration]]

### Plan Updated
[[harness-implementation-plan]] — New P44 phases, Fallow Validation section, New Tools table.

---

## TypeScript Execution Layer Research (2026-05-01)

### Key Finding
**Three independent systems converge on the same architecture: replace flat tool calling with a typed TypeScript API + sandboxed runtime.** Apple CodeAct (ICML 2024: +20% success rate, -30% interaction turns), Cloudflare Code Mode (production: 3-4x context reduction), Executor (open-source: 1.3K stars, local-first TS runtime). Core insight: LLMs have seen millions of lines of code in pretraining but only contrived tool-calling examples — code is a more natural interface.

### Three Systems Converging
| System | Type | Key Metric | Sandbox |
|--------|------|-----------|---------|
| **CodeAct** (Apple, ICML 2024) | Academic paper | +20% multi-tool success | Python interpreter |
| **Cloudflare Code Mode** (2025) | Production SDK | 3-4x context reduction | V8 Worker isolates |
| **Executor** (RhysSullivan, 2026) | Open-source | 1.3K stars | Local Node.js |

### New Harness Phase: P43
**TypeScript Execution Layer** — single `write_ts` tool replaces 8-15 individual L3 tools. All tools (read, bash, edit, grep, find, ck_search, ctx_execute) exposed as typed TS API via auto-generated type defs. Agent writes TypeScript code; runtime executes in sandboxed Node.js VM or Deno subprocess. Tool calls dispatch via typed RPC back to harness. Permission subsystem (P35) gates all tool calls. Extends P14 (Think-in-Code) from data analysis to full tool orchestration.

### New First Principle
**FP #19**: Code is a better tool-calling interface than JSON. LLMs have seen millions of lines of code in pretraining but only contrived tool-calling examples. A single "write TypeScript" tool + sandboxed runtime achieves 3-4x context reduction and ~20% higher success rate on multi-tool tasks.

### What We Do NOT Adopt
- Cloudflare Workers dependency (our sandbox: local Node.js VM or Deno)
- Python interpreter / CodeAct (our stack is TypeScript)
- Web UI for tool config / Executor (our harness is CLI-only)

### Sources (4)
[[codeact-apple-2024]], [[cloudflare-codemode]], [[executor-rhyssullivan]], [[colinmcnamara-context-optimization-codemode]]

### Synthesis
[[Research: TypeScript Execution Layer for Agent Tool Calling]]

### Plan Updated
[[harness-implementation-plan]] — New FP #19, P43 phase, TS Execution Layer Validation section, updated savings.

---

## Gemini CLI SOTA + Harness Integration (2026-05-01)

### Key Finding
**Gemini CLI (103k GitHub stars, 6,005 commits, 40+ weekly releases) introduced 15 SOTA harness primitives — most already independently validated by other agents (Codex, Claude Code, Cursor, Antigravity), but Gemini CLI provides the most complete refactoring-oriented harness.** Seven integration priorities derived from first principles (not feature-copying).

### 15 SOTA Innovations Cataloged
1. **Agent Skills** (v0.23+): Progressive disclosure with activation mechanism
2. **Plan Mode** (v0.29+): Structured decomposition with research subagents
3. **Codebase Investigator** (v0.12+): JIT context discovery subagent
4. **Context Compression** (v0.38+): Advanced conversation history distillation
5. **Chapters Narrative** (v0.38+): Session grouping by intent (novel concept)
6. **Policy Engine** (v0.18+): Pre-execution tool gates, persistent approvals
7. **Subagents + Remote** (v0.32+): A2A protocol, generalist router
8. **Event-Driven Hooks** (v0.27+): MessageBus architecture, queued confirmations
9. **Four-Tier Memory** (v0.39+): Prompt-driven, /memory inbox
10. **Multi-Registry** (v0.36+): Extensions, skills, MCP all registries
11. **Browser Agent** (v0.31+): CDP access, persistent sessions
12. **Model Routing** (v0.12+): Auto-select Flash vs Pro
13. **Sandboxing Stack** (v0.34+): Docker, gVisor, LXC, Seatbelt
14. **Git Worktrees** (v0.36+): Isolated parallel sessions
15. **Extensions** (v0.8+): 20+ partners, A2A, SDK

### Seven Integration Priorities (from First Principles)
| P-F1 | Pre-Execution Policy Gates | Mechanical enforcement over documentation (FP #3) |
| P-F2 | Skills Activation Mechanism | Progressive disclosure prevents context rot (FP #9) |
| P-F3 | Research Subagents for L2 | Ask what capability is missing (FP #5) |
| P-F4 | Event-Driven Hooks Middleware | Steering loop after every action (FP #10) |
| P-F5 | Git Worktree Sessions | Give the agent isolated space (FP #6) |
| P-F6 | Chapters Narrative for Sessions | A map not a manual (FP #7) |
| P-F7 | Browser Agent for Visual Verif | Give the agent eyes (FP #6) |

### First-Principles Synthesis
**12 first principles synthesized** from Fowler (Feedforward+Feedback, Keep Quality Left), OpenAI (Visibility, Capability-Gap, Enforcement, Eyes, Map), LangChain (Progressive Disclosure, Model-Harness Independence, Filesystem as Universal Primitive), Augment (PEV Loop). See [[harness-engineering-first-principles]].

### Benchmark Context
Render benchmark (Aug 2025): Gemini CLI 6.8/10. **Context: 9/10 (best).** Excels at editing existing codebases, weak at greenfield. Validates our grounding-heavy approach.

### Source Pages (8)
[[Source: Google Gemini CLI Architecture Docs]], [[Source: Google Blog - Gemini CLI Announcement]], [[Source: Render AI Coding Agents Benchmark 2025]], [[Source: Martin Fowler - Harness Engineering]], [[Source: LangChain - Anatomy of Agent Harness]], [[Source: OpenAI Harness Engineering Five Principles]], [[Source: Augment - Harness Engineering for AI Coding Agents]], [[Source: Gemini CLI Changelogs]]

### Concept Pages (4)
[[harness-engineering-first-principles]], [[agent-skills-pattern]], [[policy-engine-pattern]], [[gemini-cli-architecture]]

### Synthesis
[[Research: Gemini CLI SOTA Harness Integration]] — Full synthesis with 15 innovations, 7 integration priorities, gap analysis, contradictions, open questions.

---

## Codex Open-Source Architecture Research (2026-05-01)

### Key Finding
**Codex (79.2K GitHub stars, open-source Apache 2.0, Rust 96.3%) independently validated 7 of our planned features and revealed 5 critical gaps.** Codex is uniquely valuable because its architecture is transparent (not reverse-engineered). Three novel architectural patterns challenge our first principles.

### Seven Validations
Model-adaptive (per-agent model selection), skills system (agentskills.io standard), lifecycle hooks (6 events, JSON I/O), subagent specialization (parallel dispatch + summary returns), pre-verification isolation (sandbox tiers), persistent memory (Memories + Chronicle), subagent worktree isolation (git worktrees).

### Five Gaps → New Phases
| P38 | OS-Level Sandbox Enforcement | bubblewrap/Seatbelt integration |
| P39 | Harness as MCP Server | Expose pipeline stages as MCP tools |
| P40 | Skills Ecosystem Tooling | `$skill-creator`, `$skill-installer`, agentskills.io |
| P41 | Implicit Memory Capture | Chronicle-style screen-context capture |
| P42 | Scheduled Agent Automations | cron-style recurring harness runs |

### Three Novel Patterns
1. **Multi-surface agent**: Single logic runs CLI+IDE+App+Web via App Server
2. **Rust-native as first-principles**: Systems language for zero-dependency install + OS sandbox
3. **Bidirectional MCP**: Codex IS an MCP server — agents can use Codex as a tool

### New First Principles
- FP #16: Sandbox = foundation, permissions = policy (not reverse). OS-level enforcement.
- FP #17: Agent should be composable — consumer AND provider of tools (MCP server).
- FP #18: Implicit memory complements explicit memory (Chronicle + wiki).

### Source
[[codex-open-source-agent-2026]] — GitHub repo + official docs

### Synthesis
[[Research: Codex State-of-the-Art Harness Improvements]]

---

## Claude Code Architecture Research (2026-05-01)

### Key Finding
**Claude Code (510K-line TypeScript, 82K+ GitHub stars) is the most sophisticated production agent harness analyzed.** Six gaps → phases P33-P37, four new first principles, three independent validations.

### Six Gaps → New Phases
| P33 | Lifecycle Hooks (30+ events, 100% compliance) | P34 | Structured Compaction (~85% reduction) | P35 | Permission Subsystem (7 modes) | P36 | Session Storage + Checkpoints | P37 | CLAUDE.md Entrypoint (96% compliance) |

### Three Validations
FP #1 (harness>model), model-adaptive harness, skills system.

### Design Tensions
Embeddings (P13) vs Agentic Search. Pipeline vs Loop.

### Sources (4)
[[claude-code-architecture-vila-lab-2026]], [[claude-code-architecture-qubytes-2026]], [[claude-code-architecture-karaxai-2026]], [[claude-code-security-architecture-penligent-2026]]

### Synthesis
[[Research: Claude Code State-of-the-Art Harness Improvements]]

---

## Google Antigravity Harness Research (2026-05-01)

## Google Antigravity Harness Research (2026-05-01)

### Key Finding
**Google Antigravity's agent-first IDE independently validated 7 of our planned features and revealed 3 critical gaps.** Antigravity (launched Nov 2025, Windsurf $2.4B acq) is the first IDE built from ground up as a control plane for autonomous coding agents — not an AI plugin on an old editor.

### SOTA Innovations Identified

1. **Agent-First Dual-View Architecture**: Editor View + Manager View (mission control for multi-agent orchestration). Human shifts from coder to architect.
2. **1M Token Context Window**: Ingests entire repos into active memory. No RAG needed. But expensive ($249.99/mo Ultra).
3. **Browser Subagent**: Headless Chromium driver. Visual verification via screenshot pixel analysis. KILLER feature for UI work.
4. **Artifact System**: Human-reviewable deliverables (screenshots, recordings, plans) replace raw tool logs. Google Docs-style async commenting.
5. **Cross-Project Learning KB**: Agents save successful strategies across projects. Self-improvement as core primitive.
6. **SKILL.md Progressive Disclosure**: Same pattern as our `.pi/skills/` system. Community ecosystem ported from Claude Code.
7. **Four Design Tenets**: Trust (artifacts), Autonomy (multi-surface agent control), Feedback (async artifact comments), Self-Improvement (learning KB).

### What Antigravity Validates from Our Plan
- Model-adaptive harness (multi-model support matching task strengths)
- Pre-verification isolation P15b (browser subagent visual verification)
- Subagent specialization P25 (Manager View multi-agent orchestration)
- Self-evolving harness F1 (cross-project learning KB)
- Skills system F0 (identical progressive disclosure pattern)
- Adversarial verification L4 (complementary: artifacts prove right, critic proves wrong)

### New Phases Added
| P30 | Browser Subagent | Headless browser for visual UI verification |
| P31 | Artifact Generation Layer | Human-reviewable deliverables after L4 verification |
| P32 | Cross-Project Learning KB | Multi-project knowledge transfer for agents |

### Deliberate Non-Adoptions
- 1M token context window (too expensive for CLI harness. Selective context is OUR advantage)
- Full IDE integration (we are CLI-level harness)
- Google Cloud lock-in (we stay platform-agnostic)
- $249.99/mo pricing (our token budget optimization wins)

### Sources
[[google-antigravity-official-blog]], [[google-antigravity-wikipedia]], [[cursor-vs-antigravity-2026]]

### Synthesis
[[Research: Google Antigravity Harness Integration]] — Full synthesis with first-principles rethinking, gap analysis, contradictions.

### Plan Updated
[[harness-implementation-plan]] — New First Principle #11, Antigravity Validation section, P30-P32 phases, updated token budget.

---

## cursor.sh Harness Innovations (2026-05-01)

### Key Finding
**Cursor's production harness ($1B ARR, 400M+ daily requests) independently validated 5 of our planned features** (model-adaptive, dynamic context, P27 context anxiety, F1 self-evolving, P10 fuzzy edits) and revealed **4 critical gaps** now incorporated: pre-verification isolation (P15b), positive loops (P28), error classification (P29), subagent specialization (P25 evolved).

### Validations (Cursor confirmed our designs before we built them)
- Model-adaptive harness: Cursor provisions different tool formats per model (patches vs string replace)
- Dynamic context: Cursor removed static pre-loaded context in favor of agent-driven context discovery
- Context anxiety: Cursor independently discovered models refusing work as context fills (validates our P27)
- Self-evolving harness: Cursor's 90-min RL loop on user accept/reject data (validates our F1)
- Edit quality bottleneck: Cursor's "Diff Problem" is their hardest engineering challenge (validates P10)

### New Phases Added
| P15b | Pre-Verification Isolation Sandbox | Shadow Workspace pattern: validate in isolated temp workspace before showing results |
| P28 | Positive Agent Loop Hooks | Counterpart to drift monitor: keep agent running until DONE, not just stop when stuck |
| P29 | Tool Error Classification | Per-tool per-model error types + anomaly detection baselines (enables self-healing) |
| P25 | Subagent Specialization Router | Evolved from cost router: dispatch by task type (plan/edit/debug), fresh context per subagent |
| P21 | Keep Rate + LLM-as-Judge | Extended L5 to track code persistence over time + semantic satisfaction signals |

### First Principles from Cursor
1. **Pre-verification > post-verification.** Validate before user sees failure. Shadow Workspace pattern.
2. **Keep Rate > benchmark scores.** Fraction of agent code still in codebase after time intervals is ultimate metric.
3. **Error classification enables self-healing.** Can't fix what you can't categorize. Cursor classifies every tool error.
4. **Positive loops as important as negative loops.** Hooks that keep agent running are counterpart to drift detection.
5. **Subagent specialization > cost routing.** Dispatch by capability, not just price.
6. **Context anxiety is real and cross-model.** Prepare proactively.
7. **Architectural control matters more than model access.** Our .pi/ tool interception is our "fork."

### Sources (7)
[[cursor-shadow-workspace-2024]], [[cursor-agent-best-practices-2026]], [[cursor-harness-april-2026]], [[cursor-shipped-coding-agent-2026]], [[cursor-instant-apply-2024]], [[cursor-fork-29b-2025]], [[cursor-harness-innovations]]

### Synthesis
[[Research: cursor.sh Harness Innovations]] — Full synthesis with gap analysis, contradictions, open questions.

### Plan Updated
[[harness-implementation-plan]] — New First Principles #8-10, Cursor Validation section, new/extended phases, updated token budget.

---

## Model-Specific Prompting Guides — Harness Redesign (2026-05-01)

### Key Finding
**Every major model provider publishes OFFICIAL prompting guidance.** The current harness design ("write once for strictest model, relax for forgiving") is WRONG. Each provider specifies fundamentally DIFFERENT prompting conventions — not different strictness levels.

### Critical Contradictions Found
- **Constraint ordering**: OpenAI says FIRST. Google says LAST. Can't reconcile in one format.
- **Prompt density**: OpenAI (GPT-5.5+) says SHORTER, outcome-first. Harness generates verbose constraint-heavy prompts.
- **Structure format**: Anthropic mandates XML tags. Google uses plain text. OpenAI uses XML-like sections.
- **Temperature**: Google mandates 1.0. Others unspecified. Harness needs model-specific temp.
- **Verification**: Google = split-step (verify→generate). Anthropic = self-check at end. OpenAI = verification loop.

### Redesign: Provider-Native Prompting
New module: **Prompt Renderer** (Phase P22b). Generates provider-native prompts from a semantic spec.

```
Semantic Spec → Prompt Renderer → Provider-Native Prompt
                ├── openai-renderer (XML-like, constraints-first, preambles)
                ├── anthropic-renderer (XML tags, long-content-top, role)
                └── google-renderer (plain text, constraints-LAST, grounding)
```

### Pages Created/Updated
- Created: [[openai-prompt-guidance]], [[anthropic-prompt-best-practices]], [[gemini-3-prompting-guide]] (sources)
- Created: [[provider-native-prompting]] (concept)
- Created: [[Research: Model-Specific Prompting Guides]] (synthesis)
- Rewritten: [[model-adaptive-harness]] (v2 redesign — retired old principle)
- Rewritten: [[harness-configuration-layers]] (added Gemini, provider-native dimensions)
- Updated: [[index]], [[log]], [[hot]]

### Provider Profiles (Summary)
| Provider | Structure | Constraint Order | Verification | Thinking |
|----------|-----------|-----------------|--------------|----------|
| OpenAI | XML-like sections | FIRST | Pre-flight/post-flight loop | reasoning_effort |
| Anthropic | XML tags | Flexible (top) | Self-check at end | effort + adaptive |
| Google | Plain text | LAST | Split-step verify→generate | thinking level |

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
