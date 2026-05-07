---
type: meta
status: active
created: 2026-04-28
updated: 2026-05-05
tags: [meta, log, operations]
---

# Wiki Operations Log

## [2026-05-07] replace | pi-lean-ctx → context-mode
- **Decision**: [[2026-05-07-replace-lean-ctx-with-context-mode]]
- **Changes**: replaced `npm:pi-lean-ctx` with `npm:context-mode` in `.pi/settings.json`; replaced `pi-lean-ctx` devDependency with `context-mode` in `.pi/npm/package.json`; deleted `.pi/extensions/ck-enforce.ts` (lean-ctx-specific grep override); updated `package.json` keyword and `CONTRIBUTING.md`
- **Tradeoff**: gained FTS5 sandbox + 11K+ community + native Pi hooks; lost AST compression (tree-sitter 18 langs), 90+ shell pattern compression, smart read modes, agent governance (profiles/budgets/SLOs), 48 MCP tools → 11
- **Risk**: `ck-enforce.ts` was blocking conceptual grep and steering to `ck --hybrid` — now relies on SYSTEM.md policy compliance alone
- Rounds: 2 (broad search across 4 angles + targeted gap fill on 3 new extensions + 2 SOTA developments)
- Searches: 8 | Sources found: 5 new (pi-rtk-optimizer, pi-omni-compact, pi-context-prune, Anthropic Compaction API, Context Folding paper)
- Pages created: [[pi-rtk-optimizer-github-repo]], [[pi-omni-compact-github-repo]], [[pi-context-prune-github-repo]], [[anthropic-compaction-api]], [[context-folding-paper]] (sources), [[context-folding]] (concept)
- Pages updated: [[pi-compaction-extensions-ecosystem]] (4→7 extensions, 3-layer architecture), [[deterministic-session-compaction]] (context folding comparison, 3-layer model), [[Research: pi-vcc]] (major update: 10 findings, expanded ecosystem, SOTA developments), [[index]], [[log]], [[hot]]
- Key finding: Pi compaction ecosystem grew from 4 to 7 extensions across three layers (prevention → pruning → compression). Anthropic launched official server-side compaction API (beta Jan 2026). Context Folding (arXiv 2510.11967) achieves 10x context reduction via RL-trained branch/return. Tool-calling accuracy collapses ~40% past 80K tokens (hard cliff). pi-vcc remains the only zero-LLM option across all 7 extensions and the official API.

## [2026-05-05] wiki-autoresearch | pi-vcc (metrics refresh)
- Rounds: 2 (broad pass + targeted gap fill)
- Searches: 7 | Sources found: 4 (pi-vcc repo, pi.dev package page, pi core compaction docs, Codex DSC issue)
- Pages created: none (refresh run)
- Pages updated: [[pi-vcc-github-repo]] (stars/install metrics refreshed), [[Research: pi-vcc]] (overview + source stats refreshed), [[index]], [[log]], [[hot]]
- Key finding: Core findings remain stable: pi-vcc is still the only deterministic compaction extension in Pi's current ecosystem. Fresh metrics now show 75 stars and 3,299 monthly / 606 weekly installs, indicating gradual adoption while the architectural differentiation remains unchanged.

## [2026-05-05] wiki-autoresearch | pi-vcc (competitive landscape)
- Rounds: 2 (broad search across 4 angles + targeted gap fill on 3 gaps)
- Searches: 7 | Sources found: 5 (pi-vcc repo, pi core docs, Distill repo, Codex DSC RFC, Pi compaction ecosystem)
- Pages created: [[distill-deterministic-context-compression]] (source), [[codex-dsc-rfc-8573]] (source), [[pi-compaction-extensions-ecosystem]] (source), [[deterministic-session-compaction]] (concept)
- Pages updated: [[pi-vcc-github-repo]] (enriched with benchmarks, forks, ecosystem position), [[vcc-conversation-compaction-for-pi]] (competitive context added), [[Research: pi-vcc]] (major rewrite: 8 findings, competitive landscape, 5 open questions), [[index]], [[log]], [[hot]]
- Key finding: pi-vcc is uniquely positioned as the only fully deterministic compaction extension in Pi's 4-extension ecosystem. The pattern is independently validated by Codex DSC RFC (rejected but technically sound), Distill (143 stars, different layer), and MemoSift. The recall capability (`vcc_recall` over raw JSONL) is the killer differentiator no competitor offers.

## [2026-05-05] wiki-autoresearch | pi-vcc (refresh)
- Rounds: 2 (broad verification + targeted gap fill)
- Sources found: 3 (pi-vcc repo, npm package metadata, pi core compaction docs)
- Pages created: none (existing pages refreshed)
- Pages updated: [[pi-vcc-github-repo]], [[Research: pi-vcc]], [[index]], [[log]], [[hot]]
- Key finding: `pi-vcc` can explicitly take over `/compact` and auto-compaction routing with `overrideDefaultCompaction: true`, clarifying deployment mode versus Pi core defaults.

## [2026-05-05] wiki-autoresearch | pi-vcc
- Rounds: 2 (broad topic framing + targeted gap fill)
- Sources found: 2 (pi-vcc repo/package docs, pi core compaction docs)
- Pages created: [[pi-mono-compaction-docs]] (source), [[Research: pi-vcc]] (synthesis)
- Pages updated: [[index]] (added source and synthesis entries), [[log]] (this entry), [[hot]] (new pi-vcc section)
- Key finding: Pi already has built-in compaction; `pi-vcc` is a deterministic compaction + recall extension that adds predictable behavior and lineage recall ergonomics rather than introducing compaction from zero.

