---
type: module
title: Harness Implementation Plan (Skill-First v2)
status: active
created: 2026-04-28
updated: 2026-05-03
tags: [harness, ultimate-pi, implementation, architecture, master-plan, skill-first, v2]
related:
  - "[[mvp-implementation-blueprint]]"
  - "[[skill-first-architecture]]"
  - "[[Research: Skill-First Harness Architecture]]"
  - "[[harness]]"
  - "[[agentic-harness]]"
  - "[[harness-h-formalism]]"
  - "[[model-adaptive-harness]]"
  - "[[feedforward-feedback-harness]]"
  - "[[drift-detection-unified]]"
  - "[[agent-skills-pattern]]"
  - "[[adr-011]]"
  - "[[consensus-debate]]"
  - "[[harness-engineering-first-principles]]"
sources:
  - "[[Source: SwirlAI Agent Skills Progressive Disclosure]]"
  - "[[Source: Claude API Agent Skills Overview]]"
  - "[[Source: Blake Crosley Agent Architecture Guide]]"
  - "[[meng2026-agent-harness-survey]]"
  - "[[anthropic2026-harness-design]]"
  - "[[bockeler2026-harness-engineering]]"
  - "[[forgecode-gpt5-agent-improvements]]"
  - "[[fan2025-imad]]"
  - "[[cursor-harness-april-2026]]"
  - "[[google-antigravity-official-blog]]"
  - "[[codex-open-source-agent-2026]]"
  - "[[claude-code-architecture-vila-lab-2026]]"
  - "[[codeact-apple-2024]]"
  - "[[fallow-rs-codebase-intelligence]]"
  - "[[sentrux-github-repo]]"
  - "[[sentrux-docs-quality-signal]]"
  - "[[sentrux-docs-root-cause-metrics]]"
  - "[[sentrux-docs-rules-engine]]"
  - "[[sentrux-docs-pro-architecture]]"
  - "[[Research: sentrux.dev]]"
---

# Harness Implementation Plan (Skill-First v2)

**Master plan** for the ultimate-pi agentic harness. Rethought May 2026 from first principles: harness layers are now **markdown-based skills** loaded via progressive disclosure. Only deterministic infrastructure — orchestrator extension, drift monitor, types, config — remains as TypeScript code. Consolidates all research from April-May 2026: Codex, Claude Code, Cursor, Antigravity, Fallow, WOZCODE, model-adaptive design, consensus debate, drift detection.

**2026-05-04 CORRECTION**: Pi v0.70.2 provides 30+ native event types via `ExtensionAPI.on()`. No custom event bus needed. The orchestrator listens to pi's native events directly and routes them through the skill pipeline. See [[adr-012]] and [[adr-026-one-thing]] for details.

## The Skill-First Principle

**The harness is not a code pipeline — it's a skill coordination layer.** Every pipeline layer that involves evaluation (spec quality, plan correctness, code review, observability) is implemented as a markdown skill. Only behaviors that require deterministic guarantees (event routing, pattern matching on every tool event) remain as code.

| Implementation | What | Why |
|---------------|------|-----|
| **Skill** (`.pi/skills/harness-*/SKILL.md`) | L1 Spec, L2 Plan, L4 Critic, P20 Gate, L5 Observe, L6 Memory | Probabilistic evaluation — LLM is better at this than imperative code |
| **Code** (`src/harness/*.ts`) | Drift Monitor, Types, Config | Deterministic execution — must fire on every event with zero exceptions |

See [[skill-first-architecture]] for full derivation and first principles.

## First Principles

All 19 original first principles remain valid. One new principle added:

**FP #20: The harness is a skill coordination layer, not a code pipeline.** Markdown-based skills loaded via progressive disclosure outperform TypeScript modules for harness logic. Skills are zero-compile, user-editable, context-efficient (three-tier loading), and portable across platforms. Code is reserved for deterministic infrastructure: drift monitoring. Event routing handled by pi's built-in event bus.

Original principles (condensed):
1. Harness — not model — determines reliability at scale.
2. Every pipeline layer reads wiki first, writes wiki after.
3. Write once for strictest model. Relax for forgiving models.
4. Three quality concerns, three timings: Syntax (inline), Semantics (L4), Style (P20).
5. Debate is selective, not always-on (iMAD, 92% savings).
6. Context drift is a positive feedback loop — detect, prune, restart.
7. Winning consensus MUST be filed in wiki — permanent alignment record.
8. Pre-verification beats post-verification (Shadow Workspace pattern).
9. Positive loops are as important as negative loops.
10. Keep Rate > benchmark scores.
11. Trust requires proof, not just criticism — artifacts + adversarial review.
12. Hooks determine correctness, not prompts (100% vs ~92% compliance).
13. Context is a managed resource, not a budget to minimize.
14. Safety is a subsystem, not an afterthought.
15. Single entry-point, additive configuration hierarchy.
16. Sandbox is foundation, permissions are policy.
17. Agent should be composable — consumer and provider of tools.
18. Implicit memory complements explicit memory.
19. Code is a better tool-calling interface than JSON (TS Execution Layer).

