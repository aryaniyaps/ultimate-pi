# Product Requirements Document: Ultimate-PI Agentic Harness

**Status**: Draft for Review  
**Created**: 2026-05-02  
**Owner**: pi coding agent platform  
**Sources**: 100+ wiki pages, 19 first principles, 48+ build phases, 6 independent validations (Cursor, Codex, Claude Code, Antigravity, Gemini CLI, Augment)

---

## 1. Executive Summary

The **Ultimate-PI Agentic Harness** is an 8-layer mandatory execution pipeline activated via explicit `/harness` command. It wraps the pi coding agent via an extension-based event bus architecture (ADR-012) — no fork of pi. It enforces quality, prevents drift, manages context, and ensures every code change is verified before it reaches the user. The harness is the engineering discipline that turns an LLM into a reliable software engineering agent.

**Integration model**: `src/harness/` pure TypeScript library + `.pi/extensions/harness-event-bus.ts` thin pi wiring (ADR-017). Sub-agents via `@tintinweb/pi-subagents` cross-extension RPC (ADR-016).

This PRD covers the **complete harness implementation** across 48+ build phases spanning specification hardening, structured planning, runtime drift monitoring, tool-level execution enforcement, adversarial verification, observability, persistent memory, cross-cutting agent capabilities, and self-evolving infrastructure.

**Key metrics**:
- Token overhead per subtask: ~16,000-17,500 with all enhancements (down from ~87,500 naive)
- 3-4x context reduction via TypeScript execution layer with isolated-vm sandbox (P43, Group 4)
- Think-in-Code absorbed by P43 — P43 IS think-in-code
- 92% token savings on consensus debates via iMAD selective routing (ADR-011, Group 3)

---

## 2. Problem Statement

### 2.1 Current State

The pi coding agent operates as a thin wrapper around LLM APIs with `.pi/skills/` for progressive disclosure, lean-ctx for tool compression, and an Obsidian wiki for persistent memory. It has no structured execution pipeline, no drift detection, no mandatory verification, and no cross-model prompt adaptation. The harness adds these as an extension-based layer — no fork of pi required.

### 2.2 Core Problems

| Problem | Impact | Root Cause |
|---------|--------|------------|
| **Context drift**: Agents get stuck in loops, re-read files unnecessarily, or lose track of the task | Wasted tokens, wrong output, user frustration | No runtime drift monitor, no structured context management |
| **Unverified code changes**: LLM output reaches user without adversarial review | Bugs, regressions, security issues | No mandatory verification layer, no critic agents |
| **Model-dependent quality**: Same prompt produces different quality across OpenAI, Anthropic, Google | Inconsistent reliability, model lock-in | Single prompt format, no provider-native rendering |
| **Context window anxiety**: Models rush or refuse work as context fills | Incomplete solutions, premature stops | No context anxiety guard, no structured compaction |
| **Tool context bloat**: Each MCP server adds 300-800 tokens of definitions | Agents get dumber as tools multiply | Flat tool calling, no execution layer abstraction |
| **No spec grounding**: Tasks lack unambiguous acceptance criteria before execution | Scope creep, wrong-thing-built | No spec hardening step |
| **No persistent alignment**: Agents re-litigate settled debates | Repeated mistakes, inconsistent decisions | No consensus filing, no cross-agent alignment record |

### 2.3 Opportunity

State-of-the-art agent harnesses (Cursor $1B ARR, Claude Code 82K+ stars, Codex 79.2K stars, Gemini CLI 103K stars, Antigravity $2.4B acquisition) have independently validated the same architectural patterns. We can synthesize their proven approaches into a unified, open-source, CLI-native harness.

---

## 3. First Principles

These 19 principles were synthesized from 6 independent research streams (Meng et al. 110+ papers, Fowler/Böckeler, OpenAI, LangChain, Augment, Cursor, Codex, Claude Code, Antigravity, Gemini CLI, TypeScript Execution Layer, Fallow). They are the non-negotiable foundation of the harness design.

### 3.1 Core Architecture

1. **The harness — not the model — determines reliability at scale.** Models reach the same capability ceiling only after harness adaptation.
2. **Every pipeline layer reads wiki first, writes wiki after.** No layer can skip the knowledge base contract.
3. **Write once for strictest model (GPT-safe). Relax for forgiving models.** Provider-native prompting renders per-model without changing the semantic spec.
4. **Three quality concerns, three timings:** Syntax (inline, blocks progress), Semantics (L4, needs LLM), Style (Phase 16 final gate, deterministic tools).
5. **Debate is selective, not always-on.** Pre-debate gating classifier saves 92% tokens (iMAD, AAAI 2026).
6. **Context drift is a positive feedback loop.** Each failed attempt accelerates failure. Meta-agent detection + pruning + restart breaks the loop.
7. **Winning consensus from any agent debate MUST be filed in the project wiki.** Permanent alignment record prevents future agents from re-litigating settled debates.

### 3.2 Verification & Quality

8. **Pre-verification beats post-verification.** Validate code in isolation before the calling agent sees failures (Cursor Shadow Workspace pattern).
9. **Positive loops are as important as negative loops.** Drift detection stops bad behavior. Agent hooks keep agent running until DONE.
10. **Keep Rate > benchmark scores.** The fraction of agent-generated code still in the codebase after time intervals is the ultimate quality metric.
11. **Trust requires proof, not just criticism.** L4 adversarial verification catches what's wrong. Artifacts prove what's right. Both mandatory.
12. **Hooks determine correctness, not prompts.** Lifecycle hooks with exit-code semantics achieve 100% compliance for matched conditions.
13. **Context is a managed resource, not a budget to minimize.** Structured compaction preserves signal while achieving ~85% reduction.
14. **Safety is a subsystem, not an afterthought.** Permission checking sits between the agent loop and tool execution as a separate architectural layer.
15. **Single entry-point, additive configuration hierarchy.** CLAUDE.md-style layered configuration (Global → Project → Local) for coherent agent behavior.

### 3.3 Architectural Integrity

16. **Sandbox is foundation, permissions are policy — not the reverse.** Inner sandbox: `isolated-vm` V8 isolate (ADR-014). Outer sandbox: OS-level bubblewrap/Seatbelt (P38). Cannot be bypassed.
17. **The agent should be composable — both consumer and provider of tools.** MCP server mode enables harness pipeline stages to be invoked by external agents.
18. **Implicit memory complements explicit memory — not replaces it.** Automatic context capture (Chronicle-style) fills the gap between explicit documentation and complete amnesia.
19. **Code is a better tool-calling interface than JSON.** A single "write TypeScript" tool + sandboxed runtime achieves 3-4x context reduction and ~20% higher success rate on multi-tool tasks.

---

## 4. Architecture Overview

### 4.1 The 8-Layer Mandatory Pipeline

Harness activates via explicit `/harness "task"` command (ADR-021). Normal chat bypasses pipeline entirely. When active, every task flows through all layers.

```
/harness "task"
  ↓
L1: Spec Hardening (harness_ask Q&A, GitHub Issues storage)
  ↓
L2: Structured Planning (YAML plan, compact summary into system prompt)
  ↓
L2.5: Runtime Drift Monitor (7 rule-based patterns, turn-dependent thresholds)
  ↓
L3: TS Execution Layer + Grounding Checkpoints (P43 isolated-vm sandbox)
  ↓
L4: Adversarial Verification (critic sub-agent via @tintinweb/pi-subagents RPC)
  ↓
Phase 16: Lint+Format Gate (biome check + tsc --noEmit + fallow)
  ↓
L5: Automated Observability → L6: Persistent Memory → L7: Schema Orchestration → L8: Wiki Query
```

