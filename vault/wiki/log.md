# Wiki Operations Log

## [2026-04-30] autoresearch | Augment Embedding Model, Chunking Strategy, Local vs Cloud Embeddings
- Rounds: 2 (5 broad searches, 5 gap-fill searches, 5 sources fetched)
- Sources fetched: 5 (cAST paper, code-chunk blog, embedding benchmark, CoIR benchmark, Vectara NAACL 2025)
- Pages created (sources): [[cast-code-chunking-paper]], [[vectara-chunking-vs-embedding-naacl2025]], [[coir-code-retrieval-benchmark]], [[code-chunk-library-supermemory]], [[embedding-models-benchmark-supermemory-2025]]
- Pages created (concepts): [[AST-Aware Code Chunking]], [[Contextualized Text Embedding]], [[Late Chunking vs Early Chunking]]
- Pages updated: [[Research: Augment Code Context Engine]] (3 open questions resolved, 4 remaining)
- Key finding: Augment's exact embedding model + vector DB remain undisclosed, but latest research (cAST paper June 2025, Vectara NAACL 2025) shows AST-aware chunking matters more than model choice. MiniLM-L6-v2 is 5-8% less accurate than larger models but this gap can be partially closed by AST-aware chunking + contextualized text prepending. Recommendation: start with MiniLM-L6-v2 + tree-sitter AST chunking + contextualized text, run CoIR benchmark eval, upgrade to BGE-code-v1 if needed.

## [2026-04-30] autoresearch | Augment Code Context Engine
- Rounds: 1
- Sources found: 8
- Pages created: [[Research: Augment Code Context Engine]] (synthesis), [[Augment Context Engine Official]], [[Augment SWE-bench Agent GitHub]], [[Augment SWE-bench Pro Blog]], [[Augment Code WorkOS ERC 2025]], [[Augment Code Codacy AI Giants]], [[Augment Code MCP SiliconAngle]], [[Auggie Context MCP Server]], [[Context Engine (AI Coding)]], [[Semantic Codebase Indexing]], [[Dual-Model Agent Architecture]], [[Prompt Enhancement]], [[Majority Vote Ensembling]], [[Contractor vs Employee AI Model]], [[Augment Code]]
- Pages updated: [[index]], [[log]], [[hot]]
- Key finding: Augment Code's Context Engine is a semantic codebase search engine that achieves #1 SWE-bench Pro (51.80%). Same model (Claude Opus 4.5) scores 6 points higher with better context. Context quality > model intelligence. Implementation plan: 6 modules (semantic indexer, context retrieval, prompt enhancer, MCP server, dual-model agent, multi-source aggregator) integrable into our harness using existing infrastructure (lean-ctx, wiki, ctx_knowledge) + new components (LanceDB/ChromaDB embeddings, tree-sitter AST chunking, watchdog sync).

## [2026-04-30] autoresearch | Resolution of 46 Open Questions Across 6 Themes
- Rounds: 2 (6 theme searches, 12 sources fetched)
- Pages created: [[resolved-context-pruning-inplace-vs-restart]], [[resolved-treesitter-dynamic-languages]], [[resolved-imad-debate-gating-transfer]], [[resolved-small-model-meta-agents]], [[resolved-mcp-tool-preference]], [[resolved-context-window-economics]]
- Pages updated: [[index]], [[log]], [[hot]]
- Key finding: 46 open questions across 11 wiki pages resolved via 6 cross-cutting theme resolutions. Major outcomes: (1) In-place context editing is the production pattern — session restart is fallback. Claude API, OpenCode DCP, OpenClaw all use in-place clearing. (2) Tree-sitter handles 80% of dynamic language parsing — static analysis (mypy/Pyright) + runtime profiling cover remaining 20%. (3) iMAD debate gating transfers from QA to code review in principle, needs code-specific hesitation cues and model-specific classifiers. (4) Haiku/Flash can serve as meta-agent drift detectors at near-zero cost. (5) MCP has no priority system — tool preference achieved through prompt engineering + harness interception. (6) Token allocation follows 10-20-40 rule (repo-map/conversation/files), monorepos need hierarchical L0-L2 progressive disclosure, pre-computed repo maps are primary optimization.