## [2026-05-05] wiki-autoresearch | vcc extension for pi coding agent
- Rounds: 2 (broad search + ambiguity gap-fill)
- Sources found: 4 (pi0 marketplace, tintinweb model provider marketplace, cdervis community marketplace, sting8k/pi-vcc)
- Pages created: [[pi-vscode-marketplace]], [[pi-vscode-model-provider-marketplace]], [[vscode-pi-community-extension]], [[pi-vcc-github-repo]] (sources), [[pi-vscode-extension-landscape]], [[vcc-conversation-compaction-for-pi]] (concepts), [[Research: vcc extension for pi coding agent]] (synthesis)
- Pages updated: [[index]] (added concepts, sources, synthesis entries), [[log]] (this entry), [[hot]] (new research section)
- Key finding: "vcc extension for pi coding agent" has two valid meanings. VS Code side has three active extension patterns (official bridge, LM provider, community full UI). Literal VCC side maps to `pi-vcc`, a deterministic Pi compaction/recall package (not a VS Code UI extension).

## [2026-05-05] wiki-autoresearch | how GSD fits into our coding harness setup
- Rounds: 1 (primary source scrape + 3 search angles + HN discussion + community analysis)
- Sources found: 4 (GSD GitHub repo, codecentric deep dive, HN discussion ~473 pts, freeCodeCamp GAN comparison)
- Pages created: [[gsd-github-repo]], [[gsd-codecentric-deep-dive]], [[gsd-hn-discussion]] (sources), [[gsd-get-shit-done]] (entity), [[Research: how GSD fits into our coding harness setup]] (synthesis)
- Pages updated: [[index]] (added 5 entries), [[log]] (this entry), [[hot]] (new research section)
- Key finding: GSD is downstream (builds apps). Our harness is upstream (controls agent behavior). They are complementary, not competitive. GSD's context engineering + wave execution patterns are adoptable. GSD lacks adversarial verification — our L4 fills that gap. GSD's community limitations (token-heavy, degrades at scale) validate our harness design.

## [2026-05-05] wiki-autoresearch | Superpowers skill for agentic coding agents
- Rounds: 1 (broad search with 5 angles, rich primary sources found directly)
- Sources found: 3 (GitHub repo, release blog, Termdock analysis) + 5 search angle results
- Pages created: [[questions/Research-superpowers-skill-for-agentic-coding-agents]] (synthesis), [[superpowers-github-repo]] (source), [[superpowers-release-blog]] (source), [[superpowers-termdock-analysis]] (source), [[superpowers-methodology]] (concept), [[agent-skills-ecosystem]] (concept), [[jesse-vincent]] (entity)
- Pages updated: [[index]] (added 7 entries to Concepts, Entities, Sources, Research sections), [[log]], [[hot]]
- Key finding: Superpowers (179K ⭐) validates our skill-first architecture. It can be integrated as `.pi/skills/superpowers/` skill set, adding hard-gate methodology enforcement (brainstorm→plan→TDD→subagent→review). But Superpowers cannot replace our deterministic code-level enforcement (drift monitor). Best approach: adopt Superpowers as methodology layer (probabilistic) + our harness for enforcement layer (deterministic).

## [2026-05-05] wiki-autoresearch | claude-mem over obsidian wiki as the knowledge base for our agentic harness pipeline. think from first principles. does this replace or complement our current setup? no hard feelings about previous decisions. gimme accurate points
- Rounds: 2 (broad architecture pass + targeted evidence-gap check)
- Sources found: 5 (existing authoritative vault sources)
- Pages created: [[questions/Research: claude-mem over obsidian wiki as the knowledge base for our agentic harness pipeline. think from first principles. does this replace or complement our current setup? no hard feelings about previous decisions. gimme accurate points]]
- Synthesis: [[Research: claude-mem over obsidian wiki as the knowledge base for our agentic harness pipeline. think from first principles. does this replace or complement our current setup? no hard feelings about previous decisions. gimme accurate points]]
- Key finding: claude-mem complements wiki as fast cache. It does not replace wiki as canonical memory without new evidence for provenance, durability, and conflict-safe governance.

## [2026-05-05] wiki-autoresearch | how claude-mem fits into our workflow. and whether it should replace obsidian in the codebase. no hard feelings about previous actions, rethink from first principles always
- Rounds: 2 (broad local corpus scan + targeted gap check)
- Sources found: 5 (from existing vault corpus)
- Pages created: [[questions/Research: how claude-mem fits into our workflow. and whether it should replace obsidian in the codebase. no hard feelings about previous actions, rethink from first principles always]]
- Synthesis: [[Research: how claude-mem fits into our workflow. and whether it should replace obsidian in the codebase. no hard feelings about previous actions, rethink from first principles always]]
- Key finding: Do not replace Obsidian as canonical Layer 6 memory now. Use claude-mem, if adopted, as non-authoritative cache with mandatory wiki write-back gates.