### 4.2 Layer Summary

| # | Layer | Purpose | Key Mechanism |
|---|-------|---------|---------------|
| **L1** | Spec Hardening | Block execution until ambiguities resolved | harness_ask tool, GitHub Issues storage (ADR-025), spec hash |
| **L2** | Structured Planning | Machine-readable task DAG + sprint contracts | YAML plan file, compact system prompt summary (ADR-020, ADR-024) |
| **L2.5** | Runtime Drift Monitor | Detect stuckness, prune dead context, restart agent | 7 rule-based patterns + turn-dependent thresholds + ck routing (ADR-022) |
| **L3** | Grounding Checkpoints + P43 TS Execution | Single `write_ts` tool in isolated-vm sandbox | isolated-vm V8 isolate (ADR-014), AST truncation, inline validation, ck search |
| **L4** | Adversarial Verification | Critic sub-agent attacks with hard-threshold criteria | @tintinweb/pi-subagents RPC (ADR-016), selective debate, consensus filing |
| **Phase 16** | Lint+Format Gate | Deterministic quality gate (post-L4, pre-L5) | biome check + tsc --noEmit + fallow — 0 LLM tokens (ADR-013) |
| **L5** | Automated Observability | Instrumentation is definition-of-done | Keep Rate tracking, LLM-as-Judge, error classification, health snapshots |
| **L6** | Persistent Memory | Wiki vault, hot cache, knowledge base | Read-first/write-after contract, cross-project learning KB |
| **L7** | Schema Orchestration | Archon workflow DAG, enforces wiki contract | Extension hooks, debate filing enforcement |
| **L8** | Wiki Query Interface | LLM-native search via claude-obsidian skills | Hot cache → index → pages depth-based query |

### 4.3 Cross-Cutting Capabilities

These span multiple layers and are implemented as shared subsystems:

| Capability | Phases | Description |
|------------|--------|-------------|
| **Lifecycle Hook System** | P33 | 30+ events via harness event bus (ADR-012). Layered on pi's 5 native events. |
| **Subagent Infrastructure** | ADR-016 | @tintinweb/pi-subagents. Cross-extension RPC for spawning/steering sub-agents. Used by L4 critic, P25 router, P30 browser. |
| **Harness Setup** | F0 | `/harness-setup` one-time bootstrap: install sub-agents, create wiki, configure GitHub. |
| **Subagent Specialization Router** | P25 | Dispatch by task type (plan/edit/debug), fresh context per subagent |
| **Context Anxiety Guard** | P27 | Detect and mitigate rushing/refusal as context fills |
| **Positive Agent Loop Hooks** | P28 | Re-invoke agent until DONE condition met (counterpart to drift monitor) |
| **Per-Tool Per-Model Error Classification** | P29 | Anomaly detection baselines for automated self-healing |
| **Browser Subagent** | P30 | Headless browser for visual UI verification |
| **Artifact Generation Layer** | P31 | Human-reviewable deliverables (screenshots, recordings, test summaries) |
| **Cross-Project Learning KB** | P32 | Multi-project knowledge transfer for agents |
| **Structured Compaction** | P34 | 5-layer compaction, ~85% context reduction |
| **Permission Subsystem** | P35 | 7 modes, ML auto-classifier, 4 scopes |
| **Session Storage** | P36 | Resume/Fork/Rewind with transcripts + checkpoints |
| **CLAUDE.md Entrypoint** | P37 | Additive config hierarchy, conditional YAML |
| **OS-Level Sandbox** | P38 | bubblewrap/Seatbelt integration. Outer sandbox. Inner: isolated-vm (ADR-014). |
| **Harness as MCP Server** | P39 | Expose pipeline stages as MCP tools |
| **Skills Ecosystem** | P40 | $skill-creator, $skill-installer, agentskills.io |
| **Implicit Memory** | P41 | Chronicle-style screen-context capture |
| **Scheduled Automations** | P42 | Cron-style recurring agent tasks |
| **TS Execution Layer** | P43 | Single `write_ts` tool + isolated-vm sandbox (ADR-014). Deferred to Group 4. |
| **Fallow Codebase Intelligence** | P44a-g | Dead code, duplication, complexity, boundaries via single command |
| **Harness Auto-Optimization** | P45 | Auto-tune budgets, learn profiles, remove dead gates. Cursor's 90-min RL loop pattern. |
| **Behaviour Harness** | P46 | Functional correctness verification. AI-generated tests + mutation testing + property-based testing. |
| **Model Profile Auto-Learning** | P47 | Learn model profiles from execution traces instead of hand-coding. Per-model error baselines as training signal. |
| **Sandbox-as-Infrastructure** | P48 | Custom execution scheduler. Fast provisioning + aggressive recycling for parallel agent scenarios. |

---

## 5. Formal Models

### 5.1 H = (E, T, C, S, L, V)

From Meng et al. (2026) survey of 110+ papers and 23 systems:

| Component | Implementation |
|-----------|---------------|
| **E** Execution Loop | L1-L4 pipeline (Spec → Plan → Execute → Verify) |
| **T** Tool Registry | Tool schemas, MCP tools (lean-ctx 48 tools, ck, Gitingest, Fallow), @tintinweb/pi-subagents, skills |
| **C** Context Manager | Wiki knowledge base, AST truncation, lean-ctx compression, think-in-code enforcement |
| **S** State Store | Wiki vault persistence, ctx_session cross-session memory, hot.md cache |
| **L** Lifecycle Hooks | L7 Archon orchestration, post-edit validation hooks, drift monitor hooks |
| **V** Evaluation Interface | L4 adversarial verification, L5 observability, terminal-bench evaluation |

### 5.2 Feedforward-Feedback Control Framework

From Böckeler (2026, Martin Fowler). Four-quadrant control space:

| | Computational | Inferential |
|---|---|---|
| **Feedforward** | Tool schemas, `tsc --noEmit`, JSON schema | SKILL.md, ADRs, wiki pages, AGENTS.md |
| **Feedback** | Inline syntax validation, lint+format gate | L4 adversarial verification, meta-agent drift monitor |

### 5.3 Generator-Evaluator Architecture

GAN-inspired separation: generator agents produce code, evaluator agents critique it. The harness orchestrates the adversarial loop: generate → verify → re-generate if failed.

---

## 6. Detailed Build Phases

### Phase 0: Foundation (F0)

Build the configurability substrate before any pipeline layers. All harness logic lives in `src/harness/` (pure TypeScript). Pi integration via `.pi/extensions/harness-event-bus.ts` (thin wiring).

| ID | Deliverable | Files |
|----|-------------|-------|
| F0.1 | Harness types (all phase schemas) | `src/harness/types.ts` |
| F0.2 | Harness configuration system | `src/harness/config.ts`, `.pi/harness/config.json` (single file, ADR-018) |
| F0.3 | Harness event bus | `src/harness/events.ts` (typed wrapper around pi.events, ADR-012) |
| F0.4 | Pi extension wiring | `.pi/extensions/harness-event-bus.ts` (registers /harness command, wires src/harness/ to pi hooks) |
| F0.5 | harness-setup bootstrap | `/harness-setup` command: install @tintinweb/pi-subagents, create wiki, configure GitHub, verify tooling (ADR-025) |
| F0.6 | Model profiles (deferred) | Deferred to Group 8 (P22b). Not needed until provider-native rendering. |

### Phase 1: Spec Hardening (L1)

