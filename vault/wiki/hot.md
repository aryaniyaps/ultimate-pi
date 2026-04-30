---
type: meta
title: "Hot Cache"
updated: 2026-04-30T13:30:00
created: 2026-04-30
tags: []
---

# Recent Context

## Last Updated
2026-04-30. Meta-agent context drift detection research. Novel synthesis: detect stuck → prune context → restart agent.

## Meta-Agent Context Drift Detection (2026-04-30)

**Verdict**: The meta-agent concept is a NOVEL SYNTHESIS. Each component exists independently; no system combines detection + pruning + restart.

### What the User Proposed
A meta-agent that monitors the primary coding agent for context drift — repeated incorrect tool calls, excessive ls/find commands — and when stuckness is detected, prunes irrelevant tool calls from context and restarts the agent with clean context.

### Key Finding: Novel Composition, Not Novel Components
| Component | Existing Implementation | Status |
|-----------|----------------------|--------|
| Stuck-pattern detection | ironclaw DriftMonitor (5 rule-based patterns) | Production-ready |
| Loop detection | LangSight (argument hashing, 90%+ catch rate) | Production |
| Context pruning | SWE-Pruner (23-54% token reduction) | Academic (ACL 2026) |
| Guardian/meta-agent | Vectara Guardian Agents, GuardAgent paper | Active research |
| **Detect → Prune → Restart pipeline** | **None exists** | **GAP — this is the novelty** |

### Closest Prior Art: ironclaw DriftMonitor
nearai/ironclaw #1634 (March 2026) implements detection + system-message injection. 5 rules: repetition (3+ identical calls), failure spiral (4+ errors), tool cycling (A-B-A-B), silence drift (15+ iters), rework churn (3+ file writes). Does NOT prune context — only injects corrections.

### First Principles Assessment
- **Feasibility**: High. Detection is O(1) per call (hash comparison). Pruning is metadata operation. Restart is standard pattern.
- **Overhead**: ~1,500-3,000 tokens per 50-step session (LLM-based detection). Rule-based detection costs 0 tokens.
- **Net savings**: 5-10x token reduction for stuck sessions. Breakeven after 1-2 interventions.
- **Risk**: Conservative pruning essential — removing useful context is worse than keeping noise.

### Academic Foundation
Agent Drift paper (arxiv 2601.04170, Rath 2026): 42% task success reduction from drift. ASI framework across 12 dimensions in 4 categories. Drift emerges after median 73 interactions. Combined mitigation achieves 81.5% reduction (EMC + DAR + ABA).

### Harness Integration: Layer 2.5 — Runtime Drift Monitor
```
L2 (Plan) → L2.5 (Drift Monitor) → L3 (Execute + Grounding)
                ↑                          ↓
                └── injects corrections ───┘
```
- `lib/harness-drift-monitor.ts` — Detection engine, pruning logic, correction injection
- `extensions/harness-drift-monitor.ts` — Hooks into before_llm_call / after_tool_call
- `.pi/harness/drift-monitor.json` — Config: thresholds, escalation levels, whitelists
- Model-adaptive: Rule-based every step (GPT), every 10 steps (Gemini), LLM-based every 15 steps (Opus)

### Escalation Model
1. **Soft nudge**: System message — "You're stuck. Try different approach."
2. **Strong nudge**: System message + context summary
3. **Forced restart**: Terminate, prune history, restart with clean context

### Open Questions
- Can pruning be done in-place (API-supported) or always needs session restart?
- Does pruning break chain-of-thought coherence mid-reasoning?
- How does pruning interact with prompt caching?
- Can Haiku/Flash serve as meta-agent detector (near-zero overhead)?

