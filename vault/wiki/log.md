# Wiki Operations Log

## [2026-04-30] autoresearch | Meta-Agent Context Drift Detection
- Rounds: 2
- Sources found: 10 (searched), 9 fetched, 4 filed as source pages
- Pages created: [[Research: Meta-Agent Context Drift Detection]], [[ironclaw-drift-monitor]], [[langsight-loop-detection]], [[agent-drift-academic-paper]], [[vectara-guardian-agents]], [[context-drift-in-agents]], [[meta-agent-context-pruning]], [[agent-loop-detection-patterns]], [[guardian-agent-pattern]]
- Pages updated: [[index]], [[log]], [[hot]]
- Key finding: The meta-agent concept (detect stuck → prune context → restart) is a NOVEL SYNTHESIS. Each component exists independently (ironclaw DriftMonitor for detection, SWE-Pruner for context pruning, LangSight for loop detection, Vectara for guardian agents) but no system combines all three phases. The closest prior art is nearai/ironclaw #1634 (March 2026) which implements detection + injection but does NOT prune context. Academic foundation: Agent Drift paper (arxiv 2601.04170) quantifies 42% task success reduction from drift, ASI framework across 12 dimensions. Proposed harness integration: Layer 2.5 — Runtime Drift Monitor between L2 (Plan) and L3 (Execute).

## [2026-04-30] research | Model-Adaptive Agent Harness Design
- Rounds: 1 (deep first-principles analysis + Forge Code source)
- Sources found: 1 (Forge Code blog: GPT 5.4 vs Opus 4.6 on TermBench 2.0)
- Pages created: [[Research: Model-Adaptive Agent Harness Design]], [[forgecode-gpt5-agent-improvements]], [[model-adaptive-harness]], [[harness-configuration-layers]]
- Pages updated: [[index]], [[log]], [[hot]]
- Config files created: `references/harness-config.md`, `references/model-profiles.md` (rewritten)
- Config files updated: `SKILL.md`, `references/program.md`
- Key finding: Agent harness is a four-layer configurable system (Signal, Gate, Channel, Completion), not a fixed script. Each layer has dimensions that vary by model. GPT needs flat structure, constraints-first ordering, enforced gates, in-band signals. Opus tolerates nesting, infers from metadata, self-corrects. The skill was redesigned from one-size-fits-all into a model-adaptive harness with opus relaxation annotations.

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
