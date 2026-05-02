---
type: module
title: Harness Implementation Plan
status: active
created: 2026-04-28
updated: 2026-05-02
tags: [harness, ultimate-pi, implementation, architecture, master-plan]
sources:
  - "[[meng2026-agent-harness-survey]]"
  - "[[anthropic2026-harness-design]]"
  - "[[bockeler2026-harness-engineering]]"
  - "[[forgecode-gpt5-agent-improvements]]"
  - "[[wozcode]]"
  - "[[fan2025-imad]]"
  - "[[ironclaw-drift-monitor]]"
  - "[[cursor-harness-april-2026]]"
  - "[[cursor-shadow-workspace-2024]]"
  - "[[cursor-agent-best-practices-2026]]"
  - "[[cursor-shipped-coding-agent-2026]]"
  - "[[cursor-instant-apply-2024]]"
  - "[[google-antigravity-official-blog]]"
  - "[[google-antigravity-wikipedia]]"
  - "[[cursor-vs-antigravity-2026]]"
  - "[[fallow-rs-codebase-intelligence]]"
  - "[[Source: Vercel Labs agent-browser]]"
related:
  - "[[harness]]"
  - "[[agentic-harness]]"
  - "[[harness-h-formalism]]"
  - "[[model-adaptive-harness]]"
  - "[[feedforward-feedback-harness]]"
  - "[[drift-detection-unified]]"
  - "[[adr-011]]"
  - "[[consensus-debate]]"
  - "[[cursor-harness-innovations]]"
  - "[[codex-harness-innovations]]"
  - "[[Research: cursor.sh Harness Innovations]]"
  - "[[Research: executor.sh Harness Integration]]"
  - "[[Research: Google Antigravity Harness Integration]]"
  - "[[Research: Codex State-of-the-Art Harness Improvements]]"
  - "[[antigravity-agent-first-architecture]]"
  - "[[agent-artifacts-verifiable-deliverables]]"
  - "[[browser-subagent-visual-verification]]"
  - "[[agent-browser-browser-automation]]"
  - "[[Research: Claude Code State-of-the-Art Harness Improvements]]"
  - "[[lifecycle-hooks]]"
  - "[[structured-compaction]]"
  - "[[subagent-worktree-isolation]]"
  - "[[fallow-rs-codebase-intelligence]]"
  - "[[codebase-intelligence-harness-integration]]"
  - "[[codebase-intelligence-ecosystem-comparison]]"
  - "[[Research: Fallow Codebase Intelligence Harness Integration]]"
sources:
  - "[[codex-open-source-agent-2026]]"
  - "[[claude-code-architecture-vila-lab-2026]]"
  - "[[claude-code-architecture-qubytes-2026]]"
  - "[[claude-code-architecture-karaxai-2026]]"
  - "[[claude-code-security-architecture-penligent-2026]]"
  - "[[codeact-apple-2024]]"
  - "[[cloudflare-codemode]]"
  - "[[executor-rhyssullivan]]"
  - "[[fallow-rs-codebase-intelligence]]"
---

# Harness Implementation Plan

**Master plan** for the ultimate-pi agentic harness. Consolidates all research from April-May 2026 — Codex open-source architecture (OpenAI, 79.2K GitHub stars), Claude Code architecture (VILA-Lab, Qubytes, KaraxAI, Penligent), Cursor.sh harness innovations, Google Antigravity agent-first architecture, Fallow codebase intelligence (1.7K stars, MIT), WOZCODE token reduction, model-adaptive harness design, semantic code search, consensus debate, meta-agent drift detection, and latest academic papers (Meng, Anthropic, Böckeler, Forge Code, iMAD). This is the single authoritative source for harness architecture, build phases, and token budgets.

## First Principles

1. **The harness — not the model — determines reliability at scale.** (Meng et al. 2026, 110+ papers, 23 systems). Models reach the same capability ceiling only after harness adaptation (Forge Code: GPT 5.4 and Opus 4.6 both hit 81.8% on TermBench 2.0).
2. **Every pipeline layer reads wiki first, writes wiki after.** Enforcement at L7 extension hooks. [[adr-010]].
3. **Write once for strictest model (GPT-safe). Relax for forgiving models.** [[model-adaptive-harness]].
4. **Three quality concerns, three timings:** Syntax (inline, blocks progress), Semantics (L4, needs LLM), Style (Phase 16 final gate, deterministic tools).
5. **Debate is selective, not always-on.** Pre-debate gating classifier saves 92% tokens (iMAD, AAAI 2026). [[selective-debate-routing]].
6. **Context drift is a positive feedback loop.** Each failed attempt accelerates failure. Meta-agent detection + pruning + restart breaks the loop. [[drift-detection-unified]].
7. **Winning consensus from any agent debate MUST be filed in the project wiki.** Permanent alignment record prevents future agents from re-litigating settled debates. Filed to `wiki/consensus/`. Enforced by L7 write-after contract. [[consensus-debate]].
8. **Pre-verification beats post-verification.** Validate code in isolation before the calling agent sees failures. Cursor's Shadow Workspace validates this principle at $1B ARR scale. [[cursor-shadow-workspace-2024]].
9. **Positive loops are as important as negative loops.** Drift detection stops bad behavior. Agent hooks that keep the agent running until done (Cursor pattern) are the positive counterpart. [[cursor-agent-best-practices-2026]].
10. **Keep Rate > benchmark scores.** The fraction of agent-generated code still in the codebase after time intervals is the ultimate quality metric. Cursor's Keep Rate metric. [[cursor-harness-april-2026]].
11. **Trust requires proof, not just criticism.** L4 adversarial verification catches what's wrong. Artifacts prove what's right. Both are mandatory. Antigravity's Artifact system validates this dual-verification model. [[agent-artifacts-verifiable-deliverables]].
12. **Hooks determine correctness, not prompts.** CLAUDE.md-style rules achieve ~92% compliance. Lifecycle hooks with deterministic exit-code semantics achieve 100% for matched conditions. If a rule must never be broken, use a hook. If it should usually be followed, use prompts. Validated by Claude Code's hook architecture. [[claude-code-architecture-karaxai-2026]], [[lifecycle-hooks]].
13. **Context is a managed resource, not a budget to minimize.** Claude Code's five-layer compaction pipeline treats context as something to be structured, summarized, and selectively reconstructed — not just trimmed. A forked subagent produces a ~6,500 token structured summary tuned for software engineering, achieving ~85% payload reduction while preserving file paths, code snippets, error histories, and plan state. [[claude-code-architecture-qubytes-2026]], [[structured-compaction]].
14. **Safety is a subsystem, not an afterthought.** Permission checking must sit between the agent loop and tool execution as an architecturally separate layer. Claude Code's 7-mode permission system with ML-based auto-classifier validates this principle at production scale. [[claude-code-security-architecture-penligent-2026]].
15. **Single entry-point, additive configuration hierarchy.** CLAUDE.md's layered approach (Global → Enterprise → Project → Local → Notebook) gives the agent a coherent view of rules. Conditional YAML frontmatter achieves 96% compliance with 150 lines split across 5 files, vs 92% from a single 150-line file. Our distributed wiki pages lack this coherence guarantee. [[claude-code-architecture-karaxai-2026]].
16. **Sandbox is foundation, permissions are policy — not the reverse.** OS-level enforcement (Seatbelt, bubblewrap) creates technical boundaries that cannot be bypassed. Permissions and approvals are a user-facing layer on top. Codex's three-tier sandbox (read-only → workspace-write → danger-full-access) validates this separation. [[codex-open-source-agent-2026]].
17. **The agent should be composable — both consumer and provider of tools.** MCP server mode enables harness pipeline stages to be invoked by external agents. This turns the harness from a closed pipeline into a composable service. Validated by Codex's bidirectional MCP. [[codex-open-source-agent-2026]].
18. **Implicit memory complements explicit memory — not replaces it.** Automatic, screen-capture-based context (Chronicle) fills the gap between explicit wiki documentation and complete amnesia. The harness should capture what the user was doing, not just what they documented. [[codex-open-source-agent-2026]].
19. **Code is a better tool-calling interface than JSON.** LLMs have seen millions of lines of code in pretraining but only contrived tool-calling examples. A single "write TypeScript" tool + sandboxed runtime achieves 3-4x context reduction and ~20% higher success rate on multi-tool tasks vs flat tool calling. Validated by Apple's CodeAct (ICML 2024), Cloudflare Code Mode, and Executor. [[codeact-apple-2024]], [[cloudflare-codemode]], [[executor-rhyssullivan]].