| ID | Deliverable | Description |
|----|-------------|-------------|
| P1.1 | Ambiguity detector | Scan user request for unresolved decisions. Block L1→L2 until resolved via loop-level clarification. |
| P1.2 | Spec hash | Content-addressed spec identity (SHA256 of YAML spec). Immutable after hardening. |
| P1.3 | harness_ask tool | Structured Q&A tool for spec clarification (ADR-019). Falls back to system prompt injection if TUI unavailable. |
| P1.4 | GitHub Issues spec storage | Sole spec store (ADR-025). `.github/ISSUE_TEMPLATE/harness-spec.yml`. No local cache. Network-dependent. |
| P1.5 | Spec YAML format | Hybrid: deterministic criteria (auto-verified) + freeform criteria (L4 critic). ADR-023. |

### Phase 2: Structured Planning (L2)

| ID | Deliverable | Description |
|----|-------------|-------------|
| P2.1 | Task DAG generator | YAML task dependency graph from hardened spec (ADR-020). No code until DAG signed. |
| P2.2 | Sprint contracts | `doneCriteria` per task: deterministic (tests_pass, lint_passes, etc.) + spec_requirement (L4 critic). |
| P2.3 | Plan summary injector | Compact 3-5 line plan summary into system prompt. Full YAML on disk (ADR-024). Agent re-reads at checkpoints. |
| P2.4 | iMAD gating (deferred) | Deferred to Group 3. Pre-debate classifier not needed until L4 debate exists. |

### Phase 3-7: Runtime Drift Monitor (L2.5)

Seven detection patterns + turn-dependent thresholds + escalation model, running continuously via `tool_result` event analysis. Sliding window of last 20 tool calls.

| ID | Deliverable | Description |
|----|-------------|-------------|
| P3 | Rule-based pattern detection | 7 patterns (ADR-022): repetition loops, failure spirals, tool cycling, silence/batching (turn-dependent), rework, excessive search, obsolete search (ck routing) |
| P4 | Context pruning + correction | Prune dead context, inject correction prompt between turns via `before_agent_start` |
| P5 | Escalation ladder | Soft nudge → strong nudge → forced restart. Thresholds configurable. |
| P6 | Drift config | Per-project thresholds in `.pi/harness/config.json` → `driftMonitor` key. Turn-dependent batching: no limit turns 1-8, 12 reads turns 9-15, 6 reads turns 16+. |
| P7 | ck search routing | Detect grep/find for semantic queries (≥3 words). Nudge: use ck_search instead (ADR-022). |

### Phase 8-15: Execution Layer (L3) + P43 TS Execution Layer

**Note**: Build order is pipeline-first (ADR-015). P43 ships in Group 4, after L2.5 and L4 are validated. L3 survivors (P8, P9, P11, P13, P15) integrate into P43's isolated-vm runtime. P14 (Think-in-Code) is absorbed by P43 — P43 IS think-in-code. P10 (fuzzy edits) moves into P43's `edit()` host function. P15b (pre-verification sandbox) reuses P43's isolated-vm isolate.

| ID | Deliverable | Description | Token Impact |
|----|-------------|-------------|-------------|
| P43 | TypeScript execution layer | Single `write_ts` tool in **isolated-vm** V8 isolate (ADR-014). Replaces 8-15 flat tools. ESBuild for type stripping. Tool functions exposed as typed host functions. | 3-4x context reduction |
| P43b | Tool catalog with discovery | `tools.discover({ query, limit })` runtime API. Intent-based, not schema-based. | Avoids loading all schemas |
| P43c | Policy-aware execution | Auto-approve reads, pause on writes. Pause/resume state machine. Integrates with P35. | Security + UX |
| P8 | Grounding checkpoints | MVC execution: smallest verifiable change. Spec-drift comparison after each checkpoint. Implemented inside P43 runtime. | Mandatory overhead |
| P9 | AST truncation | Tree-sitter signature extraction. Function bodies stubbed. Lives inside P43 runtime or as pre-processor. | 30-50% input reduction |
| P11 | Inline syntax validation | biome check / tsc --noEmit post-edit, <2s timeout. Validates after P43 `edit()` calls. | 10-20% fewer error tokens |
| P12 | Post-edit validation hook | Integration of P11 into P43 executor lifecycle | Integration |
| P13 | Semantic code search (ck) | Hybrid BM25+embeddings. Exposed as `ck_search()` in P43 runtime. | Enables ck-based search |
| P15 | Gitingest skill | Bulk external repo ingestion. Exposed as `gitingest()` in P43 runtime. | Controlled external context |
| P15b | Pre-verification sandbox | Reuses P43's isolated-vm isolate. Compile/lint before presenting results. | 0 tokens (deterministic); ~200 on failure |

### Phase 16-19: Adversarial Verification (L4)

Critic runs as a separate pi process via **@tintinweb/pi-subagents** cross-extension RPC (ADR-016). True generator-evaluator separation. Custom agent type defined in `.pi/agents/critic.md`.

| ID | Deliverable | Description |
|----|-------------|-------------|
| P16 | Critic agent definition | `.pi/agents/critic.md` with `prompt_mode: replace` (clean context). Hard-threshold pass/fail criteria from sprint contract. |
| P17 | Sub-agent RPC integration | Harness spawns critic via `subagents:rpc:spawn`. Listens for `subagents:completed` for verdict. |
| P18 | Debate protocol | `DebateSession`, `Budget`, `Convergence` contracts (ADR-011). Multi-round via `steer_subagent` RPC. |
| P19 | iMAD gating (P2b implemented here) | Pre-debate hesitation classifier. Trigger multi-round debate only when needed. ~92% token savings. |
| P19b | Consensus-to-wiki filing | Every verdict → `wiki/consensus/`. L7 extension hooks enforce filing compliance. |

### Phase 20-24: Post-Verification (L5-L8)

| ID | Deliverable | Description |
|----|-------------|-------------|
| P20 | Final lint+format gate | Deterministic: `biome check --apply` + `tsc --noEmit` + `fallow audit`. 0 LLM tokens. <10s. ADR-013. |
| P21 | Observability + Keep Rate | Metric definitions. Keep Rate tracking (code survival over time). LLM-as-Judge satisfaction. |
| P22 | Persistent memory | Wiki vault read/write contract. Hot cache management. Lint schedule (every 10-15 writes). |
| P22b | Prompt renderer | Build-time compilation. Semantic spec (YAML) → per-model compiled JSON (GPT/Claude/Gemini). DIY pipeline: js-yaml + PromptWeaver (@iqai/prompt-weaver) + custom renderer plugins. |
| P23 | Schema orchestration | Archon workflow DAG. L7 enforces read-first/write-after contract. |
| P24 | Wiki query interface | 3-depth modes (quick/standard/deep). LLM-native search via claude-obsidian skills. |

### Phase 25-44: Cross-Cutting Capabilities

