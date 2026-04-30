# Wiki Operations Log

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
- Synthesis: [[Research: GitIngest and GitReverse Integration]]
- Key finding: Gitingest (codebase → structured text) is a strong fit for the harness. It fills a gap — the harness has no bulk codebase ingestion mechanism, only file-by-file lean-ctx reading. GitReverse (repo → synthetic LLM prompt) is not useful — it generates prompts FROM repos, but the harness receives prompts. Recommendation: integrate Gitingest via a `/gitingest` skill (renamed from `/ingest` to avoid clash with wiki-ingest). Skip GitReverse.

## [2026-04-30] autoresearch | WOZCODE Token-Reduction Architecture
- Rounds: 1 (direct source analysis — single authoritative product page + docs + security)
- Sources found: 1
- Pages created: [[research-wozcode-token-reduction]], [[wozcode]], [[ast-truncation]], [[fuzzy-edit-matching]], [[inline-post-edit-validation]], [[model-routing-agents]]
- Pages updated: [[harness-implementation-plan]] (added Phases 10-13 with WOZCODE-inspired enhancements), [[index]], [[hot]]
- Synthesis: [[Research: WOZCODE Token-Reduction Architecture]]
- Key finding: WOZCODE achieves 25-55% token reduction via three compounding levers — smarter search (AST truncation), batched fuzzy edits (near-miss tolerance), and quality loop (inline post-edit validation). These map to 4 new harness phases (10-13) requiring 5 fundamental agent architecture changes: model router layer, inline validation pipeline, AST-aware tool primitives, non-exact tool matching, and tool result intermediation.

## [2026-04-30] autoresearch | Agent-First Codebase Exploration Strategies
- Rounds: 2 (broad search + gap fill → direct synthesis)
- Sources found: 5
- Pages created: [[research-agent-first-codebase-exploration]], [[oss-guide-codebase-exploration]], [[aider-repomap-tree-sitter]], [[swe-agent-aci]], [[swe-bench]], [[openhands-platform]], [[agent-codebase-interface]], [[progressive-disclosure-agents]], [[repo-map-ranking]], [[execution-feedback-loop]]
- Synthesis: [[Research: Agent-First Codebase Exploration Strategies]]
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
