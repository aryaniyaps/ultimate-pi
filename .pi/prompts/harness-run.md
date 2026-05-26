---
description: Execute only against an approved PlanPacket with strict phase gates.
argument-hint: ""
---

# harness-run

**Practice map:** `.pi/harness/docs/practice-map.md`

You orchestrate the **Executing Process Group** — spawn `harness/running/executor` only. Do **not** implement inline.

## Step 0 — Parse arguments

- `--budget` is reserved/no-op (telemetry-only budgets by default)
- Do **not** use `--plan` on happy path — load from `[HarnessActivePlan]` / `plan_packet_path`.

If plan not ready:

`Run /harness-plan first — no approved plan in active run context.`

## Gate — No execution without baseline (change control)

**Practice:** PMBOK integrated change control — refuse work without an approved baseline.

Refuse if `plan_ready` is false.

## Pre-work — Architectural fitness baseline (parent)

**Practice:** Fitness functions (architecture governance) — save structural baseline before the executor mutates the tree.

When `HARNESS_SENTRUX_REQUIRED=true` (see `.env.example`), run the bundled root-resolving wrapper:

```bash
node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" gate --save
```

The wrapper passes the resolved project root explicitly so Sentrux can find `.sentrux/rules.toml` even if the active shell is under `.pi/harness/runs/*`. If `sentrux` is not installed, note `gate_baseline: skipped` in run notes and continue (harness-verify may still pass rules-sync checks).

Do **not** ask the executor to optimize Sentrux metrics — observation is for `/harness-review` only.

When `HARNESS_LS_LINT_REQUIRED=true`, record a pre-execute filename baseline:

```bash
node "$UP_PKG/.pi/scripts/harness-ls-lint-cli.mjs" --json
```

Note `violation_count` in run notes (do not block execute on pre-existing violations unless chair policy says otherwise).

## Orchestration — Single jelled implementer

**Practice:** Peopleware — one accountable team owns delivery; generator–evaluator separation (executor does not self-certify).

1. Confirm `[HarnessActivePlan]` / extension reports plan ready.
2. Build `HarnessSpawnContext` with `mode: execute`, `plan_packet_path`, `run_dir`, `acceptance_checks` from plan file.
3. Include **`critical_path_work_item_ids`** from `execution_plan.schedule_metadata` in spawn task when present — executor should tackle limiting-step items first (Grove).
4. Spawn (max **1** agent per call):

```
subagent({ agentScope: "both", agent: "harness/running/executor", task: "<HarnessSpawnContext + handoff + critical path hint>" })
```

5. Parse subprocess output JSON (`execution_status`, validations, rollback refs) from tool result text.
6. Parent persists trace/handoff artifacts under run dir if needed; do not self-review.

## Post-work — Structural observation (parent)

**Practice:** Monitoring actuals vs baseline — in-process fitness functions after generator work.

After executor subprocess completes:

```bash
node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" check
node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" gate
```

- If `sentrux check` exits non-zero or `gate` reports degradation → set `execution_status: scope_drift` (or `blocked` if unrecoverable); parent runs **`/harness-review`** next (not immediate replan).
- Write `artifacts/sentrux-signal.yaml` via `write_harness_yaml`:

```yaml
schema_version: "1.0.0"
run_id: "<run_id>"
check_pass: true|false
gate_status: pass|degraded|skipped|not_installed
quality_signal_summary: "<one line from CLI output>"
recorded_at: "<ISO8601>"
phase: execute
```

- Append session custom entry `harness-sentrux-signal` with the same fields (observation bus / telemetry).

`harness_artifact_ready({ paths: ["artifacts/sentrux-signal.yaml"] })` when written.

When `HARNESS_LS_LINT_REQUIRED=true`, after executor completes:

```bash
node "$UP_PKG/.pi/scripts/harness-ls-lint-cli.mjs" --json
```

- If `lint_pass` is false → include in `validation_summary`; prefer `scope_drift` when new violations vs pre-run baseline.
- Write `artifacts/ls-lint-signal.yaml` via `write_harness_yaml`:

```yaml
schema_version: "1.0.0"
run_id: "<run_id>"
lint_pass: true|false
violation_count: 0
status: pass|fail|skipped|not_installed
quality_signal_summary: "<one line>"
recorded_at: "<ISO8601>"
phase: execute
```

- Append session custom entry `harness-ls-lint-signal` with the same fields.

`harness_artifact_ready({ paths: ["artifacts/ls-lint-signal.yaml"] })` when written.

## Parent rules

- On `scope_drift`, finish handoff and recommend **`/harness-review`** (review classifies `plan_gap` vs `implementation_gap` — ADR 0044).
- Do not call `ask_user` for plan-level ambiguity — return to plan command.

## Completion

- `execution_status`: `completed`, `blocked`, or `scope_drift`
- `validation_summary` with command evidence
- `handoff_ready` for post-run review
- `next_command`: `/harness-review` (Monitoring and Controlling — measure then judge; same session preferred)