## [2026-05-05] wiki-autoresearch | claude-mem over Obsidian for Harness Layer
- Rounds: 2 (local corpus scan + targeted gap check)
- Sources found: 5
- Pages created: [[questions/Research: claude-mem over Obsidian for Harness Layer]], [[concepts/memory-system-of-record-vs-ephemeral-cache]]
- Synthesis: [[Research: claude-mem over Obsidian for Harness Layer]]
- Key finding: Do not replace Obsidian as Layer 6 memory system-of-record. If claude-mem is introduced, use it as non-authoritative cache and keep wiki as canonical source with hook-enforced write-back.

## [2026-05-04] implement | Layer 2: grep interception + file watcher for ck
- **ck-enforce pi extension** (`.pi/extensions/ck-enforce.ts`): Overrides lean-ctx's `grep` tool on `session_start`. Detects conceptual patterns (multi-word, no regex) and reroutes to `ck --hybrid`. Literal/exact patterns pass through to native rg. Status command: `/ck-enforce`.
- **File watcher** (`.pi/scripts/ck-watch.sh`): Node.js fs.watch-based auto-reindexer. Watches for source file changes (ts, js, py, rs, md, json, etc.) with 1500ms debounce. Excludes node_modules, .ck, .git, dist, build, .pi/npm. Verified: reindexes in ~400ms on change.
- **Dependency added**: `@sinclair/typebox` (devDependency, for grep tool schema)
- Pages updated: `.pi/SYSTEM.md` (unchanged — policy already there), `wiki/index.md` (updated question status), `wiki/log.md` (this entry)
- Key finding: Registration on `session_start` required because lean-ctx loads as a package after project extensions. Without session_start delay, lean-ctx's grep would overwrite ck-enforce's grep.
- Verification: TypeScript compiles clean, ck-watch reindexes correctly, ck-index status shows 342 files / 1593 chunks.

## [2026-05-04] implement | Semantic code search enabled — ck installed, indexed, enforced
- **P13 Implemented**: ck (BeaconBay/ck) installed, semantic index built (342 files, 1,593 chunks, 2.7MB, BAAI/bge-small-en-v1.5)
- **Skill created**: `.pi/skills/ck-search/SKILL.md` — teaches agent when/how to use ck vs grep, search decision tree, token efficiency guidance
- **System prompt enforced**: `SYSTEM.md` updated with CODEBASE SEARCH POLICY section — NEVER raw grep for exploration, ALWAYS ck --hybrid
- **Index built**: `ck index .` — 342 files indexed, hybrid search working (BM25 + semantic RRF fusion)
- **Gitignore updated**: `.ck/` added to .gitignore (regenerable, like wiki-search index)
- **Pages created**: [[how-to-enable-semantic-code-search-now]] (question/answer synthesis)
- **Pages updated**: [[index]] (new question entry), [[log]] (this entry)
- Key finding: Augment Code proves semantic indexing beats grep at scale — same model scores 1.59% higher on SWE-bench Pro with better context. Three-layer enforcement (prompt rules → skill guidance → future pre-exec hook) is the proven strategy. ck search returns ranked, scored results (~500-1000 tokens) vs raw grep output (~5000-20000 tokens).

## [2026-05-04] cleanup | Removed custom event bus — pi now has built-in event bus
- Pi's latest version ships a native event bus — custom `events.ts` and `harness-event-bus.ts` no longer needed
- Code layer reduced: 4 files → 3 files (types, config, drift-monitor). Event bus removed.
- Pages updated: [[adr-017]] (superseded), [[skill-first-architecture]] (event bus removed from code layer), [[Research: Skill-First Harness Architecture]] (architecture table updated), [[mvp-implementation-blueprint]] (19 files, event bus removed), [[index]] (ADR-017 status), [[hot]] (Skill-First section), [[log]] (this entry)
- Key finding: Skills register directly with pi's built-in event bus. No custom wiring needed. Reduces code surface: 3 TS files, ~600 lines (was 4 files, ~800 lines).

## [2026-05-03] wiki-autoresearch | pi-vs-claude-code Agentic Orchestration Pipeline
- Rounds: 2 (repo scrape + 4 broad searches + 2 gap-fill searches)
- Sources found: 5
- Pages created: [[sources/disler-pi-vs-claude-code]], [[sources/opendev-arxiv-2603.05344v1]], [[sources/martin-fowler-harness-engineering]], [[sources/mindstudio-four-agent-types]], [[sources/anthropic-effective-harnesses]] (sources), [[concepts/agentic-orchestration-pipeline]], [[concepts/agent-harness-architecture]], [[concepts/multi-agent-specialization]], [[concepts/context-engineering]], [[concepts/safety-defense-in-depth]] (concepts), [[entities/pi-coding-agent]], [[entities/disler-indydevdan]], [[entities/opendev]] (entities), [[questions/Research-pi-vs-claude-code-agentic-orchestration-pipeline]] (synthesis)
- Pages updated: [[index]], [[log]], [[hot]]
- Key finding: Pi's extension system can implement full multi-agent orchestration (subagent delegation, team dispatch, sequential chaining) entirely in user-space TypeScript. Three orchestration patterns + five-layer safety architecture + staged context compaction. Schema-level tool isolation more robust than runtime permission checks. Harness = Guides + Sensors + Steering Loop. Our harness can adopt all three orchestration patterns as `.pi/skills/` extensions backed by YAML config.

## [2026-05-03] harness-update | sentrux integration into harness implementation plan
- Replaced Fallow (P44a-g) with sentrux for structural quality gate
- Added sentrux MCP (9 tools) to L2.5 drift monitor, L3 grounding, P20 gate, L5 observability
- Updated: [[harness-implementation-plan]], [[harness]], [[Research: sentrux.dev]], [[index]], [[hot]]
- sentrux adds 0 LLM tokens — all tools are deterministic Rust computations