| ID | Deliverable | Description | Source |
|----|-------------|-------------|--------|
| P25 | Subagent specialization router | Dispatch by task type (plan/edit/debug). Fresh context per subagent. | Cursor |
| P26 | Package integration | Update package.json, README, PLAN.md | Internal |
| P27 | Context anxiety guard | Detect rushing/refusal as context fills. Proactive mitigation. | Cursor |
| P28 | Positive agent loop hooks | Re-invoke agent until DONE (tests pass, lint clean). Counterpart to drift monitor. | Cursor |
| P29 | Error classification | Per-tool per-model error types. Anomaly detection baselines. Auto-heal candidates. | Cursor |
| P30 | Browser subagent | browser-harness (9.4K stars, MIT) for thin CDP-based visual UI verification. Self-healing: agent writes missing helpers mid-execution. Replaces raw Puppeteer scripting. | Antigravity |
| P31 | Artifact generation | Human-reviewable deliverables: screenshots, recordings, test summaries. | Antigravity |
| P32 | Cross-project learning KB | Multi-project knowledge transfer. Tagged strategies queried across projects. | Antigravity |
| P33 | Lifecycle hook system | 30+ events. Exit-code semantics (0=allow, 2=deny). 5 hook types. | Claude Code |
| P34 | Structured compaction | Forked subagent. 5-layer compaction. ~85% reduction. Preserves file paths, errors, plan state. | Claude Code |
| P35 | Permission subsystem | 7 modes. ML auto-classifier. 4 scopes (Managed/User/Project/Local). Separate layer. | Claude Code |
| P36 | Session storage | Resume/Fork/Rewind. JSONL transcripts. Sidechain isolation. Checkpoint snapshots. | Claude Code |
| P37 | CLAUDE.md entrypoint | Additive config hierarchy. Conditional YAML frontmatter. 96% compliance. | Claude Code |
| P38 | OS-level sandbox | bubblewrap (Linux), Seatbelt (macOS). Technical enforcement boundaries. | Codex |
| P39 | Harness as MCP server | Expose L1-L8 stages as MCP tools. Agent-to-agent composition. | Codex |
| P40 | Skills ecosystem | $skill-creator, $skill-installer. agentskills.io standard. Plugin packaging. | Codex |
| P41 | Implicit memory | Chronicle-style screen capture. Background generation. Secret-redacted. | Codex |
| P42 | Scheduled automations | Cron-style harness runs: wiki lint, dep updates, test health, drift sweeps. | Codex |
| P44a | Fallow MCP tool registration | Register fallow MCP server in tool registry. Real-time codebase intelligence. | Fallow |
| P44b | Fallow pre-verification audit | `fallow audit --changed-since main` in P15b sandbox. Scoped pass/warn/fail. | Fallow |
| P44c | Fallow Phase 16 gate | `fallow audit --gate all` as post-L4 deterministic gate. Baseline support. | Fallow |
| P44d | Fallow L5 health snapshots | `fallow health --score` snapshots. Trend comparison. Keep Rate proxy. | Fallow |
| P44e | Fallow P29 error mapping | Map fallow JSON output to error classification taxonomy. `auto_fixable` flag. | Fallow |
| P44f | Fallow L6 baselines | Git-committed baseline files in `.fallow-baselines/`. Separate from gitignored cache. | Fallow |
| P44g | Fallow P42 automation | Cron-style fallow runs: weekly health sweeps, daily dead code, per-PR audits. | Fallow |

### Phase 45-48: Self-Evolving Infrastructure

These phases make the harness self-improving. They require all prior phases to be operational (need execution traces, error baselines, and Keep Rate data as training signals).

| ID | Deliverable | Description | Depends On |
|----|-------------|-------------|------------|
| P45 | Harness auto-optimization | Auto-tune token budgets per project type. Remove dead gates that never trigger. Learn optimal debate gating thresholds from pass/fail history. Re-weights subagent router by observed success rate per task type. Implements Cursor's 90-min RL loop pattern on our own accept/reject data. | P21, P25, P29 |
| P46 | Behaviour harness | Functional correctness verification beyond adversarial review. AI-generated test suite from hardened spec (ADR-008 compliant: tests from spec, never implementation). Mutation testing to verify test quality. Property-based testing (fast-check) for invariant validation. Fallow runtime hot-path coverage (optional paid layer) to weight tests by production usage. | P20, P21, P44d |
| P47 | Model profile auto-learning | Replace hand-coded model profiles (F0.4) with learned profiles from execution traces. Inputs: P29 per-tool per-model error baselines, P21 Keep Rate by model, P2b debate gating outcomes, L4 pass/fail rates. Output: auto-generated `.pi/harness/model-profiles.json` with learned provider-native configurations. Human review gate before promotion to production. | P21, P22b, P29 |
| P48 | Sandbox-as-infrastructure | Custom execution scheduler for parallel agent scenarios. Fast sandbox provisioning (<500ms cold start). Aggressive recycling of warm sandboxes. Resource limits per sandbox (CPU, memory, disk, network). Compatible with P38 OS-level sandbox (bubblewrap/Seatbelt). Enables multi-agent parallel execution within token budget. | P38, P43 |

---

## 7. Provider-Native Prompting (Phase P22b)

### 7.1 Architecture

```
BUILD TIME:  Base Spec (YAML) → Compiler → GPT.json + Claude.json + Gemini.json → npm package
RUNTIME:     Load {spec, model}.json → substitute runtime vars → send to LLM
```

### 7.2 Per-Model Rendering Rules

| Concern | OpenAI GPT | Anthropic Claude | Google Gemini |
|---------|-----------|-----------------|---------------|
| Structure | XML-like sections, flat | XML tags, nesting OK | Plain text |
| Constraint order | FIRST | Flexible (top) | LAST |
| Verification | Pre-flight/post-flight loop | Self-check at end | Split-step verify→generate |
| Thinking | reasoning_effort param | effort + adaptive | thinking level LOW/HIGH |
| Temperature | Unspecified | Removed from API | 1.0 mandatory |
| Cache | Auto prefix cache | Explicit cache_control | Explicit context cache |

### 7.3 Semantic Spec (Provider-Agnostic Internal Representation)

```yaml
spec:
  task: string
  constraints: string[]
  context: {files, wiki, git}
  output: {format, include_explanation}
  verification: {tests, checks}
  tools: string[]
  model: string
```

The spec is what gets versioned and audited. Prompts are ephemeral, generated at call time.

---

## 8. TypeScript Execution Layer (Phase P43)

### 8.1 Pattern

Replace flat tool calling (8-15 individual JSON tool definitions in context) with a single `write_ts` tool backed by a sandboxed TypeScript runtime.

### 8.2 Context Reduction

```
Traditional:  System prompt (500) + Tool defs (5,000) + History (2,000) + Tool calls (3,000/round)
TS Exec Layer: System prompt (400) + TS type defs (2,000) + Code (500) + Results (200)
→ ~3-4x reduction per turn
```

### 8.3 Architecture

- **Sandbox**: `isolated-vm` V8 isolate (ADR-014). Separate heap. No `require` unless granted. Cannot crash harness. Fallback: `node:vm` + P38 bubblewrap.
- All L3 tools (read, bash, edit, grep, find, ck_search, gitingest) exposed as typed TS host functions
- Agent writes TypeScript code orchestrating tools; runtime executes in isolated-vm
- Tool calls dispatch via typed host function registration (not Node.js module resolution)
- Permission subsystem (P35) gates all tool calls
- Type defs auto-generated from tool schemas via `src/harness/harness-ts-types.ts`
- Tool discovery API: `tools.discover({ query, limit })` — search by intent, not by schema
- ESBuild for type stripping before injection into isolate

### 8.4 Validated By

- **CodeAct** (Apple, ICML 2024): +20% success rate, -30% interaction turns
- **Cloudflare Code Mode**: Production TypeScript variant with Worker sandbox
- **Executor** (open-source, 1.3K stars): Local-first Node.js runtime

### 8.5 What We Do NOT Adopt

- Cloudflare Workers dependency (our sandbox: local isolated-vm)
- Python interpreter (our stack is TypeScript)
- Web UI for tool config (our harness is CLI-only)
- Deno subprocess (isolated-vm is faster, in-process, Node.js native)

---

## 9. Think-in-Code Enforcement (Phase P14) — ABSORBED BY P43

P14 is fully absorbed by P43 TypeScript Execution Layer. P43 IS think-in-code. The agent writes TypeScript to orchestrate tools instead of making individual tool calls. The three-layer enforcement (system prompt + PreToolUse + PostToolUse) is replaced by a single mechanism: all code runs in the isolated-vm sandbox. Efficiency gains realized through P43's 3-4x context reduction.

