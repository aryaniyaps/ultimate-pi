---
type: module
title: Automated Observability
status: developing
created: 2026-04-28
updated: 2026-04-28
tags: [harness, observability, metrics, layer-5, quality]
layer: "5"
sources:
  - "[[harness-implementation-plan]]"
related:
  - "[[agentic-harness]]"
  - "[[adversarial-verification]]"
  - "[[persistent-memory]]"
---

# Automated Observability

Layer 5 of the [[agentic-harness]]. Instrumentation is part of the definition of done. If `require_metrics=true` (default), the subtask is not complete until instrumentation code exists.

## Flow

1. `subtask_verified` → extract metrics, health checks, alerts from code change + task spec
2. Produce **ObservabilitySpec**
3. If `require_metrics=true`: scan code changes for instrumentation → if missing, generate scaffolding
4. Store ObservabilitySpec with SubtaskResult
5. Emit `subtask_observable` → task marked done

## ObservabilitySpec Data Contract

- **metrics** — name, type (counter/gauge/histogram), description, unit, instrumentation_code
- **health_checks** — name, method, expected_result
- **alert_conditions** — metric_name, threshold, action

Every metric must answer "is this working correctly?" — no vanity metrics.

## Extension Interface

| Type | Name |
|------|------|
| Tool | `define-observability` |
| Tool | `verify-observability` |
| Command | `/harness-observability-status` |

## Config

```json
{ "observability": { "require_metrics": true } }
```

## Files

- `lib/harness-observability.ts` — ObservabilityEnforcer class
- `extensions/harness-observability.ts` — Extension with enforcement hooks