## [2026-05-03] wiki-autoresearch | sentrux.dev
- Rounds: 1 (primary source scrape + docs + 1 external search)
- Sources found: 7 (GitHub README, sentrux.dev, 4 docs pages, Pro architecture doc, Reddit launch post)
- Pages created: [[sentrux-github-repo]], [[sentrux-dev-landing]], [[sentrux-docs-quality-signal]], [[sentrux-docs-root-cause-metrics]], [[sentrux-docs-rules-engine]], [[sentrux-docs-pro-architecture]] (sources), [[Quality Signal (sentrux)]], [[Five Root Cause Metrics (sentrux)]], [[sentrux Rules Engine]], [[sentrux MCP Integration]] (concepts), [[sentrux (tool)]] (entity), [[Research: sentrux.dev]] (synthesis)
- Key finding: sentrux positions itself as the missing feedback loop for AI-agent code quality — 5 graph-theoretic metrics aggregated via geometric mean (Nash theorem), MCP integration with 9 tools, 52 languages via tree-sitter. <2 months old, 1.9k stars, mixed community reception.

## [2026-05-03] autoresearch | Automating Software Engineering — Lovable, Bolt, Emergent, Rocket
- Rounds: 1 (5 broad searches + 11 scrapes)
- Sources found: 6 (Lovable architecture/clone/docs, Bolt architecture/EvilMartians, OpenAI Codex blog, OpenDev arxiv, Anthropic harness blog, Rocket platform + TechCrunch, Emergent website)
- Pages created: [[Source: Lovable Architecture & Clone Analysis]], [[Source: Bolt.new Architecture & Case Study]], [[Source: Rocket.new — Vibe Solutioning Platform]], [[Source: OpenAI Harness Engineering — 0 Lines of Human Code]], [[Source: OpenDev — Building AI Coding Agents for the Terminal]] (sources), [[Context-Aware System Reminders]], [[Multi-Agent AI Coding Architecture]] (concepts), [[Lovable (company)]], [[Bolt.new (StackBlitz)]], [[Rocket.new]], [[Emergent Labs]] (entities), [[Research: Automating Software Engineering - Lovable, Bolt, Emergent, Rocket]] (synthesis)
- Pages updated: [[context-engineering]] (stub → developing, enriched with OpenDev/OpenAI/Anthropic findings)
- Key finding: Multi-agent architecture (Planner→Architect→Coder/Generator→Evaluator) is universal across all platforms. Environment control (WebContainers, Chrome DevTools MCP, Playwright) is the moat — agents must run and verify code, not just generate it. Context engineering is the central design constraint — progressive disclosure, adaptive compaction, system reminders at decision points. OpenAI built product with 0 lines of human code over 5 months (~1M lines, ~1.5K PRs). Rocket.new thesis: code generation is a commodity; deciding what to build is the missing piece.

## [2026-05-03] autoresearch | Engineering Workflows of Legendary Programmers and AI Harness Mapping
- Rounds: 2 (5 broad searches + 11 scrapes + 3 gap-fill searches)
- Sources found: 5 (Linux coding style, Unix philosophy, Kernighan interview, Hejlsberg 7 learnings, Guido design philosophy)
- Pages created: [[linux-kernel-coding-workflow]], [[unix-philosophy]], [[birth-of-unix-kernighan-interview]], [[hejlsberg-7-learnings]], [[guido-python-design-philosophy]] (sources), [[legendary-engineering-patterns-harness]] (concept), [[Linus Torvalds]], [[Ken Thompson]], [[Dennis Ritchie]], [[Anders Hejlsberg]], [[Guido van Rossum]], [[Bjarne Stroustrup]] (entities), [[Research: Engineering Workflows of Legendary Programmers and AI Harness Mapping]] (synthesis)
- Pages updated: [[index]], [[log]], [[hot]]
- Key finding: 10 cross-cutting engineering patterns from 6 legendary programmers map directly to harness layers. Core insight: same principles that produced Linux/Unix/C/C++/Python/TypeScript must constrain AI-generated code. Type systems (Hejlsberg, Stroustrup) emerge as essential AI guardrails — deterministic constraints matter MORE with AI, not less. All six programmers oppose vibe coding; human architectural control is non-negotiable. Thompson's productivity demonstrates that deep system understanding enables extreme leverage — semantic codebase indexing is prerequisite, not optional. Subtractive design (McIlroy/Thompson's "what can we throw out") is the antidote to AI bloat but not yet implemented in any harness layer.

## [2026-05-03] autoresearch | Skill-First MVP & Harness Implementation Architecture
- Rounds: 2 (5 broad searches + 5 primary scrapes + 2 gap-fill searches)
- Sources found: 3 (SwirlAI Skills, Claude API Skills, Blake Crosley Agent Architecture)
- Pages created: [[Source: SwirlAI Agent Skills Progressive Disclosure]], [[Source: Claude API Agent Skills Overview]], [[Source: Blake Crosley Agent Architecture Guide]] (sources), [[skill-first-architecture]] (concept), [[Research: Skill-First Harness Architecture]] (synthesis)
- Pages rewritten (major): [[mvp-implementation-blueprint]] (Skill-First v2), [[harness-implementation-plan]] (Skill-First v2)
- Pages updated: [[index]], [[log]], [[hot]]
- Key finding: Harness layers should be markdown-based skills, not TypeScript code. Only deterministic infrastructure needs code: event bus, drift monitor, types, config. Cuts code surface from 15 TS files to 4. Progressive disclosure keeps context lean (~480 tokens for all 6 harness skills at discovery vs ~15K tokens for loaded code modules). Independently validated by Anthropic, OpenAI, Google, GitHub, Cursor all adopting the SKILL.md open standard within weeks of release. 20 total files (4 code + 12 skill + 4 config). ~8 weeks to MVP (down from ~9).

