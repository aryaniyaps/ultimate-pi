---
name: orchestration-driven-soa
description: "Use when implementing orchestration-driven service-oriented architecture: central workflow orchestration across services, explicit process models, compensations, service contracts, long-running transactions, and governance boundaries."
---

# Orchestration-Driven SOA

Use this skill when a central process coordinator is the clearest way to manage cross-service workflows.

## Fit

Use for long-running business processes, compliance-heavy flows, and integrations where visibility and control matter more than local autonomy.
Avoid when simple choreography is sufficient or a central orchestrator would become a god service.

## Agent Workflow

1. Read `graphify-out/GRAPH_REPORT.md`.
2. Run `graphify query "orchestration driven service oriented architecture workflow compensation"`.
3. Identify the end-to-end business process and participating services.
4. Model the workflow states before code.
5. Implement the orchestrator as a thin state machine, not a business blob.
6. Add compensation and timeout behavior.

## Target Shape

```text
codebase/workflows/
  <workflow>/
    states
    orchestrator
    participants
    compensations
    tests/
codebase/services/*/contract
```

## Implementation Rules

- Orchestrator owns process state, sequencing, timeouts, and compensation.
- Domain services own local business invariants and data.
- Participant contracts are explicit and versioned.
- Every remote step has timeout, retry, and compensation semantics.
- Avoid embedding service internals in the orchestrator.

## Migration Steps

1. Draw the workflow as states and transitions.
2. Define participant ports/contracts.
3. Implement a state store for workflow instances.
4. Move cross-service sequencing into the orchestrator.
5. Add compensating actions for partial failure.
6. Add trace IDs across all participant calls.

## Verification

- `graphify explain "orchestrator"` should show workflow-to-contract dependencies, not service internals.
- Test happy path, participant failure, retry exhaustion, timeout, compensation failure, and resume after crash.

## Output Contract

Return: workflow state model, participant contracts, orchestrator patch, compensation matrix, and verification evidence.
