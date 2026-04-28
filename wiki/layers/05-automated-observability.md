# Layer 5 — Automated Observability

## Origin principle

Netflix's chaos engineering and Google's SRE principles: build operability in from the start, not as an afterthought. The agent-native translation: every component the agent produces must declare what metrics indicate correct operation, and those metrics must be wired up before the component is considered complete. **This layer is mandatory. Observability is part of the definition of done.**

## Purpose

Every subtask output includes an **ObservabilitySpec**: what metrics indicate correct operation, what health checks verify it, and what alerts signal problems. If `require_metrics` is enabled (default), the subtask is not considered complete until metric instrumentation code exists in the change.

## Data contract

```typescript
type ObservabilitySpec = {
  metrics: MetricDefinition[];
  health_checks: HealthCheck[];
  alert_conditions: AlertCondition[];
};

type MetricDefinition = {
  name: string;
  type: "counter" | "gauge" | "histogram";
  description: string;
  unit: string;
  instrumentation_code: string;  // code snippet or file reference
};

type HealthCheck = {
  name: string;
  method: string;
  expected_result: string;
};

type AlertCondition = {
  metric_name: string;
  threshold: string;
  action: string;
};
```

## Behavior

### Entry: `subtask_verified` event (always received — critics passed)

### Flow (always runs)

```
subtask_verified(task_id, plan_id)
    ↓
AI call: extract metrics, health checks, alert conditions from code change + task spec
    ↓
Produce ObservabilitySpec
    ↓
If require_metrics=true (default):
  → Scan code changes for instrumentation code matching MetricDefinitions
  → If missing: generate scaffolding snippet
  → Block completion until instrumentation wired
    ↓
Store ObservabilitySpec with SubtaskResult
    ↓
subtask_observable → mark task as done in plan
```

### Instrumentation verification (heuristic)

```
for each metric in ObservabilitySpec.metrics:
  search code changes for:
    - metric.name as string literal
    - metric.type as counter/gauge/histogram usage pattern
    - instrumentation_code pattern matching
  if NOT found:
    → generate scaffolding
    → if require_metrics=true: block completion
    → if require_metrics=false: log warning only
```

This is heuristic — it catches obvious omissions, not compile-time guarantees.

## AI prompt — metric extraction

```
You are an observability agent. Define what metrics indicate the component works correctly.

For each metric: name, type (counter/gauge/histogram), description, unit, instrumentation code snippet.
For each health check: name, method, expected result.
For each alert condition: metric name, threshold, action.

Rules:
- Every metric must answer "is this working correctly?"
- No vanity metrics (request_count without context)
- Health checks must be concrete and executable
- Alert thresholds must be specific numbers

Output strict JSON matching ObservabilitySpec schema.

Code change: <diff>
Task: <task_description>
```

## Extension: `extensions/harness-observability.ts`

| Type | Name | Description |
|------|------|-------------|
| Event consumed | `subtask_verified` | Enforce observability for verified subtask |
| Event emitted | `subtask_observable` | `{ task_id, plan_id, spec }` → Layer 3 marks task done |
| Event emitted | `observability_missing` | `{ task_id, plan_id, missing_metrics }` → Layer 6 memory |
| Tool | `define-observability` | Generate metrics spec for a task |
| Tool | `verify-observability` | Check which metrics have instrumentation |
| Command | `/harness-observability-status` | Show metrics defined vs wired |

## Config (tuning only — layer always runs)

```json
{
  "observability": {
    "require_metrics": true
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `require_metrics` | true | Block completion until instrumentation is wired. Set false for environments where heuristic matching is unreliable |

**Note:** `require_metrics` defaults to `true` because observability is definition-of-done. Setting it to `false` is a deliberate concession, not an opt-out of the layer.

## Error states

| Error | Recovery |
|-------|----------|
| `observability_ai_failure` | Retry; fall back to empty spec with warning |
| `metric_not_wired` | Generate scaffolding; block if `require_metrics=true` |

## Token cost

~1,500 per subtask (1 AI call).