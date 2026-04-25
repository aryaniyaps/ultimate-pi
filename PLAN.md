# Plan

## Harness execution model improvements
1. Make harness mimic enterprise software engineering team execution.
2. Require project wiki creation at project start.
3. Require every design decision to be documented in wiki with rationale.
4. Before code changes, require referencing relevant wiki design decisions/guidelines to maintain continuity.
5. Reference https://handbook.gitlab.com/handbook/engineering/ while building the harness architecture.
6. Add inter-agent communication loop (not only sub-agent spawning): allow agents to ask peer agents for bug hypotheses, run bounded debate rounds, and stop on consensus or budget exhaustion.
7. Make all written context (wiki actions, todos, plans) easily queryable via natural language by adding an indexing layer over these documents backed by a vector DB.

## Tracking note
- New execution-model requirements are now tracked here for implementation.
- Novel future idea tracked: multi-agent consensus workflow with configurable debate budget.
- Novel future idea tracked: document-query layer with vector indexing and natural language retrieval across planning memory.