---

## Formal Model: H = (E, T, C, S, L, V)

From Meng et al. (2026) survey of 110+ papers. Our harness maps as:

| Component | Our Implementation |
|-----------|-------------------|
| **E** Execution Loop | L1-L4 pipeline (Spec → Plan → Execute → Verify) |
| **T** Tool Registry | Tool schemas, MCP tools (lean-ctx 48 tools, ck semantic search, Gitingest), skills |
| **C** Context Manager | Wiki knowledge base, AST truncation (Phase 10), lean-ctx compression, think-in-code enforcement |
| **S** State Store | Wiki vault persistence, ctx_session cross-session memory, hot.md cache |
| **L** Lifecycle Hooks | L7 Archon orchestration, post-edit validation hooks, drift monitor hooks |
| **V** Evaluation Interface | L4 adversarial verification, L5 observability, terminal-bench evaluation |

Gaps to close: explicit lifecycle hook contracts, systematic action trajectory tracking, cross-harness portability testing, pre-verification isolation sandbox, Keep Rate quality metrics, per-tool per-model error classification, positive agent loop hooks, structured compaction pipeline, tool-level lifecycle hooks with exit-code semantics, permission subsystem, subagent worktree isolation, checkpoint/restore system, CLAUDE.md-style additive configuration hierarchy.

---

## Feedforward-Feedback Control Framework

From Böckeler (2026, Martin Fowler). Cross-reference audit of our pipeline:

| Control Type | Our Implementation |
|-------------|-------------------|
| **Feedforward-Computational** | Tool schemas, `tsc --noEmit`, JSON schema validation, structured output contracts |
| **Feedforward-Inferential** | SKILL.md files, ADRs, wiki pages, AGENTS.md, model profiles |
| **Feedback-Computational** | Inline syntax validation (Phase 12), final lint+format gate (Phase 16), ck semantic grep |
| **Feedback-Inferential** | L4 adversarial verification, L2 plan review, L1 spec debate, meta-agent drift monitor |

Unsolved: Behaviour Harness (functional correctness verification). Current approach (AI-generated tests + manual testing) is insufficient. Future Phase 18.

---

## The 8-Layer Runtime Pipeline

Every task flows through all layers. No skip rule. Verification is mandatory.

```
L1: Spec Hardening        → L2: Structured Planning   → L2.5: Runtime Drift Monitor
  ↓                                                         ↓
L3: Grounding Checkpoints → L4: Adversarial Verification → Phase 16: Lint+Format Gate
  ↓
L5: Automated Observability → L6: Persistent Memory → L7: Schema Orchestration → L8: Wiki Query
```

| # | Layer | Module | Purpose |
|---|-------|--------|---------|
| 1 | Spec Hardening | [[spec-hardening]] | Block execution until ambiguities resolved |
| 2 | Structured Planning | [[structured-planning]] | Machine-readable task DAG before code. Sprint contracts (agree "done" before L3) |
| 2.5 | Runtime Drift Monitor | [[drift-detection-unified]] | LLM-first (Haiku/mini) semantic drift detection + rule-based pre-filter. Structured drift context. Detect stuck patterns + semantic drift, prune, restart. |
| 3 | Grounding Checkpoints | [[grounding-checkpoints]] | Smallest verifiable change + spec-drift detection |
| 4 | Adversarial Verification | [[adversarial-verification]] | Critic agents attack, not review. Multi-round debate (selective routing). Hard-threshold pass/fail criteria. |
| 5 | Automated Observability | [[automated-observability]] | Instrumentation is definition-of-done |
| 6 | Persistent Memory | [[persistent-memory]] | claude-obsidian wiki as knowledge base |
| 7 | Schema Orchestration | [[schema-orchestration]] | Archon workflow DAG orchestrates all layers. Enforces read-first/write-after contract. |
| 8 | Wiki Query Interface | [[wiki-query-interface]] | LLM-native search via claude-obsidian skills |

---

## Build Phases

Organized by pipeline position, not sequential numbering. Each phase maps to a specific layer or cross-cutting concern.

### Foundation (Phase 0)

| Phase | What | Files |
|-------|------|-------|
| F0 | Foundation schemas + config | `lib/harness-schemas.ts`, `lib/harness-config.ts`, `.pi/harness.example.json` |
| F0 | H=(E,T,C,S,L,V) formal mapping to docs | Update harness docs |
| F0 | Model profile system (opus/gpt/gemini/strict) | `lib/harness-profiles.ts` |

### L1-L2: Pre-Execution

| Phase | What | Layer | Files |
|-------|------|-------|-------|
| P1 | Spec Hardening | L1 | `lib/harness-spec.ts`, `extensions/harness-spec.ts` |
| P2 | Structured Planning + Sprint Contracts | L2 | `lib/harness-planner.ts`, `extensions/harness-planner.ts` |
| P2b | Pre-debate gating classifier (selective routing per iMAD) | L1/L2/L4 | `lib/harness-debate-gate.ts` |

### L2.5: Runtime Drift Monitor (LLM-First v2)

**Rethought May 2026 from first principles**. Primary detection is now LLM-based with structured drift context, using a very cheap model (Haiku 4.5). Rule-based (6 patterns) becomes the cost-saving pre-filter and fallback. See [[drift-detection-unified]] for full reasoning.

