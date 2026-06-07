---
description: Execute only against an approved PlanPacket with strict phase gates.
---

# harness-run

Follow this prompt's execution flow directly: baseline gate → executor spawn → structural observation → review handoff.

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

## Pre-work — Git feature branch (parent)

When `.pi/auto-commit.json` has `branch.strategy: auto-feature-branch`, ensure a non-protected working branch before the executor mutates files:

```bash
node "$UP_PKG/.pi/scripts/harness-git-branch.mjs" \
  --run-id "<run_id>" \
  --run-dir "<run_dir>" \
  --project-root "<project_root>"
```

On protected branches (`main`, `master`, `release/*` by default), this creates or checks out `harness/<run-id-slug>`. Result is recorded in `artifacts/git-workflow.yaml`. Commits after review must use **harness-git-commit** (never raw `git commit`).

## Orchestration — Single jelled implementer

**Practice:** Peopleware — one accountable team owns delivery; generator–evaluator separation (executor does not self-certify).

1. Confirm `[HarnessActivePlan]` / extension reports plan ready.
2. Build `HarnessSpawnContext` with `mode: execute`, `plan_packet_path`, `run_dir`, `acceptance_checks` from plan file.
3. Include **`critical_path_work_item_ids`** from `execution_plan.schedule_metadata` in spawn task when present — executor should tackle limiting-step items first (Grove).
4. Include the plan's testing expectations in the spawn task: the executor must implement or update applicable unit, integration, and e2e/end-to-end tests, run the relevant verification commands, and report command evidence or a rationale for any non-applicable test level in `validation_summary`.
5. Spawn (max **1** agent per call):

```
subagent({ agentScope: "both", agent: "harness/running/executor", task: "<HarnessSpawnContext + handoff + critical path hint>" })
```

6. Parse subprocess output JSON (`execution_status`, validations, rollback refs) from tool result text.
7. Parent persists trace/handoff artifacts under run dir if needed; do not self-review.

## Post-work — Structural observation (parent)

**Practice:** Monitoring actuals vs baseline — in-process fitness functions after generator work.

After executor subprocess completes, run **one** Sentrux capture (OSS CLI parse — no MCP/Pro):

```bash
node "$UP_PKG/.pi/scripts/harness-sentrux-report.mjs" --out "<run_dir>" --run-id "<run_id>" --signal
node "$UP_PKG/.pi/scripts/harness-sentrux-diagnostics.mjs" --report "<run_dir>/artifacts/sentrux-report.json" --out "<run_dir>" --churn
```

- If `sentrux-report.json` → `check.check_pass` is false or `gate.status` is `degraded` → set `execution_status: scope_drift` (or `blocked` if unrecoverable); parent runs **`/harness-review`** next (not immediate replan).
- `harness-sentrux-report.mjs --signal` writes `artifacts/sentrux-signal.yaml` (schema `1.1.0`) with `report_path`, `diagnostics_path`, `quality_signal`, `violation_count`, `degraded_reasons` when present.
- If `sentrux` is not installed (exit 127), record `gate_status: not_installed` via minimal `write_harness_yaml` and continue.

Append session custom entry `harness-sentrux-signal` mirroring the signal file (observation bus / telemetry).

`harness_artifact_ready({ paths: ["artifacts/sentrux-report.json", "artifacts/sentrux-diagnostics.json", "artifacts/sentrux-signal.yaml"] })` when written.

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

- On `scope_drift`, finish handoff and recommend **`/harness-review`** (review classifies whether the gap is planning or implementation).
- Do not call `ask_user` for plan-level ambiguity — return to plan command.

## Completion

- `execution_status`: `completed`, `blocked`, or `scope_drift`
- `validation_summary` with command evidence
- `handoff_ready` for post-run review
- `next_command`: `/harness-review` (Monitoring and Controlling — measure then judge; same session preferred)