## [2026-05-03] question | MVP Implementation Blueprint Filed
- **Page**: [[mvp-implementation-blueprint]] — Filed to `vault/wiki/questions/`.
- **Source**: Deep wiki query synthesizing HARNESS-PRD, harness-implementation-plan, 18 ADRs (008-025), drift-detection-unified.
- **Content**: Comprehensive MVP build plan for Groups 1-3 + P20 gate per ADR-015 pipeline-first order. 15 source files defined with type interfaces, config architecture, drift monitor patterns (LLM-first Haiku 4.5 + 6-rule pre-filter), L4 critic via @tintinweb/pi-subagents, P20 deterministic gate (biome+tsc+fallow), L5-L8 trace/memory. ~9-week build order with incremental delivery milestones.
- Pages updated: [[index]] (added Questions section), [[log]].

## [2026-05-02] correction | Fabricated npm packages removed, real tools documented, browser-harness replaces Puppeteer
- Rounds: 1 (correction research — npm verification + firecrawl searches + GitHub scrapes)
- Sources created: [[Source: Build-Time Prompt Compilation Architecture]], [[Source: browser-harness CDP Harness]]
- Concepts created: [[browser-harness-agent]]
- Pages corrected (PromptKit PackC → real tools): [[Source: PromptKit PackC Compiler]] (replaced by [[Source: Build-Time Prompt Compilation Architecture]]), [[Build-Time Prompt Compilation]], [[Prompt Renderer]], [[Research: Prompt Renderer for Multi-Model Agent Harness]], [[hot]], [[log]], [[index]]
- Pages corrected (Puppeteer → browser-use): [[browser-subagent-visual-verification]], [[harness-implementation-plan]] (P30), [[HARNESS-PRD]] (P30 + P22b + Q10 + dependency table)
- Key finding: "PromptKit PackC" was fabricated by LLM hallucination — no such npm package exists. Real alternatives: Microsoft prompt-engine (2.8K stars, MIT, YAML→prompt, abandoned 2022) validates the pattern; PromptWeaver (`@iqai/prompt-weaver`, MIT, Dec 2025) provides Handlebars template compilation + Zod validation. Implementation: DIY pipeline (js-yaml + PromptWeaver + per-model renderer plugins). For browser subagent: browser-harness (9.4K stars, MIT) — thin CDP harness by browser-use — replaces Puppeteer as the LLM-to-Chrome bridge for P30.

## [2026-05-02] autoresearch | TypeScript Best Practices and Codebase Structure
- Rounds: 2 (5 broad searches + 5 primary fetches + 5 gap-fill searches + 5 gap-fill fetches)
- Sources found: 10 | Fetched: 10
- Pages created: [[ts-strict-mode-rishikc]], [[ts-runtimes-comparison-betterstack]], [[barrel-files-tkdodo]], [[ts-monorepo-koerselman]], [[vitest-official]], [[ts-folder-structure-mingyang]], [[ts-best-practices-2025-devto]], [[ts-result-error-handling-kkalamarski]] (sources), [[typescript-strict-mode]], [[barrel-files]], [[monorepo-architecture]], [[result-monad-error-handling]] (concepts), [[javascript-runtimes]], [[vitest]] (entities), [[Research: TypeScript Best Practices and Codebase Structure]] (synthesis)
- Pages updated: [[index]], [[log]], [[hot]]
- Key finding: Enable `strict: true` by default. Avoid barrel files in app code (68% module bloat). Node.js remains safest runtime choice. Built-package strategy preferred for TS monorepos. Vitest replaced Jest as default test runner. Backend folders should be named by technical capability, not feature. Result monad pattern enables declarative error handling. ESLint `@typescript-eslint/recommended-type-checked` pairs with strict mode for defense-in-depth.