| Phase | What | Layer | Files |
|-------|------|-------|-------|
| P3 | **LLM-based drift detection (primary)** + rule-based pre-filter (fallback). Structured drift context: task, subtask, last 12 tool calls summary, files modified, errors, turn count. Sent to Haiku 4.5 every 8 turns (~700 tokens/check). Returns JSON: `{drifted, pattern, confidence, action}`. Catches SEMANTIC drift that rule-based cannot. | L2.5 | `lib/harness-drift-monitor.ts` |
| P4 | Context pruning + correction injection (triggered by LLM verdict or rule-based fast-path) | L2.5 | `lib/harness-drift-monitor.ts` |
| P5 | Escalation model (soft nudge → strong nudge → forced restart), action derived from LLM verdict | L2.5 | `lib/harness-drift-monitor.ts` |
| P6 | DriftMonitor config: LLM model selection (default Haiku 4.5), check frequency (default 8 turns), drift context template, rule-based pre-filter thresholds | L2.5 | `.pi/harness/drift-monitor.json` |
| P7 | Extension hooks (before_llm_call / after_tool_call) + ck search routing (deterministic pattern: grep/find with ≥3 words → ck_search) | L2.5 | `extensions/harness-drift-monitor.ts` |

### L3: Execution Layer (with Tool Enhancements)

| Phase | What | Layer | Files |
|-------|------|-------|-------|
| P8 | Grounding Checkpoints (MVC execution, spec-drift detection) | L3 | `lib/harness-executor.ts`, `extensions/harness-executor.ts` |
| P9 | AST Truncation & Ranked Reading (WOZCODE-inspired) | L3 tools | `lib/harness-ast.ts`, `lib/harness-search.ts` |
| P10 | Fuzzy Edit Matching (tolerate whitespace/indentation drift) + full-file rewrite accept mode (Cursor-inspired) | L3 tools | `lib/harness-edit.ts` |
| P11 | Inline Syntax Validation — compilers/parsers only, <2s | L3 tools | `lib/harness-validate.ts`, `lib/harness-sql-fix.ts` |
| P12 | Post-edit validation hook (integrate into L3 executor) | L3 | Update `lib/harness-executor.ts` |
| P13 | Semantic Code Search — ck MCP integration, 3-layer enforcement | L3 tools | `.pi/mcp/ck-search.json`, update AGENTS.md |
| P14 | Think-in-Code Enforcement — system prompt + ctx_execute sandbox | L3 tools | Update AGENTS.md, `.pi/settings.json` |
| P15 | Gitingest skill — bulk external repo ingestion | L3 tools | `.pi/skills/gitingest/SKILL.md` |
| P15b | Pre-Verification Isolation Sandbox — isolated temp workspace for compile/lint before presenting results. Cursor Shadow Workspace pattern adapted for CLI harness. | L3→L4 gate | `lib/harness-preverify.ts`, `extensions/harness-preverify.ts` |
| P43 | **TypeScript Execution Layer** — single `write_ts` tool replaces flat tool list. All L3 tools (read, bash, edit, grep, find, ck_search, ctx_execute) exposed as typed TS API via auto-generated type defs. Agent writes TypeScript code; runtime executes in sandboxed Node.js VM or Deno subprocess. Tool calls dispatch via typed RPC back to harness. Permission subsystem (P35) gates all tool calls within sandbox. Extends P14 (Think-in-Code) from data analysis to full tool orchestration. 3-4x context reduction on multi-tool workflows. Validated by CodeAct (+20% success, ICML 2024), Cloudflare Code Mode, Executor (1.3K stars). See [[Research: executor.sh Harness Integration]] for updated sub-phases. | L3 tools | `lib/harness-ts-exec.ts`, `lib/harness-ts-types.ts`, `extensions/harness-ts-exec.ts`, `.pi/harness/ts-exec.json` |
| P43b | **Tool Catalog with Intent-Based Discovery** — `tools.discover({ query, limit })` runtime API for agents to search tools by intent without loading all schemas into context. Catalog indexes all harness-native L3 tools by name, description, tags, and parameter schemas. Inspired by Executor's catalog + discovery pattern. Extends P43's static type generation with runtime tool discovery. | L3 tools | Update `lib/harness-ts-exec.ts` |
| P43c | **Policy-Aware Execution** — extend sandboxed runtime with policy engine integration. Auto-approve reads (deterministic, no LLM permission check). Pause on writes (execution enters waiting state, human resumes). Wildcard path rules. Execution lifecycle with pause/resume state machine. Integrates with P35 Permission Subsystem. Inspired by Executor's policy engine + execution lifecycle. | L3 tools | Update `lib/harness-ts-exec.ts`, `extensions/harness-ts-exec.ts` |

### L4: Adversarial Verification

| Phase | What | Layer | Files |
|-------|------|-------|-------|
| P16 | Critic agents with hard-threshold pass/fail criteria | L4 | `lib/harness-critics.ts`, `extensions/harness-critics.ts` |
| P17 | Consensus Debate Transport — pi-messenger (stripped) | L4 cross | `lib/harness-messenger.ts` |
| P18 | Consensus Debate Protocol — DebateSession, Budget, Convergence | L4 cross | `lib/harness-debate.ts`, `lib/harness-schemas.ts` |
| P19 | Debate integration: L1 spec debate, L2 plan debate, L4 multi-round | L1/L2/L4 | Update `extensions/harness-*.ts` |
| P19b | Consensus-to-wiki filing: every debate verdict writes to `wiki/consensus/` | L4/L7 | `extensions/harness-debate.ts` (wiki write hook), L7 enforcement |

### L5-L8: Post-Verification

| Phase | What | Layer | Files |
|-------|------|-------|-------|
| P20 | Final Lint + Format Gate (post-L4, deterministic, no LLM) | Gate | `lib/harness-polish.ts`, `extensions/harness-polish.ts` |
| P21 | Automated Observability + Keep Rate Tracking + LLM-as-Judge satisfaction signals | L5 | `lib/harness-observability.ts`, `extensions/harness-observability.ts` |
| P22 | Persistent Memory (wiki vault, hot cache, lint schedule) | L6 | `extensions/harness-knowledge-base.ts` |
| P23 | Schema Orchestration (Archon DAG, read-first enforcer) | L7 | `.archon/workflows/*.yaml`, `extensions/harness-orchestrator.ts` |
| P24 | Wiki Query Interface (3-depth modes) | L8 | Integrated via claude-obsidian skills |

### Cross-Cutting