---

## Formal Model: H = (E, T, C, S, L, V)

From Meng et al. (2026). Our implementation now maps skills into the formal model:

| Component | Implementation (Skill-First) |
|-----------|------------------------------|
| **E** Execution Loop | Harness orchestrator listens to pi's 30+ native events → routes to L1-L4 skill sequence via `pi.sendMessage()`. Drift monitor (code) runs on every `tool_result`. |
| **T** Tool Registry | Tool schemas, MCP tools, skills as activation-scoped tools |
| **C** Context Manager | Progressive disclosure via skills (discovery → activation → execution). Wiki knowledge base. |
| **S** State Store | Wiki vault persistence. Pipeline state tracked by pi's native event bus in memory + persisted at compaction. |
| **L** Lifecycle Hooks | Orchestrator listens to pi's 30+ native events directly. Skills define their own hooks in frontmatter. |
| **V** Evaluation Interface | L4 adversarial (critic skill + agent). L5 observability (observe skill). |

---

## The 8-Layer Runtime Pipeline (Skill-First)

Every task flows through all layers. Skills activate in sequence via the harness orchestrator extension, which listens to pi's native events and injects steering prompts via `pi.sendMessage()`.

```
/ harness "task"
  ↓
L1: harness-spec skill       →  Hardens specification, resolves ambiguity
  ↓
L2: harness-plan skill       →  Generates YAML task DAG with sprint contracts
  ↓
L2.5: drift-monitor.ts code →  LLM-first drift detection every 8 turns (Haiku 4.5) + rule pre-filter
        + sentrux MCP        →  Structural health baseline via orchestrator session hooks. Catches architectural decay.
  ↓
L3: Agent Execution          →  Flat tools (P43 deferred). Drift monitor watches tool_result events.
      + sentrux MCP          →  Agent can scan() for structural awareness, check_rules() before commits.
  ↓
L4: harness-critic skill     →  Spawns critic agent via pi-subagents. iMAD gating. Consensus filing.
  ↓
P20: harness-gate skill      →  Deterministic: biome + tsc + fallow (dead code) + sentrux check (architecture). 0 LLM tokens.
  ↓
L5: harness-observe skill    →  Keep Rate tracking, LLM-as-Judge, Quality Signal trending via sentrux evolution.
  ↓
L6: harness-memory skill     →  Wiki read-first/write-after contract. Structural baselines via sentrux gate.
  ↓
L7: Schema Orchestration     →  Archon YAML workflow (already YAML-based, no code).
  ↓
L8: Wiki Query Interface     →  claude-obsidian skills (already skills-based).
```

---

## Build Phases — Implementation Method

Each phase now specifies its **implementation method**: SKILL or CODE.

### Foundation (Phase 0) — CODE

