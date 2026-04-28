# ADR-002: Agent-Native 7-Layer Engineering Harness

## Context
PLAN.md describes the 7-layer architecture at principle level. The harness needs a concrete implementation plan mapped to the pi.dev extension substrate and Archon's workflow engine.

The 7 layers (intake/spec hardening, structured planning, MVC execution + grounding, adversarial verification, observability, persistent memory, schema orchestration) have no implementation yet.

## Decision
Implement the 7-layer harness as a **mandatory, always-on pipeline** — not an opt-in collection of toggles. Every layer runs in sequence for every task. The pipeline is coherent by design: each layer's output is the next layer's input, and skipping any layer breaks the chain.

### Architecture: pi.dev extensions + Archon workflows

**pi.dev extensions** implement the intelligence layers (spec hardening, planning, critic review, observability, memory). These need programmatic logic: ambiguity gates, DAG validation, drift detection, adversarial prompts, schema validation. Extensions are the right substrate for this.

**Archon workflows** implement the orchestration and sequencing. Archon provides: YAML-defined workflow DAGs, loop nodes (iterate until done), human approval gates, git worktree isolation per run, persistent state, and multi-platform invocation (CLI, web, Slack, Telegram, GitHub). This replaces Layer 7's custom orchestration code with a battle-tested workflow engine.

The harness defines an Archon workflow YAML (`harness-pipeline.yaml`) that invokes the pi.dev extension tools in the correct sequence. Archon handles the DAG execution, isolation, and persistence. pi.dev extensions handle the AI intelligence at each step.

### Key design choices

1. **Mandatory pipeline.** No per-layer `enabled` flags. The 7-layer pipeline always runs. Tunable parameters (critic focus areas, grounding interval, memory backend) exist, but every layer participates in every task. Rationale: verification is mandatory; agent confidence is not evidence. Opting out of critics or grounding defeats the purpose.

2. **Extension-per-layer + shared lib layer.** Each layer is a pi.dev extension (`extensions/harness-<layer>.ts`) with its own event handlers and commands. Shared schemas and utilities live in `lib/harness-*.ts`. This matches the existing `auto-commit-orchestrator.ts` + `auto-commit-core.ts` pattern.

3. **Archon as the workflow engine (Layer 7).** Archon's YAML workflow DAG replaces custom orchestration code. The harness pipeline is defined as an Archon workflow that invokes extension tools in sequence. Benefits: worktree isolation, human approval gates, loop nodes for rework cycles, multi-platform invocation, persistent run history. No need to reimplement DAG execution, parallel dispatch, or state management.

4. **JSON-schema data contracts between layers.** Each layer publishes outputs as validated JSON schemas. No layer may consume another layer's output without schema validation. This enforces Layer 7's schema-based principle at the implementation level from day one.

5. **AI critic agents use `completeSimple` with adversarial system prompts.** Same `pi-ai` path as auto-commit's AI commit message generation, but with prompts engineered for attack-mode review, not collaborative suggestion.

6. **Memory layer uses JSONL append-only file + in-memory index (ADR-003).** No native modules. Zero dependencies. JSONL is crash-safe (truncated line = skip, never corrupt DB). In-memory indexes provide O(k) tag/text queries for ≤10k entries. Index snapshot (`index.json`) makes cold start fast.

7. **Grounding checkpoints implemented as tool-call interception.** At each subtask boundary, a grounding hook re-reads the hardened spec from memory, compares current plan state, and aborts/replans on drift detection.

8. **No opinionated design-skill coupling.** Per PLAN.md scope guard: the harness core is extensible but does not bake in prescriptive design skills. Skills can hook into layer events, but the harness does not depend on specific skills.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| All 7 layers in a single Archon workflow YAML | AI reasoning (spec hardening, critic review, planning) needs programmatic logic, not just prompts. The YAML would be 90% AI prompt nodes with embedded JSON schema validation — unmaintainable. |
| All 7 layers as pure pi.dev extensions (no Archon) | Reinvents DAG execution, worktree isolation, human approval gates, run persistence, and multi-platform invocation. Archon already does this well. |
| Per-layer enabled/disabled toggles | Violates the principle that verification is mandatory. Creates incoherent states (critics disabled = unverified code ships). Every layer is always on; only behavior within layers is configurable. |
| External orchestrator service (separate process) | Adds deployment complexity; Archon + pi.dev extensions already cover orchestration and intelligence. |
| Vector DB for memory (Chroma, Qdrant) | Overkill for single-workstation agent; in-memory index sufficient for ≤10k entries |
| LangGraph / CrewAI / AutoGen for orchestration | Agent framework dependency; Archon is purpose-built for AI coding workflows and handles DAG + loop + isolation already. |

## Consequences
- 6 pi.dev extension files + shared lib layer + 1 Archon workflow YAML = implementation scope
- Pipeline is always-on; users cannot skip critics or grounding without modifying the workflow definition
- Archon adds a runtime dependency (Bun + `archon` CLI) but provides worktree isolation, run history, and multi-platform invocation
- Each layer independently testable via `/harness-<layer>-status` commands
- Memory layer creates `.pi/harness/` directory tree in project root
- Harness config becomes tuning-only (no enable/disable), reducing misconfiguration risk
- Grounding checkpoints add latency per subtask (acceptable: correctness > speed)