| Phase | What | Files |
|-------|------|-------|
| P25 | Subagent Specialization Router — dispatch by task type (plan/edit/debug), not just cost. Fresh context per subagent. Evolves from Haiku cost router. Cursor subagent pattern. | `lib/harness-router.ts`, `lib/harness-subagents.ts` |
| P26 | Package integration — update package.json, README, PLAN.md | Multiple |
| P27 | Context Anxiety Guard — detect and mitigate rushing/refusal as context fills. Validated by Cursor independent discovery. | `lib/harness-anxiety.ts` |
| P28 | Positive Agent Loop Hooks — stop hooks that re-invoke agent until DONE condition met (tests pass, lint clean). Counterpart to drift monitor's stop-only approach. Cursor grind pattern. | `extensions/harness-positive-loop.ts` |
| P29 | Per-Tool Per-Model Error Classification + anomaly detection baselines. Enables automated harness self-healing. Cursor error classification pattern. | `lib/harness-errors.ts`, update `lib/harness-observability.ts` |
| P44a | **Fallow MCP Tool Registration** — register fallow MCP server in harness tool registry. Agent calls `fallow --format json` during L3 execution for real-time codebase intelligence feedback (dead code, duplication, complexity, boundaries). JSON output with machine-actionable `actions` array per issue. 0 token cost (deterministic). | L3 tools | `.pi/mcp/fallow.json`, `.pi/skills/fallow/SKILL.md` |
| P44b | **Fallow Pre-Verification Audit** — extend P15b sandbox with `fallow audit --changed-since main --gate all --format json`. Scoped to changed files only. Returns pass/warn/fail verdict. Findings surfaced to agent for fix loop before L4 verification. 0 token cost (deterministic). LLM tokens only on failure (~200). | L3→L4 gate | Update `lib/harness-preverify.ts`, `extensions/harness-preverify.ts` |
| P44c | **Fallow Phase 16 Quality Gate** — add `fallow audit --gate all` as post-L4 deterministic gate in Phase 16. Non-negotiable pass/fail/warn verdict mapped to delivery gate. Baselines support for legacy codebases. 0 token cost. | Phase 16 gate | Update `lib/harness-polish.ts`, `.pi/harness/fallow-gate.json` |
| P44d | **Fallow L5 Health Snapshots** — `fallow health --score` + `fallow health --trend` snapshots stored per delivery event. Health score (0-100 + letter grade) as Keep Rate proxy. Trend comparison against saved snapshots for regression detection. Runtime coverage integration for hot/cold path evidence (optional, paid). | L5 | Update `lib/harness-observability.ts`, `.pi/harness/fallow-health.json` |
| P44e | **Fallow P29 Error Classification Mapping** — map fallow's structured JSON output (rule, severity, introduced, actions, auto_fixable) to P29 error classification taxonomy. `auto_fixable=true` issues flagged as auto-heal candidates. Per-rule per-model baseline stats for anomaly detection. | P29 | Update `lib/harness-errors.ts` |
| P44f | **Fallow L6 Baseline Storage** — git-committed baseline files in `.fallow-baselines/` (dead-code.json, health.json, dupes.json). L6 persistent memory references baseline versions in health snapshots. Separate from `.fallow/` cache directory (gitignored). | L6 | `.fallow-baselines/`, update `extensions/harness-knowledge-base.ts` |
| P44g | **Fallow P42 Scheduled Automation** — cron-style harness-initiated fallow runs: weekly health trend checks, daily dead code sweeps, per-PR audit (via CI). P42 automation framework invokes fallow for codebase hygiene maintenance. | P42 | Update `extensions/harness-knowledge-base.ts` (automation schedule) |

### Future Phases (Not Scheduled)

| Phase | What | Source |
|-------|------|--------|
| F1 | Harness Auto-Optimization — auto-tune budgets, learn profiles, remove dead gates. Validated by Cursor's 90-min RL loop + weekly automated Cloud Agent bug triage. | [[self-evolving-harness]], [[cursor-harness-april-2026]] |
| F2 | Behaviour Harness — functional correctness verification (unsolved problem) | [[feedforward-feedback-harness]] |
| F3 | Model Profile Auto-Learning — learn from execution traces instead of hand-coding. Cursor's per-model error baselines provide the measurement substrate. | [[self-evolving-harness]], [[cursor-harness-april-2026]] |
| F4 | Sandbox-as-Infrastructure — custom execution scheduler with fast provisioning + aggressive recycling for parallel agent scenarios. Cursor sandboxing pattern. | [[cursor-shipped-coding-agent-2026]] |
| P38 | OS-Level Sandbox Enforcement — bubblewrap (Linux), Seatbelt (macOS) integration. Technical enforcement of sandbox boundaries at OS level. Separate from P35 permission subsystem. Validated by Codex sandbox tiers. | [[codex-open-source-agent-2026]], [[codex-harness-innovations]] |
| P39 | Harness as MCP Server — expose L1-L8 pipeline stages as MCP tools for external agent composition. Validated by Codex bidirectional MCP pattern. | [[codex-open-source-agent-2026]], [[codex-harness-innovations]] |
| P40 | Skills Ecosystem Tooling — `$skill-creator` wizard, `$skill-installer`, agentskills.io standard compliance. Plugin packaging for distribution. Validated by Codex skills tooling. | [[codex-open-source-agent-2026]], [[codex-harness-innovations]] |
| P41 | Implicit Memory Capture — Chronicle-style screen-context capture for automatic situational awareness. Complements L6 wiki-based explicit memory. Background generation with rate-limit awareness. | [[codex-open-source-agent-2026]], [[codex-harness-innovations]] |
| P42 | Scheduled Agent Automations — cron-style recurring agent tasks. Harness-initiated: wiki lint, dep updates, test health, drift sweeps. New capability category. | [[codex-open-source-agent-2026]], [[codex-harness-innovations]] |
| P33 | Lifecycle Hook System — tool-level hooks (PreToolUse, PostToolUse, Stop, PermissionRequest, etc.) with deterministic exit-code semantics (0=allow, 2=deny). JSON input/output contracts. Five hook types: command, HTTP, MCP tool, prompt (LLM), agent (multi-turn). Claude Code hook architecture (30+ events). | [[lifecycle-hooks]], [[claude-code-architecture-vila-lab-2026]] |
| P34 | Structured Compaction Pipeline — multi-layer compaction with forked subagent producing ~6,500 token SE-tuned summaries. Selective preservation of file paths, code snippets, error histories, plan state. ~85% payload reduction. Replaces/extends basic context pruning (P4). Claude Code compaction architecture. | [[structured-compaction]], [[claude-code-architecture-qubytes-2026]] |
| P35 | Permission Subsystem — allow/deny/ask rule engine with scope hierarchy (Managed/User/Project/Local). ML-based auto-classifier for auto mode. Composable rule syntax. Sits between agent loop and tool execution as architecturally separate layer. Claude Code permission architecture. | [[claude-code-security-architecture-penligent-2026]] |
| P36 | Session Storage with Resume/Fork/Rewind — append-oriented session transcripts (JSONL). Sidechain subagent transcripts for context isolation. Checkpoint file-state snapshots before edits. Session resumption and forking. Claude Code session architecture. | [[claude-code-architecture-karaxai-2026]] |
| P37 | CLAUDE.md-Style Entrypoint System — additive configuration hierarchy (Global → Project → Local) with conditional YAML frontmatter. Single coherence entry-point for all harness rules, wiki references, and project conventions. Replaces distributed wiki-only approach with a unified entrypoint. | [[claude-code-architecture-karaxai-2026]] |
| P30 | Browser Subagent — **Vercel Labs agent-browser** (31.4K stars, Apache 2.0, Rust-native) for visual verification of UI changes. Snapshot + refs workflow, annotated screenshots, structured diff, batch mode. Replaces browser-harness (9.4K stars, Python). Antigravity browser subagent pattern. Dispatched by P25 subagent router for UI tasks. | L3 tools | `lib/harness-browser.ts`, `extensions/harness-browser.ts`, `.pi/harness/browser.json` |
| P31 | Artifact Generation Layer — agents generate human-reviewable deliverables (screenshots, browser recordings, test result summaries) after L4 verification. Complements adversarial review with positive proof of correctness. Antigravity Artifacts pattern. | L4→L5 bridge | `lib/harness-artifacts.ts`, `extensions/harness-artifacts.ts` |
| P32 | Cross-Project Learning Knowledge Base — extend L6 persistent memory for cross-project knowledge transfer. Agents save successful strategies and code patterns tagged by domain. Query across projects. Foundation for F1 self-evolving harness. Antigravity knowledge base pattern. | L6 | Update `extensions/harness-knowledge-base.ts`, `.pi/harness/knowledge-base.json` |

