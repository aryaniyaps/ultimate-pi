---
name: observability-instrumentation
description: Add useful logs, metrics, traces, events, and diagnostics without noise or data leaks. Use when changing failure paths, background jobs, workflows, integrations, performance-sensitive paths, or production-debuggable behavior. Focuses on actionable signals and safe context.
---

# Observability Instrumentation

Use this skill to make behavior diagnosable in real environments.

## Signal types

- Logs: discrete decisions, failures, lifecycle transitions, and unusual states.
- Metrics: counts, durations, rates, queue depth, success/failure, saturation.
- Traces/spans: cross-boundary request or workflow paths.
- Audit/events: business-relevant actions that need history.
- Health checks: readiness, liveness, dependency status.

## Workflow

1. Identify what a maintainer/operator must know when this fails.
2. Add signals at boundaries and important state transitions.
3. Include correlation identifiers or stable context when available.
4. Redact secrets and personal/sensitive data.
5. Keep labels/cardinality bounded.
6. Avoid logging tight loops or expected noisy paths at high severity.
7. Test or inspect that instrumentation executes on success and failure paths.

## Review questions

- Can someone diagnose the failure without reproducing locally?
- Are logs actionable rather than decorative?
- Will this create noise, cost, or privacy risk?