---

## 10. Token Budget

### 10.1 Per-Subtask Budget (All Enhancements Active)

| Layer / Phase | Tokens | Mechanism |
|---------------|--------|-----------|
| L1 Spec Hardening | ~2,000 | Mandatory read + hardening + selective debate (~20% trigger, +1,500 avg) |
| L2 Planning + Contracts | ~4,500 | Base plan + sprint contracts + selective debate (~20% trigger, +2,000 avg) |
| L2.5 Drift Monitor | ~0-300 | Rule-based: 0. LLM-based every 15 steps (Opus): ~500. Avg ~150. |
| Pre-Verification Sandbox (P15b) | ~0-200 | Deterministic: 0. LLM on failure: ~200. |
| L3 Execution (enhanced) | ~0 | Tool enhancements save tokens — not cost. See savings table below. |
| L4 Adversarial Verification | ~4,500 | Hard-threshold criteria + selective multi-round debate (~30% trigger 2+ rounds) |
| Phase 16 Lint+Format | ~0 | Deterministic tools. 0 LLM tokens. |
| L5 Observability | ~2,000 | Keep Rate tracking, LLM-as-Judge, error baselines |
| L6 Memory Writes | ~1,000 | Haiku for standard writes, Opus for deep synthesis |
| P30 Browser Subagent | ~0-500 | Deterministic screenshot + pixel diff unless vision analysis needed. Avg ~100. |
| P31 Artifact Generation | ~1,000 | Haiku for standard artifacts |
| L7+L8 Orchestration + Query | ~1,000 | Wiki bootstrapping amortized |
| **Total per subtask** | **~16,000-17,500** | |

### 10.2 Savings Mechanisms

| Mechanism | Savings | Source |
|-----------|---------|--------|
| AST truncation (P9) | 30-50% input tokens on code exploration | WOZCODE |
| Fuzzy edit matching (P10) | Eliminates 5-15% retry rounds | WOZCODE |
| Inline validation (P11) | 10-20% fewer error-recovery tokens | WOZCODE |
| Haiku model router (P25) | 15-25% cost reduction | WOZCODE |
| Selective debate routing (P2b) | 92% token savings on ~80% of debate-invoked tasks | iMAD (AAAI 2026) |
| Think-in-Code (P14) | 30-200× reduction on data analysis calls | Think-in-Code |
| TS Execution Layer (P43) | 3-4× context reduction on multi-tool workflows | CodeAct, CF Code Mode |
| Context drift pruning (P3-P7) | 5-10× reduction for stuck sessions | Drift detection |
| Structured compaction (P34) | ~85% context reduction | Claude Code |

### 10.3 5-Subtask Plan Comparison

| Scenario | Naive Baseline | With All Enhancements |
|----------|---------------|----------------------|
| Pipeline overhead | ~87,500 | ~75,000-80,000 |
| Coding tokens | variable | -25-55% (AST + fuzzy) |
| **Total 5-subtask** | **~87,500+** | **~55,000-65,000 + coding** |

---

## 11. Consensus & Alignment System

### 11.1 Selective Debate Routing (iMAD)

Not every task benefits from multi-agent debate. Pre-debate gating classifier:
- **High-confidence tasks**: Skip debate → 92% token savings
- **Ambiguous tasks**: Trigger debate with budget caps
- **Verdict types**: CONSENSUS_REACHED, DEADLOCK, BUDGET_EXHAUSTED, TIMEOUT

### 11.2 Consensus Filing Contract

- Every debate verdict → `wiki/consensus/[layer]-[topic-slug].md`
- DEADLOCK and BUDGET_EXHAUSTED verdicts also file — records what could NOT be resolved
- Future agents query `wiki/consensus/` before forming positions
- Contradicting a filed consensus → harness blocks and surfaces conflict
- L7 extension hooks enforce filing compliance

### 11.3 ADR Governance

Existing architecture decisions:
- **ADR-008**: Spec-Only Black-Box QA (tests from spec, never implementation)
- **ADR-009**: claude-obsidian Mode B (LLM-native search, no Vectra/embeddings)
- **ADR-010**: Wiki Tight-Coupling (every layer reads wiki first, writes wiki after)
- **ADR-011**: Consensus Debate with Selective Routing (iMAD gating)

---

## 12. Integration with Existing PI System

### 12.1 Integration Model (ADR-012, ADR-017)

**Extension-based. No fork.** A single `harness-event-bus` extension (`.pi/extensions/harness-event-bus.ts`) layers rich lifecycle hooks on top of pi's 5 native events. Harness logic lives in `src/harness/` as pure TypeScript, testable without pi runtime.

**Event mapping**:

| Pi Native Event | Harness Hooks Fired |
|----------------|---------------------|
| `before_agent_start` | `before_llm_call`, spec_gate, plan_gate, drift_correction, L4_gate, anxiety_guard |
| `tool_result` | `after_tool_call`, `after_edit`, `after_read`, `after_bash`, drift_pattern_detect, phase_transition |
| `session_start` | session_init, wiki_bootstrap, spec_load, hot_cache_inject |
| `session_compact` | context_compacted, harness_state_reinject |
| `session_shutdown` | session_teardown, consensus_flush, keep_rate_sample |

### 12.2 Activation (ADR-021)

**Explicit `/harness "task"` command.** Normal chat bypasses pipeline entirely. Flags: `--no-verify`, `--plan-only`, `--skip-lint`, `--model`.

### 12.3 What Stays

- **`.pi/skills/`**: Progressive disclosure system (already validated by Codex, Claude Code, Antigravity, Gemini CLI)
- **lean-ctx**: 48 MCP tools, AST compression, shell patterns (adopted natively)
- **Obsidian wiki**: Persistent memory layer (L6)
- **ctx_knowledge**: Cross-session memory (S component of H-formalism)
- **ctx_session**: Session continuity (state persistence)
- **MCP ecosystem**: Tool protocol for external integrations

### 12.4 What Changes

- **Tool calling**: Flat tool list → TypeScript execution layer with isolated-vm sandbox (P43)
- **Prompt generation**: Single format → provider-native rendering (P22b, deferred)
- **Execution flow**: Ad-hoc → mandatory 8-layer pipeline (explicitly activated)
- **Quality enforcement**: Best-effort → adversarial verification + deterministic gates (biome + tsc)
- **Drift handling**: None → 7-pattern detection + turn-dependent thresholds + escalation

### 12.5 New Dependencies

| Dependency | Purpose | License |
|------------|---------|---------|
| @tintinweb/pi-subagents | Sub-agent infrastructure (L4 critic, P25 router, P30 browser) | MIT |
| isolated-vm | P43 sandbox (V8 isolate). Fallback: node:vm + P38 bubblewrap. | ISC |
| ck (semantic code search) | Hybrid BM25+embeddings search | Open source |
| Gitingest | Bulk repo ingestion | Open source |
| Fallow | Codebase intelligence (P44) | MIT |
| js-yaml + PromptWeaver (@iqai/prompt-weaver) | Build-time prompt compilation (P22b, deferred) — DIY pipeline | MIT (both) |

---

## 13. Independent Validations

The harness architecture is validated by 6 independent production systems:

### 13.1 Cursor.sh (21 Phases Validated)

$1B ARR, 400M+ daily requests. Validated: model-adaptive, dynamic context, context anxiety guard, self-evolving harness, fuzzy edit matching, pre-verification isolation, positive loops, error classification, subagent specialization, Keep Rate tracking.

### 13.2 Codex / OpenAI (12 Phases Validated)

