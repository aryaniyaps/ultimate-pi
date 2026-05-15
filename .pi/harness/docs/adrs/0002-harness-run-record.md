# ADR 0002: HarnessRunRecord canonical trace

- **Status:** Accepted
- **Date:** 2026-05-15

## Context

`RunTrace` (trace.json) lacked timing boundaries and a stable contract for PostHog `harness_run_completed` payloads.

## Decision

Introduce **HarnessRunRecord** (schema `harness-run-record.schema.json` v1.0.0) as the canonical per-run summary:

- Written by `trace-recorder.ts` to `trace.json` and session custom entry `harness-run-record`.
- Mirrored to PostHog as `harness_run_completed` by `harness-telemetry.ts`.
- Includes `started_at`, `ended_at`, `duration_ms`, `pi_session_id`, token totals, and tool span counts.

Legacy `harness-run-trace` entries remain for backward compatibility one release cycle.

## Consequences

### Positive

- Single payload for JSONL, session history, and PostHog funnels.

### Negative

- `trace.json` may contain fields beyond strict `run-trace.schema.json` until schemas converge.

## References

- `.pi/harness/specs/harness-run-record.schema.json`
- `.pi/extensions/trace-recorder.ts`
