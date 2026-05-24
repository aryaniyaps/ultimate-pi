---
name: pipeline
description: "Use when implementing pipeline architecture: data or task processing split into ordered filters/stages with explicit inputs, outputs, composition, error handling, and observability across the flow."
---

# Pipeline Architecture

Use this skill to transform tangled sequential processing into composable stages.

## Fit

Use for compilers, ETL, media/document processing, validation chains, enrichment, agent workflows, and deterministic multi-step transformations.
Avoid when stages require heavy bidirectional coordination or shared mutable state.

## Agent Workflow

1. Read `graphify-out/GRAPH_REPORT.md`.
2. Run `graphify query "pipeline stages filters processing flow"`.
3. Identify the current implicit sequence and data passed between steps.
4. Define a typed stage contract.
5. Extract one stage at a time.
6. Add tests per stage and for the assembled pipeline.

## Target Shape

```text
codebase/pipeline/
  stage-contract      # Stage<Input, Output>, context, errors
  stages/
    parse
    validate
    enrich
    persist
  compose             # ordering and short-circuit rules
```

## Implementation Rules

- Each stage has one responsibility and explicit input/output.
- Stages do not reach backward into previous stages' internals.
- Shared context is read-mostly; stage outputs carry facts forward.
- Treat retries, dead letters, partial failures, and idempotency as first-class.
- Put composition outside stages so ordering is visible.

## Migration Steps

1. Write the stage interface.
2. Wrap the existing process as one stage-preserving facade.
3. Extract the first pure transformation.
4. Add fixture tests for that stage.
5. Extract side-effecting stages behind ports/adapters.
6. Make observability emit stage name, duration, input id, and failure class.

## Verification

- Use `graphify explain "compose"` or the pipeline entrypoint to inspect stage dependencies.
- Test stages independently with fixtures.
- Test full ordering with one integration test.
- Confirm stages do not directly depend on each other except through composition.

## Output Contract

Return: stage map, stage contracts, extracted stage patch, failure semantics, and verification evidence.