## [2026-05-02] autoresearch | Prompt Renderer for Multi-Model Agent Harness (CORRECTED 2026-05-02)
- Rounds: 2 (5 broad searches + 6 primary fetches + 2 gap-fill searches)
- Sources found: 4 (AgentBus Jinja2, TianPan Caching, Arxiv "Don't Break the Cache", Microsoft prompt-engine)
- Pages created: [[Prompt Renderer]], [[Build-Time Prompt Compilation]] (concepts), [[Source: Build-Time Prompt Compilation Architecture]], [[Source: AgentBus Jinja2 Prompt Pipelines]], [[Source: TianPan Prompt Caching Architecture]], [[Source: Arxiv — Don't Break the Cache]] (sources), [[Research: Prompt Renderer for Multi-Model Agent Harness]] (synthesis)
- Pages updated: [[index]], [[log]], [[hot]]
- **CORRECTION (2026-05-02)**: "PromptKit PackC" (npm, v1.4.6, 48 versions) does NOT exist — it was fabricated. The architecture pattern is valid but no mature off-the-shelf npm package implements it. Real tools: Microsoft prompt-engine (2.8K stars, MIT, abandoned 2022) validates YAML→prompt pattern; PromptWeaver (`@iqai/prompt-weaver`, MIT, Dec 2025) provides Handlebars template compilation + Zod validation. Implementation: DIY pipeline (js-yaml + PromptWeaver + per-model renderer plugins). See [[Source: Build-Time Prompt Compilation Architecture]].
- Key finding: Build-time prompt compilation is a PROVEN ARCHITECTURAL PATTERN — but no off-the-shelf npm package exists. Implementation: DIY pipeline (js-yaml + @iqai/prompt-weaver + per-model renderers). The architecture: base prompt spec (YAML) → per-model renderers (GPT/Claude/Gemini plugins applying each provider's official conventions) → compiled JSON shipped in npm → runtime just does string substitution for variables. Multi-tier caching (semantic → prefix → full) is well understood (41-80% cost savings, Arxiv-validated). Each model needs fundamentally DIFFERENT prompting conventions — OpenAI constraints-first, Anthropic XML tags, Google constraints-last — a single canonical prompt relaxed per model is WRONG. Two-phase variable system: compile-time vars produce multiple compiled variants, runtime vars are simple string-replace placeholders. Integration: new harness module (Phase P22b from prior research), compiler as `npm run compile-prompts` build step, compiled output in `dist/prompts/`.

## [2026-05-01] autoresearch | executor.sh Harness Integration
- Rounds: 1 (1 search, 3 fetches: executor.sh landing, GitHub README, DeepWiki architecture)
- Sources updated: [[executor-rhyssullivan]] (major rewrite — added product positioning, architecture, policy engine, DeepWiki details)
- Pages created (synthesis): [[Research: executor.sh Harness Integration]]
- Pages updated: [[harness-implementation-plan]] (new P43b + P43c sub-phases from Executor patterns, executor.sh research linked in related, new sub-phases in TS Execution Layer Validation table), [[index]], [[log]], [[hot]]
- Key finding: executor.sh positions RhysSullivan/executor as an **integration layer** (not just TS execution layer) — a unified catalog + auth + policy + execution runtime spanning OpenAPI, GraphQL, MCP, and custom sources. This scope is broader than our P43 classification. Three gaps revealed: (1) no tool catalog with intent-based discovery (`tools.discover()`), (2) no shared auth for external tools, (3) no execution pause/resume for human-in-the-loop. New P43b (Tool Catalog with Discovery) and P43c (Policy-Aware Execution) sub-phases added. Executor independently validates our First Principle #19 (code > JSON for tool calling) and extends it with policy/auth/execution lifecycle. Build vs integrate: use Executor as dependency for external API integration (post-v1); build custom runtime for harness-native L3 tools with borrowed catalog/discovery/policy patterns.

## [2026-05-01] autoresearch | Fallow Codebase Intelligence Harness Integration
- Rounds: 1 (3 DuckDuckGo searches, 1 primary GitHub fetch, 4 ecosystem searches)
- Sources fetched: 1 (fallow-rs/fallow GitHub README + docs)
- Pages created (sources): [[fallow-rs-codebase-intelligence]]
- Pages created (concepts): [[codebase-intelligence-harness-integration]], [[codebase-intelligence-ecosystem-comparison]]
- Pages created (synthesis): [[Research: Fallow Codebase Intelligence Harness Integration]]
- Pages updated: [[harness-implementation-plan]] (new phases P44a-P44g, Fallow Validation section, New Tools table, updated sources/related), [[index]] (fallow source + concepts + synthesis), [[log]], [[hot]]
- Key finding: Fallow (1.7K stars, MIT, Rust-native) is the ONLY codebase intelligence tool across TS/JS, Python, Go, Rust, and Elixir that provides dead code + duplication + complexity + boundaries in one sub-second package. Purpose-built for AI agents (MCP server, JSON `actions` array, `auto_fixable` flags). Fits 7 harness integration points: L3 tool calling (P44a), P15b pre-verify (P44b), Phase 16 gate (P44c), L5 observability (P44d), P29 error classification (P44e), L6 baselines (P44f), P42 automations (P44g). No ecosystem has a fallow-equivalent — every other language requires 3-5 separate tools for similar coverage.

## [2026-05-01] autoresearch | TypeScript Execution Layer for Agent Tool Calling
- Rounds: 1 (5 searches, 8 fetches across CodeAct, Cloudflare Code Mode, Executor, McNamara analysis)
- Sources fetched: 4 (Apple CodeAct research page, Cloudflare Code Mode official docs + GitHub, Executor GitHub README, McNamara context optimization analysis)
- Pages created (sources): [[codeact-apple-2024]], [[cloudflare-codemode]], [[executor-rhyssullivan]], [[colinmcnamara-context-optimization-codemode]]
- Pages created (concepts): [[ts-execution-layer]]
- Pages created (synthesis): [[Research: TypeScript Execution Layer for Agent Tool Calling]]
- Pages updated: [[harness-implementation-plan]] (new First Principle #19, new L3 phase P43, TS Execution Layer Validation section, updated savings mechanisms), [[mcp-tool-routing]] (added TS execution layer as alternative #4), [[agentic-harness-context-enforcement]] (added Layer 6: TypeScript Execution Layer, recommendation #6), [[index]], [[log]], [[hot]]
- Key finding: Three independent systems converge on the TypeScript execution layer pattern — Apple CodeAct (ICML 2024: +20% success, -30% turns), Cloudflare Code Mode (production: 3-4x context reduction, Worker sandbox), Executor (open-source: 1.3K stars, local-first TS runtime). Core insight: LLMs are better at writing code to orchestrate tools than at making individual tool calls. New P43 phase adds single `write_ts` tool + sandboxed TypeScript runtime with typed API for all L3 tools. Extends P14 (Think-in-Code) from data analysis to full tool orchestration. 3-4x context reduction on multi-tool workflows.

## [2026-05-01] autoresearch | Gemini CLI SOTA + Harness Integration from First Principles
- Rounds: 1 (5 broad searches, 8 primary fetches, 3 gap-fill fetches)
- Sources fetched: 8 (official architecture docs, official blog announcement, Render benchmark, Martin Fowler harness engineering, LangChain harness anatomy, OpenAI 5 principles summary, Augment harness engineering guide, Gemini CLI changelogs)
- Pages created (sources): [[Source: Google Gemini CLI Architecture Docs]], [[Source: Google Blog - Gemini CLI Announcement]], [[Source: Render AI Coding Agents Benchmark 2025]], [[Source: Martin Fowler - Harness Engineering]], [[Source: LangChain - Anatomy of Agent Harness]], [[Source: OpenAI Harness Engineering Five Principles]], [[Source: Augment - Harness Engineering for AI Coding Agents]], [[Source: Gemini CLI Changelogs]]
- Pages created (concepts): [[harness-engineering-first-principles]], [[agent-skills-pattern]], [[policy-engine-pattern]], [[gemini-cli-architecture]]
- Pages created (synthesis): [[Research: Gemini CLI SOTA Harness Integration]]
- Pages updated: [[index]], [[log]], [[hot]]
- Key finding: Gemini CLI (launched June 2025, v0.40+, 103k GitHub stars, 6,005 commits) introduced 15 SOTA harness primitives: agent skills with progressive disclosure, Plan Mode, codebase investigator subagent, context compression, chapters narrative, policy engine, subagents+remote agents (A2A), event-driven hooks, four-tier memory, multi-registry architecture, browser agent, model routing, sandboxing stack, git worktrees, extensions ecosystem. Seven integration opportunities identified from first principles (not feature-copying): P-F1 pre-execution policy gates, P-F2 skills activation mechanism, P-F3 research subagents for planning, P-F4 event-driven hooks middleware, P-F5 git worktree sessions, P-F6 chapters narrative, P-F7 browser agent. Each derived from harness engineering first principles (Feedforward-Feedback, Mechanical Enforcement, Progressive Disclosure, Model-Harness Independence). Benchmark shows Gemini CLI excels at editing existing codebases (context-driven) but struggles on greenfield — validates our grounding-heavy approach.

## [2026-05-01] autoresearch | Codex State-of-the-Art Harness Improvements
- Rounds: 1 (1 round, 8 primary fetches from GitHub + official docs)
- Sources fetched: 8 (GitHub repo README, AGENTS.md, codex-rs README, official docs subagents/memories/sandboxing/hooks/skills/workflows pages)
- Pages created (sources): [[codex-open-source-agent-2026]]
- Pages created (concepts): [[codex-harness-innovations]]
- Pages created (synthesis): [[Research: Codex State-of-the-Art Harness Improvements]]
- Pages updated: [[harness-implementation-plan]] (new First Principles #16-18, Codex Validation section, phases P38-P42, updated master description), [[index]], [[hot]], [[log]]
- Key finding: Codex (79.2K GitHub stars, open-source Apache 2.0, Rust 96.3%) independently validated 7 of our planned features (model-adaptive, skills, hooks, subagents, pre-verification, memory, worktrees) and revealed 5 new gaps: OS-level sandbox enforcement (P38), MCP server mode (P39), skills ecosystem tooling (P40), implicit memory capture (P41), scheduled automations (P42). Three novel architectural patterns: multi-surface agent architecture, Rust-native implementation as first-principles choice, sandbox as foundation with permissions as policy layer (FP #16). Codex also introduces bidirectional MCP (FP #17) and Chronicle-style implicit memory (FP #18).

## [2026-05-01] autoresearch | Claude Code State-of-the-Art Harness Improvements
- Rounds: 1 (4 broad searches, 6 primary fetches, official docs verification)
- Sources fetched: 6 (VILA-Lab arxiv paper, Qubytes architecture deep-dive, KaraxAI systems walkthrough, Penligent security architecture, official Agent SDK docs, official Hooks reference)
- Pages created (sources): [[claude-code-architecture-vila-lab-2026]], [[claude-code-architecture-qubytes-2026]], [[claude-code-architecture-karaxai-2026]], [[claude-code-security-architecture-penligent-2026]]
- Pages created (concepts): [[structured-compaction]], [[lifecycle-hooks]], [[subagent-worktree-isolation]]
- Pages created (synthesis): [[Research: Claude Code State-of-the-Art Harness Improvements]]
- Pages updated: [[harness-implementation-plan]] (new First Principles #12-15, Claude Code Validation section, phases P33-P37, updated gaps), [[index]], [[hot]], [[log]]
- Key finding: Claude Code's architecture (reverse-engineered from 510K-line TypeScript codebase, 82K+ GitHub stars) is the most sophisticated production agent harness. Six major innovations not in our plan: five-layer structured compaction (P34), 30+ lifecycle hook events with exit-code semantics (P33), permission subsystem with ML classifier (P35), subagent worktree isolation (P25b), additive config hierarchy (P37), session storage with checkpointing (P36). Claude Code validated 3 of our features (FP #1 harness>model, model-adaptive, skills system). Design tensions: embeddings (P13) vs agentic search, pipeline vs reactive loop. Four deliberate non-adoptions: plugin ecosystem, multi-surface interface, OS sandboxing, CLAUDE.md every-turn injection.

## [2026-05-01] autoresearch | Google Antigravity Harness Integration
- Rounds: 2 (5 broad searches, 4 gap-fill searches, 8 sources fetched)
- Sources fetched: 8 (Google official blog, Wikipedia, Cursor-vs-Antigravity comparison, Architecture deep dive, VentureBeat, MarkTechPost, The New Stack hands-on, engineering.01cloud deep dive)
- Pages created (sources): [[google-antigravity-official-blog]], [[google-antigravity-wikipedia]], [[cursor-vs-antigravity-2026]]
- Pages created (concepts): [[antigravity-agent-first-architecture]], [[agent-artifacts-verifiable-deliverables]], [[browser-subagent-visual-verification]]
- Pages created (synthesis): [[Research: Google Antigravity Harness Integration]]
- Pages updated: [[harness-implementation-plan]] (new First Principle #11, Antigravity Validation section, new phases P30/P31/P32, updated token budget), [[index]] (antigravity concepts + sources), [[hot]] (antigravity section), [[log]]
- Key finding: Google Antigravity (launched Nov 2025, Windsurf $2.4B acq) independently validated 7 of our planned features (model-adaptive, pre-verification isolation, subagent specialization, self-evolving harness, skills system, adversarial verification, dynamic context — different approaches). Revealed 3 critical gaps: no browser/visual verification (P30), no artifact generation for human review (P31), no cross-project learning (P32). First-principles lesson: trust requires proof (artifacts), not just criticism (adversarial review) — both are mandatory. Deliberately NOT adopting: 1M token context window (too expensive), full IDE integration (we are CLI), Google Cloud lock-in, $249.99/mo pricing.

## [2026-05-01] autoresearch | cursor.sh Harness Innovations
- Rounds: 2 (5 broad searches, 5 primary fetches, 2 gap-fill fetches)
- Sources fetched: 7 (Cursor engineering blog: shadow workspace, agent best practices, harness evolution, instant apply; ByteByteGo deep dive; MMNTM architecture analysis; speculative editing analysis)
- Pages created (sources): [[cursor-shadow-workspace-2024]], [[cursor-agent-best-practices-2026]], [[cursor-harness-april-2026]], [[cursor-shipped-coding-agent-2026]], [[cursor-instant-apply-2024]], [[cursor-fork-29b-2025]]
- Pages created (concepts): [[cursor-harness-innovations]]
- Pages created (synthesis): [[Research: cursor.sh Harness Innovations]]
- Pages updated: [[harness-implementation-plan]] (new First Principles #8-10, new phases P15b/P28/P29, P25 evolved to Subagent Specialization Router, P21 extended with Keep Rate + LLM-as-Judge, P10 extended with full-file rewrite mode, Cursor Validation section, F4 sandbox-as-infra), [[index]], [[log]], [[hot]]
- Key finding: Cursor's production harness ($1B ARR, 400M+ daily requests) independently validated 5 of our planned features (model-adaptive harness, dynamic context, P27 context anxiety, F1 self-evolving harness, P10 fuzzy edits) and revealed 4 critical gaps now incorporated: pre-verification isolation sandbox (P15b), positive agent loop hooks (P28), per-tool per-model error classification (P29), and subagent specialization routing (P25 evolved). First-principles lesson: pre-verification beats post-verification, Keep Rate > benchmark scores, error classification enables self-healing, positive loops as important as negative loops.

## [2026-05-01] research | Model-Specific Prompting Guides — Harness Redesign
- Rounds: 1 (direct fetch of official provider documentation)
- Sources fetched: 3 (OpenAI, Anthropic, Google Cloud official prompting guides)
- Pages created (sources): [[openai-prompt-guidance]], [[anthropic-prompt-best-practices]], [[gemini-3-prompting-guide]]
- Pages created (concepts): [[provider-native-prompting]]
- Pages created (synthesis): [[Research: Model-Specific Prompting Guides]]
- Pages rewritten: [[model-adaptive-harness]] (v2 redesign — retired "write once for strictest" principle), [[harness-configuration-layers]] (added Gemini column, provider-native dimensions, official sources)
- Pages updated: [[index]], [[log]]
- Key finding: Every major model provider now publishes OFFICIAL prompting guidance specific to their models. The current harness design ("write once for strictest, relax for forgiving") is WRONG according to official guidance. Each provider specifies fundamentally DIFFERENT prompting conventions — not just different strictness levels. OpenAI says constraints-first, Google says constraints-LAST. OpenAI (5.5+) says shorter outcome-first, the harness generates verbose constraint-heavy prompts. Anthropic mandates XML tags, Google uses plain text. The redesign: generate provider-native prompts from a semantic spec via pluggable renderers — never generate a single canonical prompt and relax it. New module: Prompt Renderer (Phase P22b).

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
- Pages created: [[consensus-records]] (consensus records directory with template)
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