---

## Google Antigravity Validation (May 2026)

Research into Google's Antigravity agent-first IDE (launched Nov 2025, Windsurf acquisition $2.4B) independently validated 7 of our planned features and revealed 3 critical gaps. See [[Research: Google Antigravity Harness Integration]] for full synthesis.

### Features Antigravity Independently Validated

| Our Feature | Antigravity Equivalent | Source |
|---|---|---|
| Model-adaptive harness | Multi-model support (Gemini 3.1 Pro, Claude Sonnet 4.5, GPT-OSS) with model-specific task strengths | [[cursor-vs-antigravity-2026]] |
| Dynamic context | 1M token context window (different approach, same problem) | [[cursor-vs-antigravity-2026]] |
| Pre-verification isolation (P15b) | Browser subagent visual verification before presenting results | [[cursor-vs-antigravity-2026]] |
| Subagent specialization (P25) | Manager View multi-agent orchestration by task type | [[google-antigravity-official-blog]] |
| Self-evolving harness (F1) | Cross-project learning knowledge base | [[google-antigravity-official-blog]] |
| Skills system (F0) | SKILL.md progressive disclosure (same pattern, different implementation) | [[google-antigravity-official-blog]] |
| Adversarial verification (L4) | Artifact-based proof system (complementary, not competing) | [[agent-artifacts-verifiable-deliverables]] |

### New Phases Added from Antigravity Research

| Phase | What | Inspired By |
|---|---|---|
| P30 | Browser Subagent for visual verification | Browser subagent driving headless Chromium for UI verification |
| P31 | Artifact Generation Layer | Artifacts as human-reviewable deliverables (screenshots, recordings, test summaries) |
| P32 | Cross-Project Learning Knowledge Base | Agents save and reuse strategies across projects |

### What We Deliberately Do NOT Adopt

- **1M Token Context Window**: Token-inefficient for CLI harness. Our selective context (hot cache → index → pages) is cheaper and sufficient.
- **Full IDE Integration**: Antigravity is a VS Code fork. Our harness is CLI-level (extensions/hooks). Different architecture.
- **Google Cloud Lock-in**: Deep GCP integration is vendor lock-in. Harness stays platform-agnostic.
- **$249.99/mo Pricing**: Unsustainable. Our token budget optimization is a competitive advantage.

---

## Unified Token Budget

Single authoritative budget. All previous fragmented estimates consolidated.

### Per-Layer Budget (per subtask)

| Layer / Phase | Tokens | Mechanism |
|---------------|--------|-----------|
| L1 Spec Hardening | ~2,000 | Mandatory read + hardening + selective debate (~20% tasks trigger debate, +1,500 avg) |
| L2 Planning + Sprint Contracts | ~4,500 | Base plan + sprint contracts + selective debate (~20% tasks, +2,000 avg) |
| L2.5 Drift Monitor | ~1,500-2,200 | Rule-based pre-filter: 0 tokens (fast path if CLEAR stuck). LLM-based primary (Haiku 4.5): ~700 tokens every 8 turns. ~25-step session: ~3 checks × 700 = ~2,100 avg. Net positive: prevents 5,000-50,000 token stuck sessions. |
| Pre-Verification Sandbox (P15b) | ~0-200 | Deterministic compile/lint in isolated temp workspace. LLM tokens only on failure to feed error back. |
| L4 Adversarial Verification | ~4,500 | Hard-threshold criteria + selective multi-round debate (~30% tasks trigger 2+ rounds, +2,000 avg) |
| Phase 16 Lint+Format Gate | ~0 | Deterministic tooling, no LLM. Time: <10s. |
| L5 Observability | ~2,000 | Metric definitions, Keep Rate tracking, LLM-as-Judge satisfaction signals, per-tool per-model error baselines |
| L6 Memory Writes | ~1,000 | Haiku for standard writes, Opus for deep synthesis |
| Browser Subagent (P30) | ~0-500 | Deterministic screenshot + pixel diff unless vision model analysis needed. Avg ~100. |
| Artifact Generation (P31) | ~1,000 | LLM-based artifact generation (screenshots auto, recordings deterministic, summaries LLM). Haiku for standard artifacts. |
| L7+L8 Orchestration + Query | ~1,000 | Wiki bootstrapping amortized |
| **Total per subtask** | **~16,000-17,500** | Updated May 2026 with P30-P32. Up from ~15,000-16,000 baseline. Cross-project learning (P32) amortized across projects — negligible per-subtask cost. |

### Savings Mechanisms (relative to naive baseline)

| Mechanism | Savings | Source |
|-----------|---------|--------|
| AST truncation (read tool) | 30-50% input tokens on code exploration | [[wozcode]] |
| Fuzzy edit matching | Eliminates 5-15% retry round-trips | [[wozcode]] |
| Inline syntax validation | 10-20% fewer error-recovery tokens | [[wozcode]] |
| Haiku model router | ~40% operations on 15× cheaper model → 15-25% cost reduction | [[wozcode]] |
| Selective debate routing | 92% token savings on ~80% of debate-invoked tasks | [[fan2025-imad]] |
| Think-in-Code enforcement | 30-200× reduction on data analysis calls | [[think-in-code]] |
| TS Execution Layer (P43) | 3-4x context reduction on multi-tool workflows; 20% higher success rate | [[codeact-apple-2024]], [[cloudflare-codemode]] |
| Context drift pruning | 5-10× reduction for stuck sessions | [[drift-detection-unified]] |

### 5-Subtask Plan Budget

| Component | Naive Baseline | With All Improvements |
|-----------|---------------|----------------------|
| Pipeline overhead | ~87,500 | ~80,000-85,000 |
| Coding tokens | variable | -25-55% (AST truncation + fuzzy edits) |
| **Total 5-subtask** | **~87,500+** | **~55,000-65,000 + coding** |

---

## Consensus Filing Contract

Per First Principle #7 and [[consensus-debate]]:

- **Every debate that reaches a verdict writes to `wiki/consensus/[layer]-[topic-slug].md`**.
- Consensus pages contain: final position, key rounds summary, evidence references, participant agents, verdict type, date.
- **DEADLOCK** and **BUDGET_EXHAUSTED** verdicts also file — to record what could NOT be resolved and why.
- Future agents query `wiki/consensus/` before forming positions. Contradicting a filed consensus triggers harness block.
- This is the mechanism for **permanent agent alignment**: the wiki is the source of truth for all resolved disputes.

## New Tools Integrated

Tools identified from April 2026 research, now part of the implementation plan:

| Tool | Phase | Purpose | Integration |
|------|-------|---------|-------------|
| **ck** (semantic code search) | P13 | Hybrid BM25+embeddings code search, grep-compatible, MCP-native | MCP server: `ck --serve`. 3-layer enforcement: AGENTS.md rule + MCP registration + shell interception |
| **Gitingest** (bulk ingestion) | P15 | Convert external repos → structured LLM text | `/gitingest` skill wrapping Python package |
| **pi-messenger** (stripped) | P17 | File-based agent messaging transport for consensus debate | Dependency in package.json. Strip all UI overlays. |
| **pi-lean-ctx** (native) | F0 | 48 MCP tools, AST compression, governance, shell patterns | Already adopted: [[2026-04-30-pi-lean-ctx-native]] |
| **agent-browser** (Vercel Labs, 31.4K stars, Apache 2.0, Rust-native) | P30 | Browser automation CLI purpose-built for AI agents. Snapshot + refs workflow, annotated screenshots, structured diff, React introspection, Web Vitals, batch mode, built-in skills system. Replaces browser-harness (9.4K stars, Python). | `npm install -g agent-browser` (single binary, no Node.js runtime). Subagent dispatched by P25 router for UI tasks. Config: `.pi/harness/browser.json` |
| **Fallow** (codebase intelligence) | P44 | Dead code, duplication, complexity, boundaries. MCP server for agents. Audit mode for CI gates. | `npm install -D fallow`. MCP registration: `.pi/mcp/fallow.json`. Agent skill: `fallow-skills`. 7 sub-phases (P44a-P44g). |

---

## Fallow Validation (May 2026)

Research into Fallow (fallow-rs/fallow, Rust-native TS/JS codebase intelligence, 1.7K stars, MIT, 151 releases) validated the need for a deterministic codebase truth layer in the harness — and revealed that no other ecosystem has a single-tool equivalent. See [[Research: Fallow Codebase Intelligence Harness Integration]] for full synthesis.

### Why Fallow Matters for Harness

- **Single-command comprehensive gate**: `fallow` runs dead code + duplication + complexity + boundaries in one sub-second pass. No ecosystem has this — Python needs 3 tools, Go needs 3, Rust needs 3, Elixir needs 2.
- **Built for AI agents**: MCP server, JSON output with per-issue `actions` array and `auto_fixable` flags. Agent skill shipped in npm package. Purpose-built for "the codebase truth layer your coding agent can call."
- **Beats existing tools**: 2-13x faster than knip (dead code), 8-26x faster than jscpd (duplication). Broader feature set than either.
- **Audit mode for CI gates**: `fallow audit --gate all` returns pass/warn/fail verdict. Baselines for incremental adoption on legacy codebases.
- **Runtime intelligence (optional)**: V8 coverage-based hot/cold path detection. Paid layer. Keep Rate proxy for production code survival.

### Integration Points Validated

| Our Feature | Fallow Capability | Fit |
|---|---|---|
| Phase 16 Lint+Format Gate | `fallow audit --gate all` — deterministic pass/warn/fail | Post-L4 gate, 0 tokens |
| P15b Pre-Verification Sandbox | `fallow audit --changed-since main` — scoped to changes | Pre-L4 sandbox, 0 tokens |
| L3 Agent Tool Calling | MCP server + `--format json` with `actions` array | Real-time feedback during execution |
| L5 Observability + Keep Rate | `fallow health --score` + `--trend` snapshots | Health score as Keep Rate proxy |
| P29 Error Classification | Per-issue `rule`, `severity`, `introduced`, `auto_fixable` | Classification taxonomy substrate |
| P42 Scheduled Automations | Cron-style `fallow health --trend` sweeps | Weekly hygiene maintenance |

### New Phases Added from Fallow Research

| Phase | What | Inspired By |
|---|---|---|
| P44 (7 sub-phases) | Fallow codebase intelligence integration across L3, P15b, Phase 16, L5, P29, L6, P42 | Fallow's comprehensive single-command codebase analysis + MCP agent integration |

### Cross-Ecosystem Gap

Fallow is TS/JS only. Research into Python, Go, Rust, and Elixir ecosystems found NO single-tool equivalent (see [[codebase-intelligence-ecosystem-comparison]]). Every other ecosystem requires combining 3-5 separate tools to achieve similar coverage. Recommendation: P44 for TS/JS now. Multi-language wrappers deferred to future F5 phase.

### What We Deliberately Do NOT Adopt

- **Fallow Runtime (paid layer)**: V8 coverage-based hot/cold path detection requires paid license. Start with free static layer. Evaluate runtime if Keep Rate signal insufficient.
- **Fallow as only gate**: Fallow is deterministic quality (syntax + structure). It does NOT verify functional correctness. L4 adversarial verification remains the semantic gate. Fallow is the syntax/structure complement.
- **Python/Go/Rust/Elixir fallow-equivalents now**: No tool exists. Building multi-language wrappers is post-v1. TS/JS-only for initial harness.

---

## Cursor.sh Validation (May 2026)

Research into Cursor's production harness ($1B ARR, 400M+ daily requests) independently validated 5 of our planned features before implementation, and revealed 4 critical gaps now incorporated into the plan. See [[Research: cursor.sh Harness Innovations]] for full synthesis.

### Features Cursor Independently Validated

| Our Feature | Cursor Equivalent | Source |
|---|---|---|
| Model-adaptive harness | Per-model tool provisioning (patches vs string replace), custom prompting per model version | [[cursor-harness-april-2026]] |
| Dynamic context (wiki query + lean-ctx) | Removed static guardrails, moved to dynamic context discovery | [[cursor-harness-april-2026]] |
| P27 Context Anxiety Guard | "Context anxiety" — one model started refusing work as context filled | [[cursor-harness-april-2026]] |
| F1 Self-Evolving Harness | 90-minute RL loop on accept/reject data | [[cursor-agent-best-practices-2026]] |
| P10 Fuzzy Edit Matching | "Diff Problem" — edit quality is the hardest engineering challenge | [[cursor-instant-apply-2024]], [[cursor-shipped-coding-agent-2026]] |

### New Phases Added from Cursor Research

| Phase | What | Inspired By |
|---|---|---|
| P15b | Pre-Verification Isolation Sandbox | Shadow Workspace pre-validation loop |
| P28 | Positive Agent Loop Hooks | Long-running agent stop hooks (grind pattern) |
| P29 | Per-Tool Per-Model Error Classification + anomaly detection | Error classification system + weekly automated Cloud Agent triage |
| P25 (evolved) | Subagent Specialization Router (was: Haiku cost router) | Subagent dispatch by task type with fresh context |
| P21 (extended) | Keep Rate tracking + LLM-as-Judge satisfaction metrics | Keep Rate metric + semantic satisfaction analysis |
| P10 (extended) | Full-file rewrite accept mode (in addition to search/replace) | Fast Apply model: full-file rewrites beat diffs for model accuracy |

---

## Codex Validation (May 2026)