| Phase | What | Method | Files |
|-------|------|--------|-------|
| F0 | Types + Config | CODE | `src/harness/types.ts` |
| F0 | Harness orchestrator (listens to pi's 30+ native events, routes to skills) | CODE | `.pi/extensions/harness-orchestrator.ts` |
| F0 | Pipeline config | YAML | `harness.yaml` |
| F0 | Model profile system | CODE | `src/harness/profiles.ts` or config-driven |

### L1-L2: Pre-Execution — SKILLS

| Phase | What | Method | Files |
|-------|------|--------|-------|
| P1 | Spec Hardening | **SKILL** | `.pi/skills/harness-spec/SKILL.md`, `reference.md` |
| P2 | Structured Planning + Sprint Contracts | **SKILL** | `.pi/skills/harness-plan/SKILL.md`, `reference.md` |
| P2b | Pre-debate gating classifier (iMAD) | **SKILL** | Integrated into `harness-critic/SKILL.md` |

### L2.5: Runtime Drift Monitor — CODE

**Must be code.** Runs deterministically on every `tool_result` event. Skills are probabilistic — model decides when to activate them. Drift detection cannot be skipped.

| Phase | What | Method | Files |
|-------|------|--------|-------|
| P3 | LLM-based drift detection (primary) + rule pre-filter | CODE | `src/harness/drift-monitor.ts` |
| P4 | Context pruning + correction injection | CODE | `src/harness/drift-monitor.ts` |
| P5 | Escalation model (nudge → strong nudge → restart) | CODE | `src/harness/drift-monitor.ts` |
| P7 | Extension hooks for drift monitor + ck routing | CODE | `extensions/harness-drift-monitor.ts` (lightweight) |

Config: `.pi/harness/config.json` → `driftMonitor.*` keys.

### L3: Execution Layer — Mixed

| Phase | What | Method | Files |
|-------|------|--------|-------|
| P8 | Grounding Checkpoints | **SKILL** | Can be skill-based (instructions for when to re-ground) |
| P13 | Semantic Code Search (ck MCP) | Config | `.pi/mcp/ck-search.json` |
| P14 | Think-in-Code Enforcement | **SKILL** | `.pi/skills/think-in-code/SKILL.md` |
| P15 | Gitingest skill | **SKILL** | `.pi/skills/gitingest/SKILL.md` (already exists) |
| P43 | TS Execution Layer (deferred) | CODE | `lib/harness-ts-exec.ts` — this IS infrastructure |

### L4: Adversarial Verification — SKILL + AGENT

| Phase | What | Method | Files |
|-------|------|--------|-------|
| P16 | Critic with hard-threshold pass/fail | **SKILL** | `.pi/skills/harness-critic/SKILL.md`, `reference.md` |
| P16 | Critic agent definition | AGENT | `.pi/agents/critic.md` |
| P17 | Consensus Debate Transport | CODE | `lib/harness-messenger.ts` (pi-messenger stripped — minimal code) |
| P18 | Consensus Debate Protocol | **SKILL** | Integrated into `harness-critic/reference.md` |
| P19 | Debate integration (L1/L2/L4) | **SKILL** | `harness-critic/SKILL.md` contains debate trigger logic |
| P19b | Consensus-to-wiki filing | **SKILL** | `harness-critic/SKILL.md` includes filing instructions |

### L5-L8: Post-Verification — SKILLS

| Phase | What | Method | Files |
|-------|------|--------|-------|
| P20 | Final Lint + Format + Architecture Gate | **SKILL** + BASH | `.pi/skills/harness-gate/SKILL.md` — instructions; bash runs biome/tsc/fallow/sentrux |
| P21 | Automated Observability + Keep Rate | **SKILL** | `.pi/skills/harness-observe/SKILL.md` |
| P22 | Persistent Memory (wiki vault) | **SKILL** | `.pi/skills/harness-memory/SKILL.md` |
| P23 | Schema Orchestration (Archon DAG) | YAML | `.archon/workflows/*.yaml` (already YAML-based) |
| P24 | Wiki Query Interface | SKILL | Integrated via claude-obsidian skills (already skills-based) |

### Cross-Cutting — Mixed

| Phase | What | Method | Files |
|-------|------|--------|-------|
| P25 | Subagent Specialization Router | CODE | `lib/harness-router.ts` (routing logic is deterministic) |
| P27 | Context Anxiety Guard | **SKILL** | Can be skill-based with drift monitor integration |
| P28 | Positive Agent Loop Hooks | CODE | Extensions (hooks are deterministic) |
| P29 | Per-Tool Per-Model Error Classification | **SKILL** | `harness-observe/reference.md` (analysis is LLM evaluation) |
### P44: Structural Quality Gate — sentrux Integration (replaces Fallow)

sentrux fully replaces Fallow for all codebase intelligence functions. It provides everything Fallow did (dead code, duplication, complexity, boundaries) plus additional capabilities Fallow lacked: modularity analysis (Newman 2004), acyclicity detection (Tarjan's SCC), dependency depth (Lakos 1996), equality/god-file detection (Gini 1912), session baseline/diff, and MCP integration with 9 tools.

| Phase | What | Method | Files |
|-------|------|--------|-------|
| P44a | sentrux MCP tool registration (9 tools) | CONFIG | `.pi/mcp/sentrux.json` — scan, health, session_start/end, rescan, check_rules, evolution, dsm, test_gaps |
| P44b | Pre-verification structural gate (`sentrux check`) | BASH + SKILL | Invoked by harness-gate skill in P15b sandbox |
| P44c | CI structural pass/fail (`sentrux check .` exits 0/1) | BASH | `.github/workflows/quality.yml` |
| P44d | Quality Signal tracking in L5 observability | SKILL | `harness-observe/reference.md` — sentrux evolution for trending |
| P44e | Rules engine enforcement (`.sentrux/rules.toml`) | CONFIG | Project-root `.sentrux/rules.toml` — layers, boundaries, constraints |
| P44f | Structural baselines in L6 memory | BASH | `sentrux gate --save` before session, `sentrux gate .` after |
| P44g | Session structural diff (catch degradation) | MCP | `session_start()` / `session_end()` via MCP — integrated into L2.5 drift monitor |

### Future Phases — Method TBD

| Phase | What | Likely Method |
|-------|------|---------------|
| F1 | Harness Auto-Optimization | SKILL + CODE (meta-learning needs code substrate) |
| P30 | Browser Subagent | SKILL + BASH (`agent-browser` CLI — skill provides instructions) |
| P31 | Artifact Generation Layer | SKILL |
| P32 | Cross-Project Learning KB | SKILL + WIKI |
| P33 | Lifecycle Hook System | CODE (hooks are deterministic by definition) |
| P34 | Structured Compaction Pipeline | CODE (compaction logic is infrastructure) |
| P35 | Permission Subsystem | CODE (permission checks are deterministic gates) |
| P38-P42 | Sandbox, MCP Server, Skills Tooling, Implicit Memory, Automation | Mixed — skills for configuration, code for enforcement |

---

## Unified Token Budget

Per subtask. Skill activation costs comparable to code module loading but with progressive disclosure advantage.

| Layer / Phase | Tokens | Mechanism |
|---------------|--------|-----------|
| L1 Spec Hardening (skill) | ~2,500 | Skill activation ~2,000 + spec generation + Q&A |
| L2 Planning (skill) | ~4,500 | Skill activation + plan generation + sprint contracts |
| L2.5 Drift Monitor (code) | ~1,500-2,200 | Haiku 4.5 every 8 turns. Rule pre-filter: 0 tokens. sentrux session_start/end: 0 LLM tokens (MCP). |
| Pre-Verification Sandbox (P15b) | ~0-200 | Deterministic compile/lint/sentrux check. LLM tokens only on failure. |
| L4 Adversarial (skill + agent) | ~4,500 | Skill activation + critic sub-agent + selective debate |
| Phase 16 Lint+Format+Arch Gate | ~0 | Deterministic bash: biome + tsc + fallow + sentrux check. 0 LLM tokens. |
| L5 Observability (skill) | ~2,000 | Skill activation + metric analysis. sentrux evolution: 0 LLM tokens (MCP data). |
| L6 Memory Writes (skill) | ~1,000 | Skill activation + wiki interaction |
| Browser Subagent (P30) | ~0-500 | Deterministic screenshot + pixel diff |
| Artifact Generation (P31) | ~1,000 | Skill activation + artifact generation |
| L7+L8 Orchestration + Query | ~1,000 | Wiki bootstrapping amortized |
| **Total per subtask** | **~16,500-18,000** | sentrux MCP tools add 0 LLM tokens — they are deterministic structural computations. |

### Savings from Skill-First Architecture

| Mechanism | Savings |
|-----------|---------|
| Progressive skill loading | Code modules always in context (~15K tokens). Skills loaded only when phase active — discovery layer ~480 tokens total for all 6 harness skills. |
| Zero-compile iteration | No TypeScript compilation for harness logic changes. Edit markdown → agent picks up next activation. |
| User-editable harness | PMs/domain experts can edit SKILL.md without TypeScript knowledge. |
| Selective debate routing (iMAD) | 92% token savings on ~80% of debate-invoked tasks (unchanged) |
| AST truncation | 30-50% input tokens (unchanged) |
| Fuzzy edit matching | 5-15% retry round elimination (unchanged) |
| TS Execution Layer (P43, deferred) | 3-4x context reduction (unchanged) |
| sentrux MCP structural checks | 0 LLM tokens for architecture gate — deterministic Rust computation. Replaces ~500-1,000 tokens of LLM-based structural review that Fallow required for interpretation. |

---

## What Never Adapts (Cross-Model Invariants)

Same as v1. Pipeline phase ordering, quality standards, confidence labeling, budget constraints, verification requirements, read-first/write-after wiki contract, no-skip rule. The skill method doesn't change these — it changes HOW they're implemented (markdown vs TypeScript), not WHAT they enforce.

## What Adapts Per Model

Skills can specify model overrides in their frontmatter:

```yaml
---
name: harness-critic
model: opus  # Use Opus for adversarial review
---
```

Pi's built-in event bus can pass model directives when invoking skills. Provider-native prompt rendering (P22b) applies to skill bodies as well as system prompts — but skill bodies are user-editable markdown, giving teams the option to write model-specific instructions directly.

---

## Consensus Filing Contract

Unchanged from v1. Every debate verdict writes to `wiki/consensus/`. The harness-critic skill includes consensus filing instructions. L7 enforcement unchanged.

## New Tools Integrated

| Tool | Phase | Integration |
|------|-------|-------------|
| **Markdown skills** (Anthropic open standard) | All layers | `.pi/skills/harness-*/SKILL.md` — progressive disclosure, zero-compile |
| **ck** (semantic code search) | P13 | MCP server |
| **Gitingest** (bulk ingestion) | P15 | Skill |
| **pi-messenger** (stripped) | P17 | Code (transport layer — deterministic) |
| **agent-browser** (Vercel Labs) | P30 | Bash CLI — invoked by skill |
| **sentrux** (structural quality gate) | P44 | MCP + Bash + Config — replaces Fallow. 9 MCP tools, rules engine, session diff. |
| **Fallow** (dead code detection) | P20 gate | Bash — retained for dead code only (sentrux covers architecture). Complementary, not replaced. |

---

## Research Validation Summary

All research from April-May 2026 remains valid. The skill-first architecture is independently validated by:

- **sentrux — Structural Feedback Loop** (Mar 2026): Validates FP #2 (every pipeline layer reads wiki first), FP #4 (three quality concerns at three timings), and FP #7 (winning consensus filed). The Quality Signal (0-10,000) provides a single continuous metric for architectural health that maps directly to L5 observability and L2.5 structural drift monitoring. The MCP integration (9 tools) provides the actuator side of the cybernetic feedback loop — agents can scan, baseline, and detect degradation autonomously. (Source: [[Research: sentrux.dev]])
- **Anthropic Agent Skills** (Dec 2025): Three-tier progressive disclosure proven at scale. Within weeks, OpenAI, Google, GitHub, Cursor adopted the open standard. (Source: [[Source: SwirlAI Agent Skills Progressive Disclosure]])
- **Blake Crosley Harness Pattern** (Apr 2026): "The harness is a programmable runtime with an LLM kernel." 84 hooks, 48 skills production system. "Hooks guarantee execution; prompts do not." (Source: [[Source: Blake Crosley Agent Architecture Guide]])
- **Claude Code Architecture** (Mar-May 2026): Skills + hooks + subagents + memory as the four extension primitives. (Source: [[Source: Claude API Agent Skills Overview]])
- **Cursor Harness Evolution** (Apr 2026): Dynamic context, Keep Rate, per-model error classification. Skills are their "Rules/Skills system" — markdown-based progressive disclosure.
- **Codex Open-Source** (2026): `agentskills.io` standard. Skills ecosystem tooling. Progressive disclosure with scoped discovery.
- **Google Antigravity** (2025-2026): SKILL.md progressive disclosure pattern. "The same pattern, different implementation."

**The convergence is clear**: every major agent platform independently arrived at markdown-based skills with progressive disclosure as the right primitive for agent behavior. The harness implementation plan now aligns with this industry convergence.

---

## Key Architecture Decisions

| ADR | Decision | Skill-First Impact |
|-----|----------|-------------------|
| **ADR-012** | Extension-based harness orchestrator | Orchestrator is the ONLY extension. Listens to pi's 30+ native events directly. Invokes skills via `pi.sendMessage()`. |
| **ADR-015** | Pipeline-first build order | Unchanged. Skills deliver same pipeline in same order. |
| **ADR-017** | `~~src/harness/~~` library + thin wiring. Superseded. | Now truly thin: 3 files vs 15. Logic extracted to skills. Event bus removed. |
| **ADR-021** | Explicit `/harness` command | Pi's native event bus detects command → activates harness-spec skill. |
| **ADR-018** | Single config file | Unchanged. |
| **ADR-019** | `harness_ask` tool | Invoked by harness-spec skill, not code. |
| **ADR-020** | YAML task DAG | Generated by harness-plan skill, not code. |
| **ADR-022** | 7 drift patterns | In drift-monitor.ts (code — deterministic). |
| **ADR-025** | GitHub Issues spec storage | Used by harness-spec skill. |
| **ADR-013** | Biome + tsc + fallow + sentrux gate | Invoked by harness-gate skill (bash). sentrux adds architectural enforcement: cycles, modularity, depth, equality, redundancy. |
| **ADR-016** | pi-subagents for L4 critic | Invoked by harness-critic skill. |

---

See [[mvp-implementation-blueprint]] for the detailed file structure, type definitions, skill bodies, and build order. See [[skill-first-architecture]] for the first-principles derivation and architecture diagram.