79.2K GitHub stars, Apache 2.0. Validated: model-adaptive, skills system, lifecycle hooks, subagent specialization, pre-verification isolation, persistent memory, subagent worktree isolation, sandbox tiers, MCP server mode, implicit memory.

### 13.3 Claude Code / Anthropic (9 Phases Validated)

82K+ GitHub stars, 510K-line TypeScript. Validated: FP #1 (harness > model), model-adaptive, skills system, lifecycle hooks, structured compaction, permission subsystem, session storage, CLAUDE.md entrypoint, subagent worktree isolation.

### 13.4 Google Antigravity (7 Phases Validated)

$2.4B Windsurf acquisition. Validated: model-adaptive, pre-verification isolation, subagent specialization, self-evolving harness, skills system, adversarial verification, browser subagent, artifact generation.

### 13.5 Gemini CLI (7 Integration Priorities Derived)

103K GitHub stars, 6,005 commits. 15 SOTA innovations mapped to 7 integration priorities via first-principles filtering.

### 13.6 Fallow (7 Integration Points Validated)

1.7K stars, MIT, Rust-native TS/JS intelligence. Validated: deterministic quality gate, pre-verification scoped audit, MCP agent tool, health scoring, error classification mapping, baseline storage, scheduled automation.

---

## 14. Risk Analysis & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Complexity overload**: 48+ phases too many to implement | High | Medium | Phase in stages. Foundation (F0-P2) first. Ship working subsets. Each group independently valuable. |
| **Token budget overshoot**: Expected savings don't materialize | Medium | Medium | Per-phase token measurement. Kill switches for any phase that costs > saves. |
| **Model regressions**: New model versions break prompt renderers | High | High | Build-time prompt compilation + deterministic builds. Hash-verified. |
| **Sandbox escapes**: TS execution layer has security gaps | Critical | Low | Inner: isolated-vm V8 isolate (ADR-014). Outer: P38 bubblewrap/Seatbelt. Defense in depth. |
| **Drift monitor false positives**: Nudges interrupt productive work | Medium | Low | Turn-dependent thresholds (ADR-022). No limit turns 1-8. User override. Escalation requires confirmation before restart. |
| **Wiki staleness**: Knowledge base out of sync with codebase | Medium | High | Lint schedule (every 10-15 writes). Cross-reference integrity checks. |
| **Fork safety**: Specs leak between forks | Medium | Low | GitHub Issues storage (ADR-025). Specs tied to repo. No local cache. No leak vector. |
| **Consensus overuse**: Too many debates burn tokens | Low | Medium | iMAD gating: 92% token savings on ~80% of tasks. Hard budget caps. |
| **GitHub dependency**: Spec storage fails offline | Medium | Medium | Harness fails clearly, not silently. Clear error message. Acceptable for CLI tool used by developers with connectivity. |
| **Pi API changes**: New pi versions break harness extension | Low | Low | Extension uses 5 stable pi events. If api changes, only `harness-event-bus.ts` needs update. Harness logic in `src/harness/` is pi-agnostic. |

---

## 15. Success Metrics

### 15.1 Primary Metric: Keep Rate

**Definition**: Fraction of agent-generated code still in the codebase after 1 day, 1 week, 1 month.

| Time Interval | Target | Current (Estimated) |
|---------------|--------|---------------------|
| 1 day | >90% | Unknown |
| 1 week | >80% | Unknown |
| 1 month | >70% | Unknown |

### 15.2 Secondary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Token overhead per subtask | <17,500 | Harness instrumentation |
| Context reduction (P43 active) | >3× vs flat tool calling | A/B per-task measurement |
| Drift detection recall | >95% (rule-based), >80% (LLM-based) | Stuck session flagging |
| Adversarial pass rate (first attempt) | >70% | Per-task gate logs |
| Consensus debate token savings | >85% vs always-debate | iMAD gating logs |
| Consensus filing compliance | 100% | L7 hook enforcement |
| Fallow gate pass rate (Phase 16) | >95% (warn+pass) | Audit logs |
| Health score trend | Non-decreasing per PR | `fallow health --trend` |

### 15.3 Anti-Goals (What We Explicitly Do NOT Measure)

- Benchmark scores (SWE-bench, TermBench) — Keep Rate is the real metric
- Response speed / latency — correctness over speed
- Model-specific scores — harness is model-agnostic by design

---

## 16. Implementation Strategy

### 16.1 Phase Grouping (Pipeline-First Build Order — ADR-015)

P43 deferred to Group 4. Validate quality gates (L1/L2/L2.5/L4) before investing in execution layer.

| Group | Phases | Effort Estimate | Rationale |
|-------|--------|-----------------|-----------|
| **Group 1: Foundation + L1/L2** | F0.1-F0.5, P1.1-P1.5, P2.1-P2.3 | ~2 weeks | Spec hardening + planning + event bus + harness-setup. Blocks all downstream layers. |
| **Group 2: L2.5 Drift Monitor** | P3, P4, P5, P6, P7 | ~2 weeks | 7 rule-based patterns + turn-dependent thresholds. Works with pi's existing flat tools. Protects token budget. |
| **Group 3: L4 Adversarial** | P16, P17, P18, P19, P19b | ~3 weeks | Critic sub-agent via @tintinweb/pi-subagents. iMAD gating. Consensus filing. Verification backbone. |
| **Group 4: P43 TS Execution Layer + L3 survivors** | P43, P43b, P43c, P8, P9, P11, P12, P13, P15, P15b | ~4 weeks | Single biggest context reduction (3-4x). isolated-vm sandbox. L3 checkpoints integrated. |
| **Group 5: Post-Verification** | P20, P21, P22, P23, P24 | ~2 weeks | Biome+tsc gate. Keep Rate tracking. Memory persistence. Wiki query. |
| **Group 6: Prompt Renderer** | P22b | ~1 week | Build-time provider-native prompt compilation. js-yaml + PromptWeaver. |
| **Group 7: Cross-Cutting** | P25, P27, P28, P29 | ~2 weeks | Subagent router + anxiety guard + positive loops + error classification. |
| **Group 8: Advanced Subsystems** | P30, P31, P32, P33-P37, P38-P42, P44a-g | ~10-14 weeks | Browser, artifacts, hooks, compaction, permissions, sandbox, Fallow. Can parallelize. |
| **Group 9: Self-Evolving Infrastructure** | P45, P46, P47, P48 | ~6-8 weeks | Auto-optimization, behaviour harness, auto-learning, sandbox infra. |

**Total (All Phases)**: ~32-38 weeks. Heavily parallelizable from Group 3 onward.

### 16.2 Incremental Delivery

Each group ships independently and adds value:
1. **After Group 1**: `/harness` command works. Specs hardened, plans structured, event bus active. harness-setup bootstraps project.
2. **After Group 2**: Agent stuckness auto-detected and corrected. 7 drift patterns monitored. Turn-dependent thresholds prevent false positives.
3. **After Group 3**: Every change passes critic sub-agent attack. Consensus debates filed. Quality gate proven.
4. **After Group 4**: 3-4x context reduction on all tool workflows. Single `write_ts` tool replaces flat tools.
5. **After Group 5**: Keep Rate tracked. Memory persists. Pipeline orchestrated.
6. **After Group 6**: Per-model native prompts. Build-time deterministic.
7. **After Group 7**: Subagents specialized. Context anxiety managed. Errors classified.
8. **After Group 8**: Full SOTA harness feature set.
9. **After Group 9**: Harness self-evolves. Budgets auto-tuned. Model profiles learned from traces.

### 16.3 What NOT to Build (Deliberate Non-Adoptions)