Research into Codex (OpenAI's fully open-source Rust coding agent, 79.2K+ GitHub stars, Apache 2.0 license) independently validated 7 of our planned features and revealed 5 new gaps. Codex is uniquely valuable because its architecture is transparent (not reverse-engineered). See [[Research: Codex State-of-the-Art Harness Improvements]] and [[codex-harness-innovations]] for full synthesis.

### Features Codex Independently Validated

| Our Feature | Codex Equivalent | Source |
|---|---|---|
| Model-adaptive harness | Per-agent model selection (gpt-5.5/5.4/5.4-mini/spark) with `model_reasoning_effort` per subagent | [[codex-open-source-agent-2026]] |
| Skills system (F0) | agentskills.io standard, progressive disclosure, `$skill-creator`, scoped discovery (REPO/USER/ADMIN/SYSTEM) | [[codex-open-source-agent-2026]] |
| Lifecycle hooks (P33) | 6-event hooks framework (SessionStart, PreToolUse, PermissionRequest, PostToolUse, UserPromptSubmit, Stop) with exit-code semantics (0=continue, 2=block), JSON I/O, concurrent execution | [[codex-open-source-agent-2026]] |
| Subagent specialization (P25) | Parallel subagent dispatch with per-agent model + reasoning effort selection, summary returns to main thread for context pollution mitigation | [[codex-open-source-agent-2026]] |
| Pre-verification isolation (P15b) | Sandbox tiers (read-only, workspace-write, danger-full-access) with writable roots for bounded agent work | [[codex-open-source-agent-2026]] |
| Persistent memory (L6) | Memories system (cross-thread, automatic, background-generated, secret-redacted) with Chronicle screen-context capture | [[codex-open-source-agent-2026]] |
| Subagent worktree isolation (P25b) | Git worktrees for parallel branch isolation — multiple agents editing different branches without conflicts | [[codex-open-source-agent-2026]] |

### New Phases Added from Codex Research

| Phase | What | Inspired By |
|---|---|---|
| P38 | OS-Level Sandbox Enforcement — bubblewrap (Linux), Seatbelt (macOS) integration for mandatory sandbox boundaries. Complements P35 permission subsystem with technical enforcement. Sandbox as foundation, permissions as policy layer. | Sandbox tiers with OS-level enforcement |
| P39 | Harness as MCP Server — expose harness pipeline stages as MCP tools. External agents can invoke L1 spec hardening, L4 adversarial verification, L7 orchestration. Enables agent-to-agent composition. | `codex mcp-server` bidirectional MCP |
| P40 | Skills Ecosystem Tooling — `$skill-creator` interactive wizard, `$skill-installer` for curated skills, agentskills.io standard compliance for interoperability. Plugin packaging for distribution. | `$skill-creator`, `$skill-installer`, agentskills.io standard |
| P41 | Implicit Memory Capture — Chronicle-style screen-context capture for automatic situational awareness. Complements L6 wiki-based explicit memory. Background memory generation with rate-limit awareness and secret redaction. | Chronicle + Memories system |
| P42 | Scheduled Agent Automations — recurring agent tasks on cron-style schedules. Harness-initiated runs for maintenance: wiki lint, dependency updates, test suite health checks, drift monitor sweeps. | Automations feature |

### What We Deliberately Do NOT Adopt

- **Full Rust rewrite**: Codex's Rust implementation enables zero-dependency install and OS sandbox integration. But TypeScript (our choice) has faster iteration and broader ecosystem. A Rust core is a post-v1 consideration, not a current priority.
- **Multi-surface architecture**: Codex's App Server pattern for IDE/Desktop/Web integration is overengineered for a CLI harness. Keep CLI-focused. The App Server pattern is noted for future reference.
- **Automatic-only memory**: Codex's Memories are entirely automatic. Our wiki-based approach (explicit, checked-in, human-authored) serves a different purpose: team alignment and decision tracking. Implicit memory (P41) is complementary, not a replacement.

---

## Claude Code Validation (May 2026)

Research into Claude Code's architecture (Anthropic's agentic coding CLI, 82K+ GitHub stars, millions of sessions) independently validated 3 of our planned features and revealed 6 critical gaps now incorporated into the plan. Claude Code's architecture was reverse-engineered from a 510K-line TypeScript codebase (leaked March 2026) and analyzed across 4 primary sources. See [[Research: Claude Code State-of-the-Art Harness Improvements]] for full synthesis.

### Features Claude Code Independently Validated

| Our Feature | Claude Code Equivalent | Source |
|---|---|---|
| FP #1: Harness > Model | "The model is the commodity; the agent is the product." 510K-line scaffold around a while-loop. | [[claude-code-architecture-karaxai-2026]] |
| Model-adaptive harness | Provider-native tool provisioning (edit formats by model). Different models get different tool surfaces. | [[claude-code-architecture-vila-lab-2026]] |
| Skills system (F0) | SKILL.md progressive disclosure. Built-in skills (/simplify, /review, /batch) are prompt-based, not hardcoded. | [[claude-code-architecture-karaxai-2026]] |

### New Phases Added from Claude Code Research

| Phase | What | Inspired By |
|---|---|---|
| P33 | Lifecycle Hook System (30+ events, exit-code semantics, 5 hook types) | PreToolUse/PostToolUse/Stop hooks with deterministic policy enforcement. 100% compliance vs ~92% for prompt-based rules. |
| P34 | Structured Compaction Pipeline (forked subagent, 5-layer, ~85% reduction) | Five-layer compaction with selective preservation tuned for SE tasks. Fundamental upgrade over basic context pruning (P4). |
| P35 | Permission Subsystem (7 modes, ML classifier, 4 scopes) | Safety as architecturally separate layer between agent loop and tool execution. No equivalent in current harness. |
| P36 | Session Storage with Resume/Fork/Rewind (append-oriented, sidechain isolation) | Transactional session transcripts. Checkpoint/restore file state. Session forking for branching strategies. |
| P37 | CLAUDE.md-Style Entrypoint System (additive hierarchy, conditional rules) | Single coherence entry-point. Additive layers (Global→Project→Local) with conditional YAML frontmatter. 96% compliance from structured small files. |
| P25b | Subagent Worktree Isolation (fresh context + isolated git worktree) | Subagents with isolated filesystems and context windows. Tool allowlists/denylists. Sidechain transcripts. |

### Design Philosophy Tensions (Not Gaps — Deliberate Differences)

| Claude Code Approach | Our Approach | Resolution |
|---|---|---|
| **Agentic search** (Glob→Grep→Read): No embeddings. "Agentic search generally works better" — Boris Cherny | P13 semantic code search via ck MCP (embeddings-based) | Benchmark both. Keep P13 as experimental. Fall back to agentic search if embeddings underperform. |
| **Reactive loop** (while-loop + infrastructure) | Sequential 8-layer pipeline | Keep L1-L4 as quality gates. Evolve L7 orchestration from fixed DAG to loop-orchestrator pattern. Loop model for task execution, pipeline model for quality enforcement. |
| **No indexing, no setup** | lean-ctx + ck MCP indexing | Keep indexing-free by default. Add indexing as opt-in for large codebases. Align with Claude Code's "zero setup friction" philosophy. |

### TypeScript Execution Layer Validation (May 2026)

Research into the TypeScript execution layer pattern — giving agents a single "write TypeScript" tool + sandboxed runtime instead of flat tool lists — independently validated 2 planned features and revealed 1 critical gap. Three independent systems (Apple CodeAct, Cloudflare Code Mode, Executor) converge on the same architecture. See [[Research: TypeScript Execution Layer for Agent Tool Calling]] for full synthesis.

