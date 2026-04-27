# Plan

## Harness execution model improvements
1. Make harness mimic enterprise software engineering team execution.
2. Require project wiki creation at project start.
3. Require every design decision to be documented in wiki with rationale.
4. Before code changes, require referencing relevant wiki design decisions/guidelines to maintain continuity.
5. Reference https://handbook.gitlab.com/handbook/engineering/ while building the harness architecture.
6. Add inter-agent communication loop (not only sub-agent spawning): allow agents to ask peer agents for bug hypotheses, run bounded debate rounds, and stop on consensus or budget exhaustion.
7. Make all written context (wiki actions, todos, plans) easily queryable via natural language by adding an indexing layer over these documents backed by a vector DB.
8. Keep harness deliberately extensible while avoiding opinionated design-skill coupling: build compounding context-layer software, but do not bake in prescriptive design skills (e.g., impeccable.style).
9. Integrate https://github.com/coleam00/Archon as the workflow engine for the 7-layer harness pipeline.

## Contemplated engineering principles for agent-optimized software development frameworks
- Reference source synthesis: GitLab, Google, Amazon, PSF/open-source, Netflix, Microsoft engineering philosophies.
- Core transferable values: think before coding, small changes, rigorous testing, independent verification, incremental shipping, observability, continuous learning.
- Translation rule: keep values, replace human-centric mechanisms with agent-native mechanisms.

### Agent-native harness architecture (mandatory, always-on pipeline)

> **Implementation plan:** `wiki/harness-implementation-plan.md`
> **Design decision:** `wiki/decisions/002-agentic-harness-7-layers.md`
> **Layer-by-layer reference:** `wiki/layers/` (01–07)

The pipeline is mandatory and coherent. Every task flows through all 7 layers. No layer can be skipped or disabled. Config tunes behavior within layers only.

1. **Intake + specification hardening** (mandatory)
   - Structured spec schema with success criteria, anti-criteria, ambiguity flags, testable definition of done.
   - Ambiguity gate blocks execution until underspecified requirements are resolved.
   - No code is written with unresolved blocking ambiguities.

2. **Structured planning** (mandatory)
   - Machine-readable execution plan with task DAG, dependency contracts, risk surface, verification method per subtask.
   - Adversarial plan review always runs. Human approval optional but critic review is non-bypassable.
   - No code is written without an approved plan.

3. **MVC execution + grounding checkpoints** (mandatory)
   - Every unit of work is the smallest independently verifiable change.
   - Grounding checkpoints before and after each subtask: re-read original spec, detect drift, abort if spec changed.
   - Every intermediate state is committed and recoverable.

4. **Adversarial verification** (mandatory)
   - Critic agents attack solutions. No cooperative review.
   - Multiple independent critics with specialized focus areas (correctness, security, performance, spec compliance).
   - A single critical-severity failure blocks the subtask. No override without rework.

5. **Observability as definition-of-done** (mandatory)
   - Metrics/instrumentation defined and wired during implementation, not after.
   - Component not considered complete until observability is in place.
   - Operability signals validated before completion.

6. **Persistent structured memory + pattern libraries** (mandatory)
   - Success patterns, failure patterns, decision rationale, codebase evolution graph stored for retrieval.
   - System improves via context enrichment, not assumed session memory.
   - Failure patterns never evicted — they compound most.

7. **Schema-based orchestration via Archon** (mandatory)
   - Archon YAML workflow DAG routes work via typed schemas and declared capabilities.
   - Worktree isolation per run, human approval gates, rework loops, persistent run history.
   - Multi-platform invocation (CLI, Web UI, Slack, Telegram, GitHub).
   - pi.dev extensions handle intelligence; Archon handles orchestration.

### Architecture: pi.dev extensions + Archon

```
pi.dev extensions → implement Layers 1-6 (spec hardening, planning, execution,
  grounding, critics, observability, memory). Programmatic logic + AI calls.

Archon workflow YAML → implements Layer 7 (orchestration). DAG execution,
  loop nodes, approval gates, worktree isolation, run persistence.

Archon workflow nodes invoke pi.dev extension tools in sequence.
The pipeline is defined in .archon/workflows/harness-pipeline.yaml.
```

### Guardrails for applying enterprise principles to agent systems
- Do not copy human process overhead (standups/sprint rituals/social coordination) unless it adds measurable agent-quality benefit.
- Treat verification as mandatory and non-overrideable; agent confidence is not evidence.
- Add explicit anti-hallucination and context-grounding controls at each major transition.
- No per-layer enable/disable — the pipeline is coherent or it isn't.

## Tracking note
- Implementation plan for all 7 layers: `wiki/harness-implementation-plan.md`
- Design decision ADR-002: `wiki/decisions/002-agentic-harness-7-layers.md`
- Layer-by-layer reference: `wiki/layers/` (01–07)
- Novel future idea: multi-agent consensus workflow with configurable debate budget.
- Novel future idea: document-query layer with vector indexing and natural language retrieval across planning memory.
- Scope guard: prioritize extensible harness core and exclude opinionated design-skill integration from baseline roadmap.
- Archon integration: `.archon/workflows/harness-pipeline.yaml` defines the full pipeline as a workflow DAG.
