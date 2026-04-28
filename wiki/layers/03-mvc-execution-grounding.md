# Layer 3 — MVC Execution & Grounding Checkpoints

## Origin principle

GitLab's minimum viable change: smallest independently verifiable unit. Agent-native addition: **mandatory grounding at each checkpoint**. Humans use persistent memory; agents lose context. Every intermediate state must be committed and recoverable. **This layer always runs. No task executes without grounded checkpoints.**

## Purpose

Execute the plan DAG one subtask at a time with mandatory grounding before and after each subtask. Detect drift (spec changed during execution) and abort+replan rather than continue on a corrupted trajectory. Every intermediate state is committed to git.

## Data contract

```typescript
type GroundingCheckpoint = {
  task_id: string;
  timestamp: string;
  spec_id: string;
  spec_version_at_checkpoint: number;
  drift_detected: boolean;
  drift_details?: string;
  state_hash: string;
  committed: boolean;
  git_sha?: string;
};

type SubtaskResult = {
  task_id: string;
  status: "success" | "partial" | "failed";
  outputs: Record<string, any>;
  grounding: GroundingCheckpoint;
  critic_reviews: CriticReview[];
  observability: ObservabilitySpec;
};
```

## Behavior

### Entry: `plan_approved` event (always received)

### Execution loop (mandatory for every subtask)

```
for each ready node in plan:
  ┌─ PRE-EXECUTION GROUNDING (mandatory) ──────────────────────┐
  │ 1. Load HardenedSpec from memory                           │
  │ 2. Compare spec_version vs last checkpoint                 │
  │    → If spec changed: drift_detected → abort, replan      │
  │ 3. Compute state_hash = hash(sorted node statuses)         │
  │ 4. Record GroundingCheckpoint                              │
  └────────────────────────────────────────────────────────────┘

  Execute subtask (agent performs code change)

  ┌─ POST-EXECUTION GROUNDING (mandatory) ────────────────────┐
  │ 1. Re-read HardenedSpec                                    │
  │ 2. Verify task output matches declared outputs             │
  │ 3. Verify no anti-criteria violated                        │
  │ 4. Git commit intermediate state                           │
  │ 5. Record GroundingCheckpoint                              │
  └────────────────────────────────────────────────────────────┘

  → subtask_completed (→ Layer 4 critics)
```

### Grounding interval

| Mode | Behavior |
|------|----------|
| `every_subtask` | Checkpoint before and after every subtask (default, safest) |
| `every_n_subtasks` | Checkpoint every N subtasks (faster, less safe) |

### Drift detection

```typescript
// Spec drift: spec was revised during execution → mandatory replan
if (currentSpec.spec_version > checkpoint.spec_version_at_checkpoint) {
  return { drifted: true, details: "spec was revised during execution" };
}
// State drift: unexpected status changes
if (computeStateHash(currentPlan) !== checkpoint.state_hash) {
  return { drifted: true, details: "plan state changed unexpectedly" };
}
```

### Anti-criteria verification (mandatory after each subtask)

Every `AntiCriterion` in the spec is checked against the code changes:

```
for each anti_criterion:
  AI call: "Does this code change violate: <anti_criterion.description>?"
  → Violated: mark subtask failed, emit anti_criteria_violation
```

### Archon integration

In `harness-pipeline.yaml`, the `execute-plan` loop node handles the execution cycle. Each iteration calls `execute-next-task`, which triggers grounding + execution + post-checkpoint. The `until: ALL_TASKS_COMPLETE` loop condition handles the subtask-by-subtask progression. `fresh_context: true` ensures grounding checkpoints are fresh.

## Extension: `extensions/harness-executor.ts`

| Type | Name | Description |
|------|------|-------------|
| Event consumed | `plan_approved` | Begin execution: load plan, find ready nodes |
| Event consumed | `subtask_verified` | Mark verified, find next ready nodes |
| Event consumed | `subtask_failed` | Mark failed, decide retry or abort |
| Event emitted | `subtask_completed` | `{ task_id, plan_id, result }` → Layer 4 |
| Event emitted | `drift_detected` | `{ task_id, plan_id, details }` → Layer 2 replan |
| Event emitted | `execution_complete` | `{ plan_id }` → Layer 6 memory |
| Event emitted | `anti_criteria_violation` | `{ task_id, anti_criterion_id, evidence }` → Layer 6 |
| Tool | `execute-next-task` | Pick next ready node, execute with grounding |
| Tool | `grounding-check` | Manually trigger grounding checkpoint |
| Command | `/harness-execution-status` | Show node statuses, checkpoint history |

## Config (tuning only — layer always runs)

```json
{
  "execution": {
    "grounding_interval": "every_subtask",
    "grounding_n": 1
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `grounding_interval` | "every_subtask" | How often to perform grounding checkpoints |
| `grounding_n` | 1 | When interval is `every_n_subtasks`, checkpoint every N tasks |

## Error states

| Error | Recovery |
|-------|----------|
| `spec_drift` | Abort current task, emit `drift_detected`, replan from Layer 2 |
| `anti_criteria_violation` | Mark subtask failed, retry or abort |
| `grounding_checkpoint_failure` | Log warning, continue without drift check (degraded) |
| `all_nodes_failed` | Emit `execution_complete` with failure state, store failure pattern |

## Token cost

~500 per checkpoint (no AI). Anti-criteria verification: ~300 per criterion (1 AI call).