#### Features Independently Validated

| Our Feature | TS Execution Layer Equivalent | Source |
|---|---|---|
| P14 Think-in-Code Enforcement | CodeAct: "LLMs are better at writing code than making tool calls" — academic foundation. Cloudflare Code Mode: production TypeScript variant with Worker sandbox. Executor: local-first open-source implementation. | [[codeact-apple-2024]], [[cloudflare-codemode]], [[executor-rhyssullivan]] |
| P35 Permission Subsystem | Executor's typed RPC dispatch routes all tool calls through host where permission gating lives. CF Code Mode's `ToolDispatcher extends RpcTarget` isolates sandbox from tool execution. | [[executor-rhyssullivan]], [[cloudflare-codemode]] |

#### New Phases Added from TS Execution Layer Research

| Phase | What | Inspired By |
|---|---|---|
| P43 | TypeScript Execution Layer — single `write_ts` tool + sandboxed TypeScript runtime with typed API for all L3 tools | Three-system convergence: CodeAct (academic), CF Code Mode (production), Executor (open-source) |
| P43b | Tool Catalog with Intent-Based Discovery — `tools.discover()` runtime API | Executor's catalog + discovery pattern |
| P43c | Policy-Aware Execution — auto-approve reads, pause on writes, execution lifecycle | Executor's policy engine + pause/resume |

#### What We Deliberately Do NOT Adopt

- **Cloudflare Workers dependency**: Code Mode requires CF Workers for `DynamicWorkerExecutor`. Our sandbox uses local Node.js VM or Deno subprocess. The `Executor` interface is minimal — we implement our own backend.
- **Python interpreter (CodeAct)**: CodeAct uses Python. Our harness is TypeScript. The paradigm is validated; the language choice follows our stack.
- **Web UI for tool config (Executor)**: Executor includes a browser UI at `localhost:4788`. Our harness is CLI-only. Configuration via `.pi/harness/ts-exec.json`.

---

### What We Deliberately Do NOT Adopt

- **Plugin Ecosystem (9,000+ plugins)**: Network-effect problem, not solvable by architecture. Our skills system is sufficient for a CLI harness.
- **Full Multi-Surface Interface (CLI/Browser/Desktop/SDK)**: Our harness is CLI-focused by design. Multi-surface is overengineered for our use case.
- **Sandboxing (Seatbelt/bubblewrap)**: OS-level sandboxing is platform-specific and complex. Our L7 orchestration + pre-verification isolation provides sufficient blast-radius control for a CLI harness.
- **CLAUDE.md every-turn injection in user messages**: Our wiki-based context (L8) + skill system achieves the same coherence goal via different mechanisms. The CLAUDE.md pattern (re-read from disk every turn) is appropriate for Claude Code's reactive loop but overkill for our pipeline model.

---

See [[drift-detection-unified]] for full specification. Summary:

| Paradigm | Layer | Detects | Mechanism | Intervention |
|----------|-------|---------|-----------|-------------|
| **Spec Drift** | L3 | Scope creep, spec violation | Compare current state to hardened spec hash | Abort, replan from L2 |
| **Tool-Call Drift** | L2.5 | Stuck patterns, context pollution, SEMANTIC drift (heading wrong direction) | LLM-first (Haiku/mini, ~700 tokens/8 turns) + rule-based pre-filter (0 tokens) | Prune dead context, inject correction, restart agent |
| **Implementation Drift** | L4 | Code doesn't match spec | Adversarial verification, multi-round debate | Rework subtask, re-verify |

These are complementary, not redundant. Each targets a different failure mode at a different pipeline stage.

---

## "Think in Code" Integration

From context-mode research. Enforced at 3 levels:

1. **System Prompt** (zero cost, immediate): AGENTS.md rule — "When analyzing/filtering/comparing data, write code. Output only the answer. Never read raw data into context for mental processing."
2. **Tool Interception** (L3): PreToolUse hook detects data-analysis-like Read/Bash calls → routes to `ctx_execute()` sandbox (via pi-lean-ctx).
3. **PostToolUse Compression** (L3): When large output enters context, lean-ctx shell patterns auto-compress.

Expected savings: 30-200× reduction on data analysis tool calls.

---

## Key Architecture Decisions

- **[[adr-008|ADR-008 (Black-Box QA)]]**: Tests from spec only, never from implementation
- **[[adr-009|ADR-009 (claude-obsidian Mode B)]]**: Replaces Vectra + embeddings with LLM-native search
- **[[adr-010|ADR-010 (Wiki Tight-Coupling)]]**: Every layer reads wiki first, writes wiki after
- **[[adr-011|ADR-011 (Consensus Debate with Selective Routing)]]**: Multi-agent debate via pi-messenger transport, gated by iMAD-style hesitation classifier. UPDATE: selective routing adopted per iMAD findings (2026-04-30).

---

## Wiki Integration Contract

Per [[adr-010]] and [[harness-wiki-pipeline]]:

- **Read-first**: Every layer queries wiki for relevant ADRs, specs, patterns, AND consensus records before executing
- **Write-after**: Every state transition writes a wiki artifact (decision, pattern, event). Consensus verdicts are state transitions and MUST write to `wiki/consensus/`.
- **Staleness rules**: Status propagation, decision referencing, cross-reference integrity, contradiction resolution, hot cache freshness, lint schedule (every 10-15 writes), index synchronization
- **Alignment guarantee**: Future agents query wiki consensus records before making decisions — preventing re-litigation of settled debates. If an agent proposes a position that contradicts a filed consensus, the harness blocks and surfaces the conflict.
- **Enforcement**: L7 schema orchestration extension hooks

---

## What Never Adapts (Cross-Model Invariants)

Per [[model-adaptive-harness]]:

- Pipeline phase ordering and layer requirements
- Quality standards and source attribution
- Confidence labeling
- Budget constraints (max rounds, max tokens, max pages)
- Verification requirements (what must be checked, even if how varies)
- Read-first/write-after wiki contract
- No-skip rule (verification is mandatory)

---

## What Adapts Per Model

See [[harness-configuration-layers]] for full table. Key differences:

| Dimension | Opus/Claude | GPT | Gemini |
|-----------|-------------|-----|--------|
| Structure | Tolerates nesting | Needs flat, constraints-first | TBD |
| Verification | Natural double-check | Must be enforced hard gate | TBD |
| Truncation | Reads metadata | Needs in-band body text | TBD |
| Completion | Self-aware of gaps | Stops at plausible-but-incomplete | TBD |
| Drift detection | LLM-based (Haiku) every 12 turns + rule pre-filter | LLM-based (Haiku/mini) every 8 turns + rule pre-filter | LLM-based (Haiku/mini) every 8 turns + rule pre-filter |

**Design principle**: Generate provider-native prompts from provider-agnostic semantic spec. Never generate a single canonical prompt and relax it. See [[provider-native-prompting]] and [[model-adaptive-harness]] for the May 2026 redesign. Validated by Cursor's per-model tool provisioning (patches for OpenAI, string replace for Anthropic) and per-model-version prompt customization. [[cursor-harness-april-2026]].
