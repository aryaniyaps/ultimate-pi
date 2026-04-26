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
9. Integrate https://github.com/coleam00/Archon to create repeatable workflows and use them inside the AI harness.

## Contemplated engineering principles for agent-optimized software development frameworks
- Reference source synthesis: GitLab, Google, Amazon, PSF/open-source, Netflix, Microsoft engineering philosophies.
- Core transferable values: think before coding, small changes, rigorous testing, independent verification, incremental shipping, observability, continuous learning.
- Translation rule: keep values, replace human-centric mechanisms with agent-native mechanisms.

### Agent-native harness architecture (future implementation reference)
1. Intake + specification hardening
   - Use structured spec schema with explicit success criteria, anti-criteria, ambiguity flags, and testable definition of done.
   - Add ambiguity detector gate: block execution until underspecified requirements are resolved.
2. Structured planning before code
   - Require machine-readable design plan with task DAG, dependency contracts, risk surface, and verification method per subtask.
   - Require independent plan review (critic agent or human) before execution.
3. MVC execution + grounding checkpoints
   - Execute as smallest independently verifiable change units.
   - At each checkpoint: re-ground against original spec + current state to prevent context drift.
   - Persist recoverable intermediate states, not only final state.
4. Adversarial verification (not cooperative peer review)
   - Use critic agents explicitly tasked to find correctness/security/performance/spec-compliance failures.
   - Prefer multiple independent critics with specialized focus areas.
5. Observability as first-class definition-of-done scope
   - Require metrics/instrumentation definition and wiring during implementation, not as post-work.
   - Validate operability signals before completion.
6. Persistent structured memory + pattern libraries
   - Store successful patterns, failed approaches, decision rationale, and codebase evolution graph for retrieval.
   - Improve harness quality via context enrichment, not assumed session memory.
7. Schema-based orchestration + parallel dispatch
   - Route work via typed schemas and declared capabilities.
   - Prefer completion-based execution cadence over calendar cadence.
   - Exploit low-overhead multi-agent parallelism where safe.

### Guardrails for applying enterprise principles to agent systems
- Do not copy human process overhead (standups/sprint rituals/social coordination) unless it adds measurable agent-quality benefit.
- Treat verification as mandatory and non-overrideable; agent confidence is not evidence.
- Add explicit anti-hallucination and context-grounding controls at each major transition.

## Tracking note
- New execution-model requirements are now tracked here for implementation.
- Novel future idea tracked: multi-agent consensus workflow with configurable debate budget.
- Novel future idea tracked: document-query layer with vector indexing and natural language retrieval across planning memory.
- Scope guard tracked: prioritize extensible harness core and exclude opinionated design-skill integration from baseline roadmap.