## [2026-04-30] harness | Mandatory consensus-to-wiki filing rule
- Decision: Winning consensus from any agent debate MUST be filed in project wiki for permanent agent alignment.
- Pages updated: [[consensus-debate]] (converted open question to mandatory rule, updated verdict semantics, integration points), [[harness-implementation-plan]] (new First Principle #7, new build phase P19b, new Consensus Filing Contract section, updated wiki contract), [[adr-011]] (strengthened wiki filing from mitigation to mandatory, added alignment benefit), [[selective-debate-routing]] (added wiki filing to implementation sketch), [[harness]] (updated key design decisions)
- Pages created: [[consensus/index]] (consensus records directory with template)
- Key finding: Without permanent alignment records, future agents re-litigate settled debates. Wiki consensus records close this loop — agents query before forming positions, harness blocks contradictions. All 4 verdict types file (CONSENSUS_REACHED, DEADLOCK, BUDGET_EXHAUSTED, TIMEOUT). Enforced by L7 write-after contract per ADR-010.

## [2026-04-30] autoresearch | GitHub Issues as Harness Spec Storage
- Rounds: 1 (+ fork/multi-tenant deep dive)
- Sources found: 5 (GH docs: sub-issues, dependencies; community: gh-sub-issue extension; feature request: cli/cli#10298; fork discussion: #161368)
- Pages created: [[Research: GitHub Issues as Harness Spec Storage]], [[github-sub-issues-docs]], [[github-issue-dependencies-docs]], [[gh-sub-issue-extension]], [[gh-cli-sub-issue-rfc]], [[github-fork-issues-discussion]]
- Pages created (concepts): [[fork-safe-spec-storage]], [[content-addressed-spec-identity]]
- Pages updated: [[index]], [[log]], [[hot]]
- Key finding: GitHub Issues has native sub-issues (April 2025, up to 8 levels deep) and issue dependencies (blocked-by/blocking) — both map directly to harness spec decomposition (L1) and task DAGs (L2). `gh` CLI lacks native support but `gh-sub-issue` extension bridges the gap. Recommended architecture: dual-tier (local JSON cache + GitHub Issue ledger) — cloud persistence for major state transitions only, not every micro-step.
- Integration: L1 spec hardening → create parent issue. L2 structured planning → create sub-issues for tasks, link with dependencies. Issue comments as immutable execution audit log. Labels encode machine-readable state.
- Fork safety: `.pi/harness/specs/` gitignored (runtime cache, never committed). Forks get clean issue tracker via `ultimate-pi harness init` bootstrap (enable issues, create labels, set repo context). No upstream spec leakage.

## [2026-04-30] consolidate | First-Principles Harness Consolidation
- All April 2026 research integrated into master plan
- Pages created: [[harness-control-frameworks]] (unified H-formalism + feedforward-feedback + generator-evaluator), [[drift-detection-unified]] (3 complementary drift paradigms with clear boundaries), [[think-in-code-enforcement]] (L3 module with 3-layer enforcement)
- Pages rewritten: [[harness-implementation-plan]] (27 build phases, unified token budget, all tools/research), [[harness]] (updated pipeline with L2.5 + cross-cutting tools), [[index]] (full reorganization, all 30+ concepts), [[adr-011]] (selective routing per iMAD), [[model-adaptive-harness]] (canonical entry point, de-duplicated)
- Duplication resolved: layer numbering (P0-P27 mapped to layers), drift detection (3 paradigms unified), token budget (single table), model profiles (entry + detailed split), control frameworks (3 frameworks as orthogonal dimensions), ADR-011 staleness (selective routing), index freshness (all concepts listed)
- New tools integrated: ck (P13), Gitingest (P15), pi-messenger (P17), pi-lean-ctx (done)
- New paradigms: Think-in-Code L3 module, selective debate routing (92% savings), context drift as positive feedback loop, 3 quality concerns → 3 timings
- Unified token budget: ~15K-16K/subtask (down from ~17.5K baseline)

## [2026-04-30] autoresearch | Meta-Agent Context Drift Detection
- Rounds: 2
- Sources found: 10 (searched), 9 fetched, 4 filed as source pages
- Pages created: [[Research: Meta-Agent Context Drift Detection]], [[ironclaw-drift-monitor]], [[langsight-loop-detection]], [[agent-drift-academic-paper]], [[vectara-guardian-agents]], [[context-drift-in-agents]], [[meta-agent-context-pruning]], [[agent-loop-detection-patterns]], [[guardian-agent-pattern]]
- Pages updated: [[index]], [[log]], [[hot]]
- Key finding: The meta-agent concept (detect stuck → prune context → restart) is a NOVEL SYNTHESIS. Each component exists independently (ironclaw DriftMonitor for detection, SWE-Pruner for context pruning, LangSight for loop detection, Vectara for guardian agents) but no system combines all three phases. The closest prior art is nearai/ironclaw #1634 (March 2026) which implements detection + injection but does NOT prune context. Academic foundation: Agent Drift paper (arxiv 2601.04170) quantifies 42% task success reduction from drift, ASI framework across 12 dimensions. Proposed harness integration: Layer 2.5 — Runtime Drift Monitor between L2 (Plan) and L3 (Execute).

## [2026-04-30] autoresearch | Agentic Coding Harness Latest Papers & Pipeline Improvements
- Rounds: 2
- Sources found: 9 (2 surveys, 5 papers, 2 production engineering blogs)
- Pages created: [[research-agentic-coding-harness-latest-papers]] (synthesis), [[meng2026-agent-harness-survey]], [[anthropic2026-harness-design]], [[bockeler2026-harness-engineering]], [[lou2026-autoharness]], [[lee2026-meta-harness]], [[fan2025-imad]], [[harness-h-formalism]], [[feedforward-feedback-harness]], [[generator-evaluator-architecture]], [[self-evolving-harness]], [[selective-debate-routing]], [[context-anxiety]]
- Pages updated: [[index]], [[log]], [[hot]]
- Key finding: Harness has a formal model H=(E,T,C,S,L,V). Self-evaluation fundamentally broken — separate generator from evaluator. Debate should be selective not always-on (iMAD: 92% token savings). Harnesses can self-evolve (AutoHarness, Meta-Harness). 5 immediate pipeline improvements identified: hard-threshold L4 criteria, sprint contracts at L2, pre-debate gating classifier, H-formalism mapping, feedforward/feedback audit. 3 future phases proposed: harness auto-optimization, behaviour harness, context anxiety guard.

## [2026-04-30] research | Model-Adaptive Agent Harness Design
- Rounds: 1 (deep first-principles analysis + Forge Code source)
- Sources found: 1 (Forge Code blog: GPT 5.4 vs Opus 4.6 on TermBench 2.0)
- Pages created: [[Research: Model-Adaptive Agent Harness Design]], [[forgecode-gpt5-agent-improvements]], [[model-adaptive-harness]], [[harness-configuration-layers]]
- Pages updated: [[index]], [[log]], [[hot]]
- Key finding: Agent harness must be a model-specialized system, not a one-size-fits-all script. Four configurable layers (Signal, Gate, Channel, Completion) each have dimensions that vary by model. GPT needs flat structure, constraints-first ordering, enforced gates, in-band signals. Opus tolerates nesting, infers from metadata, self-corrects. The harness pipeline we are building must incorporate per-model specialization — write once for strict (GPT-safe), relax for forgiving (Opus).

## [2026-04-30] harness | First-principles rethink: split lint+format from inline validation → new Phase 16
- Decision: Lint + format must NEVER run inline. Syntax validation (compilers/parsers) stays inline (Phase 12). Lint + format becomes final gate (Phase 16, post-L4).
- Pages updated: [[harness-implementation-plan]] (Phase 12 renamed, Phase 16 added, build phases table, token budget, architecture changes), [[inline-post-edit-validation]] (removed linters from inline, added Phase 16 pointer, split validator tables), [[hot]] (new entry), [[log]] (this entry)
- Key finding: Three distinct quality concerns with different timing — syntax (inline, blocks progress), semantics (L4, needs LLM), style (final gate, deterministic tools). Bundling them wastes tokens + breaks edit tool contracts. Formatting MUST be last: it touches every line, invalidating all line numbers for any subsequent operation.
- Pipeline order: L3(Edit+Syntax) → L4(Verify) → Phase 16(Lint+Format) → L5(Observe)

## [2026-04-30] research | Consensus Debate: Multi-Agent Argument for Harness
- Rounds: 1 (direct first-principles analysis + pi-messenger source analysis)
- Sources found: 1 (pi-messenger GitHub: registry, store, handlers, crew source)
- Pages created: [[adr-011]], [[consensus-debate]], [[pi-messenger-analysis]]
- Pages updated: [[harness-implementation-plan]] (added Phases 14-15), [[index]], [[hot]]
- Synthesis: This page (log entry)
- Key finding: Best human software decisions come from back-and-forth arguing. This applies even more to agents — multi-round dialectical debate is a substitute for the intuition agents lack. pi-messenger's file-based agent messaging (registry, inbox, fs.watch) is the right transport layer. Strip all overlays (chat UI, status bar, activity feed, crew orchestration). Build consensus protocol on top: DebateSession, ConsensusBudget, turn protocol, convergence detection, verdict generation. Integration points: L1 (spec debate), L2 (plan debate), L4 (multi-round adversarial). Adds ~13K tokens/subtask but self-funding — one caught flaw saves downstream cost.
- Architecture: pi-messenger transport (stripped) → Consensus protocol layer → Harness L1/L2/L4 debate spawns. File-based, no server, no daemon. Agents communicate peer-to-peer via inbox directories.

## [2026-04-30] harness | adopt pi-lean-ctx native package, drop custom extension
- Decision: [[2026-04-30-pi-lean-ctx-native]]
- Changes: deleted `extensions/lean-ctx-enforce.ts`, added `npm:pi-lean-ctx` to `.pi/settings.json`, updated SYSTEM.md, package.json, SKILL.md
- Key finding: pi-lean-ctx (v3.4.5) provides 48 MCP tools, auto read-mode selection, spawnHook bash wrapping, compression stats. Replaces basic custom extension completely.
- Verification: tsc check passes, all peer deps satisfied, @sinclair/typebox aliased by jiti loader.

## [2026-04-30] autoresearch | semantic code search tools
- Rounds: 2
- Sources found: 5
- Pages created: [[ck-semantic-search]], [[vgrep-semantic-search]], [[ck-tool]], [[vgrep-tool]], [[hybrid-code-search]], [[agent-search-enforcement]], [[mcp-tool-routing]], [[Research: semantic code search tools]]
- Synthesis: [[Research: semantic code search tools]]
- Key finding: ck (BeaconBay/ck, 1.6k ⭐) is best drop-in semantic grep for AI agents. Enforcement needs 3-layer defense: system prompt rules + MCP registration + shell/harness routing. No tool currently auto-enforces.

## [2026-04-30] autoresearch | context-mode vs lean-ctx
- Rounds: 1 (truncated — sufficient data from direct sources)
- Sources found: 3
- Pages created: [[context-mode-website]], [[leanctx-website]], [[think-in-code-blog]], [[think-in-code]], [[agentic-harness-context-enforcement]], [[Research: context-mode vs lean-ctx]]
- Synthesis: [[Research: context-mode vs lean-ctx]]
- Key finding: context-mode excels at sandbox enforcement + Think in Code paradigm; lean-ctx excels at intelligent compression + agent governance. They address different halves of the context problem and could theoretically coexist.

## [2026-04-30] autoresearch | GitIngest and GitReverse Integration
- Rounds: 1 (direct source analysis — both service homepages, READMEs, APIs, output formats)
- Sources found: 2
- Pages created: [[gitingest]], [[gitreverse]], [[codebase-to-context-ingestion]], [[research-gitingest-gitreverse-integration]]
- Synthesis: [[research-gitingest-gitreverse-integration]]
- Key finding: Gitingest (codebase → structured text) is a strong fit for the harness. It fills a gap — the harness has no bulk codebase ingestion mechanism, only file-by-file lean-ctx reading. GitReverse (repo → synthetic LLM prompt) is not useful — it generates prompts FROM repos, but the harness receives prompts. Recommendation: integrate Gitingest via a `/gitingest` skill (renamed from `/ingest` to avoid clash with wiki-ingest). Skip GitReverse.

## [2026-04-30] autoresearch | WOZCODE Token-Reduction Architecture
- Rounds: 1 (direct source analysis — single authoritative product page + docs + security)
- Sources found: 1
- Pages created: [[research-wozcode-token-reduction]], [[wozcode]], [[ast-truncation]], [[fuzzy-edit-matching]], [[inline-post-edit-validation]], [[model-routing-agents]]
- Pages updated: [[harness-implementation-plan]] (added Phases 10-13 with WOZCODE-inspired enhancements), [[index]], [[hot]]
- Synthesis: [[research-wozcode-token-reduction]]
- Key finding: WOZCODE achieves 25-55% token reduction via three compounding levers — smarter search (AST truncation), batched fuzzy edits (near-miss tolerance), and quality loop (inline post-edit validation). These map to 4 new harness phases (10-13) requiring 5 fundamental agent architecture changes: model router layer, inline validation pipeline, AST-aware tool primitives, non-exact tool matching, and tool result intermediation.

## [2026-04-30] autoresearch | Agent-First Codebase Exploration Strategies
- Rounds: 2 (broad search + gap fill → direct synthesis)
- Sources found: 5
- Pages created: [[research-agent-first-codebase-exploration]], [[oss-guide-codebase-exploration]], [[aider-repomap-tree-sitter]], [[swe-agent-aci]], [[swe-bench]], [[openhands-platform]], [[agent-codebase-interface]], [[progressive-disclosure-agents]], [[repo-map-ranking]], [[execution-feedback-loop]]
- Synthesis: [[research-agent-first-codebase-exploration]]
- Key finding: Humans and agents need fundamentally different codebase interfaces. Humans learn by using projects; agents learn by mapping them. Every human-centric OSS technique maps to an agent-native equivalent via Agent-Codebase Interface (ACI) design, with agents excelling at symbol ingestion and cross-reference tracking while struggling with context window limits and lack of visual pattern recognition.

## [2026-04-28] create | Harness-Wiki Integration Contract (ADR-010 + Skill Mapping + Pipeline)
- Created: [[adr-010]], [[harness-wiki-skill-mapping]], [[harness-wiki-pipeline]]
- Updated: [[index]] (added 3 new entries)
- Created directories: wiki/sources/, wiki/entities/, wiki/concepts/, wiki/questions/, wiki/folds/, wiki/canvases/
- Key insight: Every harness layer MUST read wiki before acting and write wiki after every state transition. This is enforced at L7 schema orchestration extension hooks. The read-first/write-after contract adds ~3,000-6,000 tokens per subtask but eliminates design drift and wiki staleness entirely.
- ADR-010 establishes the tight-coupling contract: no layer acts without querying wiki for relevant ADRs, specs, and patterns first; no state transition completes without a wiki write.
- 11 Obsidian skills are mapped to specific pipeline stages with exact read/write/format responsibilities per layer.
- 7 staleness elimination rules ensure no page goes stale: status propagation, decision referencing, cross-reference integrity, contradiction resolution, hot cache freshness, lint schedule, index synchronization.
- Token budget impact: ~20-35% increase overhead, from ~83,500 to ~102,500-117,500 per 5-subtask plan.


## [2026-04-28] ingest | Full GitHub Wiki (re-ingest, previously interrupted)
- Source: `.raw/ultimate-pi.wiki/` (13 markdown pages from GitHub wiki)
- Summary: Complete ingest of all 8 harness layer concept pages, implementation plan, ADR-008, ADR-009
- Pages created: [[spec-hardening]], [[structured-planning]], [[grounding-checkpoints]], [[adversarial-verification]], [[automated-observability]], [[persistent-memory]], [[schema-orchestration]], [[wiki-query-interface]], [[harness-implementation-plan]], [[adr-008]], [[adr-009]]
- Pages updated: [[harness]], [[index]], [[hot]]
- Key insight: Each harness layer is a self-contained module with its own data contracts, extension interfaces, config, and file map. ADR-008 (black-box QA) and ADR-009 (claude-obsidian Mode B) are folded as decision pages.

## [2026-04-28] ingest | Harness Implementation Plan
- Source: `.raw/ultimate-pi.wiki/projects/ultimate-pi/harness-implementation-plan.md`
- Summary: Future implementation plan for the 8-layer Agentic Harness
- Pages created: [[harness]]
- Pages updated: [[index]], [[hot]]
- Key insight: The Agentic Harness relies on 8 rigid layers, including spec-based QA and Obsidian-backed memory, enforcing strict verification over agent confidence.

## [2026-04-28] ingest | Core Codebase & ADR
- Source: Repository root traversal (`skills/`, `extensions/`, `bench/`)
- Summary: Initial mapping of the ultimate-pi repository
- Pages created: [[skills]], [[extensions]], [[bench]], [[colocate-wiki]]
- Pages updated: [[index]], [[hot]]
- Key insight: Storing the wiki in the same repo is a deliberate choice to keep code and docs synced and accessible to agent tooling.

- 2026-04-28: Scaffolding completed for codebase map and architecture wiki (Mode B).