| Feature | Source | Reason |
|---------|--------|--------|
| 1M token context window | Antigravity | Too expensive ($249.99/mo). Selective context is our advantage. |
| Full IDE integration | Antigravity, Cursor | CLI harness. Extensions/hooks only. |
| Cloudflare Workers dependency | Cloudflare Code Mode | Vendor lock-in. Local isolated-vm sandbox. |
| Python interpreter | CodeAct | TypeScript stack. Paradigm validated; language choice follows stack. |
| Google Cloud lock-in | Antigravity | Platform-agnostic. |
| Rust rewrite | Codex | TypeScript chosen for iteration speed. Rust core evaluated as P48 dependency but harness logic stays TypeScript. |
| Multi-surface App Server | Codex | Overengineered for CLI harness. |
| Automatic-only memory | Codex | Explicit wiki-based knowledge serves team alignment. Implicit memory is complementary (P41). |
| 9,000+ plugin ecosystem | Claude Code | Network-effect problem. Skills system sufficient for CLI. |
| Web UI for tool config | Executor | CLI-only. Config via `.pi/harness/config.json`. |
| Fallow Runtime (paid layer) | Fallow | Free static layer sufficient. P46 may optionally use Runtime. Deferred to P46 design review. |
| Pi fork / upstream PRs | ADR-012 | Extension-based integration. No pi changes needed. |
| ESLint + Prettier | ADR-013 | Biome already configured in project. tsc covers type-aware gap. |
| Deno subprocess | ADR-014 | isolated-vm is faster, in-process, Node.js native. |
| Dual-tier spec storage | ADR-025 | GitHub Issues only. No local cache. |
| iMAD in Group 1 | ADR-015 | Deferred to Group 3. Not needed until L4 debate exists. |

---

## 17. File Structure (Target — ADR-017)

**Architecture**: `src/harness/` (pure TypeScript library) + `.pi/extensions/harness-event-bus.ts` (pi wiring).

```
src/harness/                    # Pure TypeScript. No pi imports. Testable without pi runtime.
  types.ts                      # All harness types (Spec, Plan, DriftEvent, CriticVerdict, Config)
  config.ts                     # Load .pi/harness/config.json, merge with code defaults (ADR-018)
  events.ts                     # Typed harness event bus (wraps pi.events)
  l1-spec.ts                    # L1: Spec hardening, ambiguity detector, spec hash, harness_ask
  l2-planner.ts                 # L2: YAML plan generator, sprint contracts, plan injection
  l2.5-drift.ts                 # L2.5: 7-pattern drift detection, escalation ladder, ck routing
  l3-executor.ts                # L3: Grounding checkpoint management (Group 4, P43 runtime)
  l4-critics.ts                 # L4: Critic sub-agent manager (pi-subagents RPC)
  p43-ts-exec.ts                # P43: TypeScript execution layer (isolated-vm runtime)
  p43-types.ts                  # P43: Auto-generated tool type definitions
  renderers/
    openai.ts                   # P22b: OpenAI native prompt renderer (Group 6)
    anthropic.ts                # P22b: Anthropic native prompt renderer
    google.ts                   # P22b: Google native prompt renderer
  index.ts                      # Re-export all

.pi/
  extensions/
    harness-event-bus.ts        # Pi extension: wires src/harness/ to pi hooks (ADR-012)
    dotenv-loader.ts            # Existing (unchanged)
    wiki-hooks.ts               # Existing (unchanged)
  harness/
    config.json                 # Single config file (ADR-018). Project-local. No cascade.
    plans/                      # L2 plan YAML files (<spec-hash>.yaml)
    critics/                    # L4 critic temp files (prompts, diffs)
  agents/
    critic.md                   # L4 critic agent definition (ADR-016)
  skills/
    gitingest/SKILL.md          # Bulk external repo ingestion
    fallow/SKILL.md             # Fallow agent skill

.github/
  ISSUE_TEMPLATE/
    harness-spec.yml            # GitHub Issue template for harness specs (ADR-025)

.fallow-baselines/              # Git-committed Fallow baselines
  dead-code.json
  health.json
  dupes.json

scripts/
  compile-prompts.ts            # P22b: Build-time prompt compiler

wiki/consensus/                 # All debate verdicts filed here (ADR-011)
wiki/decisions/                 # ADRs (ADR-008 through ADR-025)
wiki/concepts/                  # All harness concepts
```

---

## 18. Resolved Questions

All 10 original PRD questions resolved. 11 additional decisions made during grilling session (2026-05-02). 21 total decisions documented as ADRs (008-025).