### Sources
- [[ironclaw-drift-monitor]] (nearai/ironclaw #1634, March 2026)
- [[langsight-loop-detection]] (LangSight Engineering, March 2026)
- [[agent-drift-academic-paper]] (Rath, January 2026)
- [[vectara-guardian-agents]] (Vectara, November 2025)

---

## Model-Adaptive Agent Harness (2026-04-30)

**Verdict**: Redesigned autoresearch harness from fixed script → four-layer model-adaptive system.

### Source
Forge Code reached 81.8% on TermBench 2.0 with both GPT 5.4 and Opus 4.6 — but only after adapting their harness to each model's specific failure modes. The models didn't change. The harness did. https://forgecode.dev/blog/gpt-5-4-agent-improvements/

### Four-Layer Harness Model
```
L4 COMPLETION — "YOU ARE DONE WHEN" + post-file self-check
L3 CHANNEL    — Truncation: in-band warning text (gpt) vs metadata (opus)
L2 GATES      — Round-completion + Pre-File Verification (hard gates for gpt, soft for opus)
L1 SIGNAL     — Flat structure, constraints-first, explicit markers, atomic instructions
```

### Key Finding: Models Fail Differently
| Behavior | Opus/Claude | GPT |
|---|---|---|
| Structure | Tolerates nesting, natural flow | Needs flat, constraints-first |
| Truncation | Infers from metadata | Needs body-text warning |
| Verification | Naturally double-checks | Must be ENFORCED (hard gate) |
| Completion | Self-aware of gaps | Stops after plausible-but-incomplete |
| Emphasis | Contextual cues work | Explicit markers (REQUIRED, MANDATORY) |

### Design Principle
**Write once for strict (GPT-safe). Relax for forgiving models.** Never write for forgiving and hope strict models cope.

### Applied to Autoresearch Skill
- **L1**: Skill rewritten in strict mode — H3 max nesting, REQUIRED blocks first, atomic instructions
- **L2**: Round-completion gate (3 questions, hard). Pre-File Verification gate (10-item checklist, NO OPT-OUT for gpt)
- **L3**: Explicit truncation warning rule. Explicit progress counters (N/3 rounds, N/5 sources)
- **L4**: "YOU ARE DONE WHEN" + post-file self-check (3 verification items, hard gate)
- **Opus relaxations**: Annotated throughout skill. Narrative self-assessment instead of checklists. Metadata inference for truncation.

### Configuration Files
- `references/harness-config.md` — Full four-layer dimension specification (15 dimensions across 4 layers)
- `references/model-profiles.md` — Concrete profiles: opus, gpt, gemini, strict with per-dimension values
- `program.md` — Updated with `model_profile: auto | opus | gpt | gemini | strict`
- `SKILL.md` — Rewritten as strict-mode canonical template with opus relaxation annotations

### Open Questions
- Runtime model detection for `auto` profile?
- Per-step vs per-round gate granularity for gpt?
- Extract four-layer harness as cross-skill framework?
- Validate gemini profile against actual trajectories?

---

**Verdict**: Split Phase 12. Inline = syntax only (compilers/parsers). Lint + format = final gate (Phase 16, post-L4).

### First Principles
- Three distinct quality concerns: syntax (does it parse?), semantics (is it correct?), style (is it clean?)
- Each has different timing requirements. Bundling them wastes tokens and breaks tool contracts.
- **Syntax belongs inline** (Phase 12): broken code blocks all progress. Catch at tool layer, save round-trips.
- **Semantics belongs in L4**: adversarial verification needs full context, spec comparison, LLM reasoning.
- **Lint + format belongs at the end** (Phase 16, new): lint is noisy on in-progress code. Formatting modifies whitespace → breaks edit tool `oldText` exact matching. Both waste agent tokens on cosmetic decisions invalidated by next edit.

### New Phase 16: Final Lint + Format Gate
- **Position**: L3 (edits + inline syntax checks) → L4 (adversarial verification) → **Phase 16 (lint + format)** → L5 (observability)
- **Ordering**: Lint → auto-fix lint → format → verify format didn't introduce violations → verdict
- **Verdicts**: PASS (zero violations), PASS_WITH_WARNINGS (non-auto-fixable warnings), FAIL (errors needing manual fix, max 1 retry)
- **Tooling**: eslint/ruff/clippy (lint + auto-fix), prettier/biome/rustfmt (format auto-apply)
- **Token cost**: Near-zero (deterministic tooling). Time: <10s for typical projects.
- **Files**: `lib/harness-polish.ts`, `extensions/harness-polish.ts`

### Phase 12 Renamed: Inline Syntax Validation
- **Was**: "Inline Post-Edit Validation" with compilers + linters + formatters
- **Now**: Syntax only — `tsc --noEmit`, `JSON.parse`, `yaml.parse`, SQL parser
- **Gate rule**: Must complete in <2s. Full-project tsc, ESLint with plugins, prettier excluded.
- **Linting/formatting removed from inline validators table** in [[inline-post-edit-validation]]

### Why Not Inline
- Formatting modifies every line → edit tool's `oldText` won't match on next edit → guaranteed failure
- Linting on half-written code produces noise (unused imports, missing types), not signal
- Agent context-switches to fix style when code might be rewritten next edit
- Human analogy: spell-checker autocorrecting while you're still drafting

### Pipeline Order
```
L1(Spec) → L2(Plan) → L3(Edit+Syntax) → L4(Verify) → [Phase 16: Lint+Format] → L5(Observe) → L6(Memory) → L7(Orch) → L8(Query)
```

---

## Consensus Debate: Multi-Agent Argument for Harness (2026-04-30)

**Verdict**: Adopt. pi-messenger transport (stripped) + consensus protocol layer.

### First Principles
- Best human software decisions come from back-and-forth arguing (dialectic: thesis → antithesis → synthesis)
- Applies even more to agents: multi-round argument substitutes for intuition that agents lack
- Single-pass review (current L4) misses structural/philosophical flaws that only emerge in rebuttal
- Agents cannot "sense" something is wrong — debate rounds force deeper reasoning

### pi-messenger Analysis
- **532 ⭐**, npm package. Multi-agent communication via file system. No daemon, no server.
- **Core mechanism**: Agent registry (`.pi/messenger/registry/*.json`) + per-agent inbox directories + `fs.watch` delivery
- **What we adopt**: Registry, inbox messaging, `fs.watch`, atomic file writes, stale cleanup, name generation
- **What we strip**: Chat overlay UI, status bar indicators, activity feed, emoji statuses, crew orchestration (L7 handles this), swarm claims, human-as-participant
- **Why file-based**: Zero infrastructure, process isolation via filesystem, crash-safe (messages persist), observable (transcripts are files)

### Consensus Protocol Design
- **DebateSession**: N agents, M rounds, defined topic. Turn-based (attacker → defender per round).
- **ConsensusBudget**: Max rounds, max tokens/round, max wall-clock, convergence rounds
- **Verdicts**: CONSENSUS_REACHED, DEADLOCK, BUDGET_EXHAUSTED, TIMEOUT
- **Convergence detection**: Position hash stability across K consecutive rounds OR explicit "no further objections" signal

### Integration Points
- **L1 (Spec Hardening)**: Spec proposer vs Spec critic. 3 rounds, ~6K tokens. "Is the spec complete?"
- **L2 (Planning)**: Planner vs Plan critic. 3 rounds, ~10K tokens. "Is the plan executable and non-circular?"
- **L4 (Adversarial)**: Defender vs Attacker. 4 rounds, ~8K tokens. Multi-round attack replacing single-pass critic.

### Token Budget
- Adds ~13,000 tokens per subtask (~4K L1, ~5K L2, ~4K L4)
- Self-funding: catching one spec flaw at L1 saves entire downstream L2-L8 cost (~15,500 tokens)
- New total per subtask: ~30,500-33,500 tokens

### Implementation (Phases 14-15)
- Phase 14: Install pi-messenger, build transport layer (`lib/harness-messenger.ts`), `DebateSession` class, consensus schemas, convergence detection
- Phase 15: ConsensusBudget enforcement, verdict generation, debate→wiki transcript, L1/L2/L4 integration

### Architecture
```
Harness L1/L2/L4 → Consensus Protocol Layer → pi-messenger Transport → Filesystem
```
- Consensus protocol: DebateSession, Budget, Turns, Convergence, Verdicts
- pi-messenger transport: Registry, Inboxes, fs.watch, Atomic writes
- File-based: `.pi/messenger/registry/`, `.pi/messenger/inbox/<agent>/`, `.pi/messenger/debates/<id>/`

### Key Decisions
- [[adr-011]]: Full decision record
- [[consensus-debate]]: Protocol design and first-principles analysis
- [[pi-messenger-analysis]]: Component-by-component adopt/strip breakdown

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
- **Harness Phase 12**: Inline syntax validation (compilers/parsers only — NO linters, NO formatters)
- **Harness Phase 16 (NEW)**: Final lint + format gate — runs once after L4, before L5
- **Harness Phase 13**: Haiku model router — new ModelRouter component, woz:explore subagent
- **Revised token budget**: ~17,500 → ~12,500-15,000 tokens per subtask (15-30% overhead reduction)
- **Open questions**: AST truncation on dynamic languages, fuzzy matching false-positive rate, Haiku hallucination risk in summaries

## Previous Context (Agent-First Codebase Exploration)
- Agent-Codebase Interface (ACI): Humans use projects; agents map them.
- Progressive Disclosure (L0-L3): Project map → symbol map → file context → deep context
- Repo Map Ranking: Graph centrality beats git-log churn for identifying important code
- 3 agent-superior capabilities: Symbol ingestion, cross-reference tracking, multi-file correlation
- 3 agent-weak areas: No visual patterns, fixed context windows, no cross-session learning without persistent memory
