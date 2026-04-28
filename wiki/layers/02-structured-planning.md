# Layer 2 — Structured Planning

## Origin principle

Google's design doc principle: think before coding, and have that thinking reviewed. For agents: machine-readable format, consumed by orchestration machinery, independently verified before execution begins. **This layer is mandatory. Every task gets a plan. No code is written without an approved plan.**

## Purpose

Decompose a HardenedSpec into a **task dependency graph (DAG)** of minimal, independently verifiable subtasks. Each subtask declares inputs, outputs, dependencies, risks, and verification methods. The plan is adversarially reviewed before any execution.

## Data contract

```typescript
type ExecutionPlan = {
  id: string;
  spec_id: string;
  created_at: string;
  nodes: PlanNode[];
  dag_valid: boolean;
  review_status: "pending" | "approved" | "rejected" | "revised";
  reviewer?: string;
  review_notes?: string;
};

type PlanNode = {
  task_id: string;
  title: string;
  description: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  risk_surface: RiskEntry[];
  verification: VerificationMethod;
  status: "pending" | "in_progress" | "completed" | "failed" | "blocked";
  assigned_agent?: string;
};

type RiskEntry = {
  component: string;
  failure_mode: string;
  likelihood: "high" | "medium" | "low";
  mitigation: string;
};

type VerificationMethod = {
  type: "automated_test" | "manual_inspection" | "schema_validation" | "ai_critic";
  details: string;
  passed: boolean | null;
};
```

## Behavior

### Entry: `spec_hardened` event (always received)

### Step 1 — DAG generation (mandatory)

Planner sends HardenedSpec to AI, produces ExecutionPlan.

### Step 2 — DAG validation (mandatory, automated)

| Check | Failure action |
|-------|----------------|
| Cycle detection | Regenerate |
| Orphan detection (unreachable nodes) | Regenerate |
| No root node | Regenerate |
| No terminal node | Flag warning |
| Spec coverage (every success criterion mapped) | Flag warning |
| Invalid dependency references | Regenerate |

If `dag_valid === false`, regenerate up to `max_plan_revisions` times.

### Step 3 — Plan review (always runs)

Adversarial critic review **always runs** on generated plans. The `require_approval` config controls whether human approval is also needed.

- Critic review: mandatory, non-bypassable. Attack the plan.
- Human approval: optional (when `require_approval: true`, default).

### Step 4 — Storage

Persist to memory + `.pi/harness/plans/<plan-id>.json`.

### Step 5 — Archon integration

In `harness-pipeline.yaml`: `create-plan` node → `review-plan` node → `approve-plan` loop node (Archon handles the approval gate with `interactive: true`).

## AI prompt — plan creation

```
You are a planning agent. Produce an execution plan as a DAG of tasks.

Rules:
- Each task = smallest independently verifiable unit
- Every task declares: inputs, outputs, dependencies
- Every task identifies ≥1 risk entry
- Every task has concrete verification method
- No cycles. Prefer parallelism.

Output strict JSON matching ExecutionPlan schema.

Hardened specification:
<spec_json>
```

## AI prompt — adversarial plan review

```
You are a plan critic. ATTACK this execution plan.

Find: missing tasks, incorrect dependencies, overly broad tasks, missing verification, unidentified risks, dead-end paths.

For each finding: severity, what's wrong, what should be added/changed.

Plan:
<plan_json>

Spec:
<spec_json>
```

## Extension: `extensions/harness-planner.ts`

| Type | Name | Description |
|------|------|-------------|
| Event consumed | `spec_hardened` | Input: spec_id → create plan |
| Event emitted | `plan_approved` | `{ plan_id }` → Archon workflow, Layer 3 |
| Tool | `create-plan` | spec_id → ExecutionPlan |
| Tool | `review-plan` | plan_id → CriticReview |
| Tool | `approve-plan` | Human override with notes |
| Command | `/harness-plan-status` | Show current plan, node statuses, review status |

## Config (tuning only — layer always runs)

```json
{
  "planner": {
    "require_approval": true,
    "max_plan_revisions": 3
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `require_approval` | true | Whether human approval is needed in addition to critic review (critic review always runs) |
| `max_plan_revisions` | 3 | Max regeneration attempts on validation/review failure |

## Error states

| Error | Recovery |
|-------|----------|
| `plan_generation_failure` | Retry up to 2 times; escalate |
| `dag_validation_failure` | Regenerate with explicit constraint |
| `plan_review_rejected` | Incorporate critic notes, regenerate |
| `plan_revision_exhausted` | Escalate to human; requires `approve-plan` override |

## Token cost

~3,000 for plan generation. ~2,000 for review. Total: ~5,000.