| # | Question | Resolution | Rationale |
|---|----------|------------|-----------|
| Q1 | Empirical CoIR benchmark: does ck + our embedding setup provide sufficient retrieval quality? | **USE BGE-code-v1 as embedding model.** MiniLM-L6-v2 is 78.1% top-5; BGE-code-v1 is 86.2% on CoIR benchmark. Combine with AST-aware chunking (cAST paper, +4.3 Recall@5) and hybrid BM25+embeddings search (RRF fusion). Upgrade path: if retrieval quality drops below 80% Recall@5 in production, evaluate proprietary Voyage-code-3. | CoIR benchmark data. AST chunking validated by cAST paper and Vectara NAACL 2025. |
| Q2 | Agentic search vs embeddings-based search (P13). Which is better? | **SHIP BOTH. Embeddings primary, agentic fallback.** ck hybrid search (P13) as primary retrieval. If embeddings return empty or low-confidence results (<0.7 RRF score), agent falls back to Glob→Grep→Read pattern. Aligns with Claude Code's finding that "agentic search generally works better" for edge cases while embeddings dominate for structured codebase queries. | Hybrid approach avoids either/or trap. Claude Code pattern validated at production scale. |
| Q3 | Pipeline model vs loop model. Hybrid approach? | **HYBRID. Pipeline for quality gates (L1, L2, L4, P16), loop for task execution (L3).** Quality enforcement is serial and mandatory — no skip rule. Task execution within L3 uses loop-orchestrator: agent iterates until grounding checkpoint passes. L7 orchestration evolves from fixed DAG to loop-orchestrator pattern. Implemented in Group 5 (P23). | Neither model alone is sufficient. Pipeline for quality; loop for productivity. |
| Q4 | tRPC adoption rate vs REST. Does it matter for our harness? | **IRRELEVANT. Question dropped.** Our harness is a CLI-native agent pipeline, not an API server. No HTTP endpoints to type-check. tRPC's compile-time type safety is valuable for API servers but has zero bearing on agent tool interfaces. | Scope mismatch. Harness is internal agent infrastructure. |
| Q5 | Biome vs ESLint+Prettier for Phase 16 gate? | **OVERRULED BY ADR-013. Use Biome + tsc.** Project already uses Biome 2.0.6. `biome check --apply` + `tsc --noEmit` + `fallow audit` as 3-step deterministic gate. No ESLint or Prettier dependencies. | Biome already configured in project. tsc covers type-aware gap. ADR-013. |
| Q6 | Oxc vs SWC vs ESBuild for P43 type stripping? | **ESBuild for P43 type stripping.** Fastest in class (10-100x faster than tsc). Already in our ecosystem via tsx runtime. Mature, stable, well-maintained. Oxc is promising (Rust-native, faster parser) but not yet stable for production type generation pipeline. SWC is viable but slower than ESBuild for this use case. | ESBuild chosen for maturity + speed + existing ecosystem integration. Oxc tracked for future migration. |
| Q7 | Fallow Runtime (paid layer) worth the cost? | **NOT adopt now. Re-evaluate after 3 months of Keep Rate data.** Free static Fallow layer already provides dead code, duplication, complexity, and boundary detection — the four highest-signal codebase health indicators. Runtime V8 coverage adds hot/cold path detection, which is valuable for P46 Behaviour Harness (weight tests by production usage). If Keep Rate alone provides sufficient signal, skip Runtime. If Keep Rate is too noisy, invest in Runtime as P46 dependency. Decision deferred to P46 design review. | Keep Rate is primary metric (FP #10). Runtime is optional signal amplifier. Don't pay for unproven need. |
| Q8 | Cross-project learning KB (P32) — how to prevent strategy transfer errors? | **Explicit human approval gate + domain hash matching.** Every cross-project strategy transfer requires: (1) domain hash match (project type, framework, language must match within edit distance threshold), (2) human approval before application, (3) transfer audit log with source project + strategy + outcome. Never auto-apply without confirmation. Strategies tagged with project metadata at save time. Transfer suggestions surfaced as proposals, not applied. | Safety-first design. Cross-project learning is powerful but dangerous. Human-in-the-loop for all transfers. |
| Q9 | Implicit memory (P41) privacy implications? | **Opt-in per project. Local-only. Secret-redacted. User-controlled frequency.** P41 ships with: (1) opt-in flag in `.pi/harness/implicit-memory.json` — off by default, (2) `detect-secrets` pre-filter strips API keys, tokens, passwords before storage, (3) all captures stored in gitignored `.pi/harness/captures/` directory — never leaves machine, (4) user configures capture frequency (every N turns, on specific hooks, or manual trigger only), (5) capture retention policy: auto-delete after 30 days unless pinned. Chronicle-style screen context is valuable but must never become a privacy liability. | Privacy-first. Codex's Chronicle validated the pattern; our implementation adds mandatory privacy controls. |
| Q10 | Prompt renderer (P22b) — what tech stack? | **DIY build pipeline.** CORRECTION: "PromptKit PackC" (previously cited) does NOT exist — it was an LLM hallucination. No mature off-the-shelf npm package exists for build-time prompt compilation. The architecture IS valid. Implementation: `js-yaml` (parse YAML specs) + `@iqai/prompt-weaver` (Handlebars template engine + Zod validation, MIT, active Dec 2025) + custom per-model renderer plugins (GPT/Claude/Gemini). Microsoft prompt-engine (2.8K stars, MIT) validated the YAML→prompt pattern but is abandoned (2022). Build pipeline runs at `npm run compile-prompts`, outputs `dist/prompts/{model}/*.json`. Runtime: `JSON.parse` + string replace — zero template engine shipped. | Architecture valid. DIY correct. No mature off-the-shelf package exists. |
| Q11 | Integration model: fork pi or extension-based? | **Extension-based harness event bus (ADR-012).** Single extension layers rich hooks on top of pi's 5 native events. No fork. No process wrapping. ~95% compliance via directive prompting. | ADR-012. Pi philosophy: "Build your own with extensions." |
| Q12 | P43 sandbox: Node.js VM, Deno, or isolated-vm? | **isolated-vm (ADR-014).** V8 isolate with separate heap. No `require` unless granted. 7K+ stars, used by Fly.io/Netlify. Fallback: node:vm + P38 bubblewrap. | ADR-014. Security over convenience. |
| Q13 | Build order: P43-first or pipeline-first? | **Pipeline-first (ADR-015).** Group 1: Foundation+L1+L2 → Group 2: L2.5 Drift → Group 3: L4 Adversarial → Group 4: P43+L3. Validate gates before big P43 investment. | ADR-015. Risk reduction. P43 is hardest single phase. |
| Q14 | Sub-agent infrastructure for L4 critic? | **@tintinweb/pi-subagents (ADR-016).** Cross-extension RPC. Custom `.pi/agents/critic.md` with `prompt_mode: replace`. True generator-evaluator separation. | ADR-016. Event bus + RPC essential for harness integration. |
| Q15 | Harness project structure? | **src/harness/ library + .pi/extensions/harness-event-bus.ts wiring (ADR-017).** Pure TypeScript harness logic. Thin pi integration layer. Testable without pi runtime. | ADR-017. Separation of concerns. |
| Q16 | Config: multiple files or single? | **Single .pi/harness/config.json (ADR-018).** Project-local. No cascade. All defaults in code. | ADR-018. Simple. One file. |
| Q17 | L1 user Q&A mechanism? | **harness_ask tool (ADR-019).** Structured questions via pi TUI. LLM calls the tool. Fallback: system prompt injection. | ADR-019. Structured over conversational. |
| Q18 | Activation: auto-detect or explicit command? | **Explicit /harness command (ADR-021).** Normal chat bypasses pipeline. Flags: --no-verify, --plan-only. | ADR-021. User controls pipeline activation. |
| Q19 | Drift monitor: pattern definitions and thresholds? | **7 patterns with turn-dependent thresholds (ADR-022).** Silence/batching: no limit turns 1-8, 12 reads turns 9-15, 6 reads turns 16+. ck routing for semantic searches. Escalation ladder: soft→strong→restart. | ADR-022. Turn-dependent prevents false positives during exploration. |
| Q20 | Spec storage: local or GitHub Issues? | **GitHub Issues only (ADR-025).** No local cache. Network-dependent. Fail-fast if GitHub unreachable. `.github/ISSUE_TEMPLATE/harness-spec.yml`. | ADR-025. Single source of truth. |
| Q21 | One-time setup? | **/harness-setup command (ADR-025).** Installs pi-subagents, creates wiki vault, creates GitHub issue template, creates config, verifies tooling. Interactive checklist. | ADR-025. Bootstrap in one command. |

---

## 19. References

### Core Architecture
- Meng et al. (2026) — "Agent Harness Survey" — 110+ papers, 23 systems, H-formalism
- Anthropic (2026) — "Harness Design" — GAN-inspired generator-evaluator architecture
- Böckeler (2026, Martin Fowler) — "Harness Engineering" — Feedforward/feedback controls

### Production Validations
- Cursor.sh — $1B ARR, 400M+ daily requests — 7 sources analyzed
- Codex / OpenAI — 79.2K stars, Apache 2.0, Rust — full architecture analysis
- Claude Code / Anthropic — 82K+ stars, 510K-line TypeScript — 4 primary sources
- Google Antigravity — $2.4B Windsurf acquisition — 3 sources analyzed
- Gemini CLI — 103K stars, 6,005 commits — 8 sources analyzed

### Tool-Specific
- CodeAct (Apple, ICML 2024) — +20% success, -30% turns
- Cloudflare Code Mode — Production TS execution layer
- Executor (RhysSullivan) — 1.3K stars, local-first TS runtime
- isolated-vm — V8 isolate sandbox for P43. 7K+ stars, ISC. Used by Fly.io, Netlify.
- @tintinweb/pi-subagents (v0.6.3, MIT) — Sub-agent infrastructure for L4 critic. Cross-extension RPC.
- Fallow (fallow-rs) — 1.7K stars, MIT, Rust-native codebase intelligence
- WOZCODE — Token reduction architecture (25-55% savings)
- iMAD (Fan et al., AAAI 2026) — Selective debate routing, 92% savings
- PromptWeaver (@iqai/prompt-weaver) — Handlebars template compilation + Zod validation for prompts
- Microsoft prompt-engine — YAML-based prompt management (validates pattern, abandoned 2022)
- browser-harness (9.4K stars, MIT) — Thin CDP harness for LLM browser control (replaces Puppeteer)

### Prompt Architecture
- OpenAI Prompt Engineering Guide (official)
- Anthropic Prompt Engineering Guide (official)
- Google Gemini 3 Prompting Guide (official, Vertex AI)

### Full Wiki
All source pages, concept pages, research syntheses, and entity pages available in `wiki/`. See `wiki/index.md` for complete catalog. See `wiki/hot.md` for current context.
