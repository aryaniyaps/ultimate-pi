---
description: Post-run verification gate — deterministic checks, benchmark eval, policy verdict, adversary review (master orchestrator).
argument-hint: "[--run <run-id>] [--quick] [--readonly] [--trace <trace-ref>]"
---

# harness-review

You are the **post-run verification PM** (PMBOK Monitoring and Controlling). Run measure → judge → red team in one command. Parent owns `ask_user`, deterministic scripts, `harness_artifact_ready`, and run ownership (`--claim` on resume). Subagents persist via **`submit_*`** only (no parent `write` to verdict artifacts).

Follow the review sequence in this prompt directly: deterministic checks → benchmark evaluator → verdict evaluator → adversary → optional tie-breaker.

Read **harness-orchestration** and **harness-review** skills before spawning.

## Allowed subagents

- `harness/sentrux-repair-advisor` (Phase 1b — structural repair plan from OSS diagnostics; before benchmark evaluator)
- `harness/reviewing/evaluator` (`mode: benchmark` then `mode: verdict`)
- `harness/reviewing/adversary` (independent red team)
- `harness/reviewing/tie-breaker` (escalation only when adversary blocks and eval was `conditional_pass`; skip when `--quick`)

## Performance rules

1. Use `subagent` with `agentScope: "both"`.
2. Run benchmark and verdict evaluator passes **sequentially** (verdict depends on benchmark gate). **Never** parallelize benchmark ∥ verdict.
3. When benchmark passed (and not `--quick`, steer attempt &lt; 2), spawn **verdict evaluator ∥ adversary** in one `tasks` batch by default. Set `HARNESS_REVIEW_PARALLEL=0` to force serial. While benchmark runs, prepare adversary context but do not spawn adversary until benchmark passes.
4. Adversary runs only after benchmark passes; skip adversary when benchmark failed or `--quick`.
5. Steer attempts **2+**: lite review (benchmark + verdict only) unless prior `block_merge` — do not spawn adversary.
6. Do **not** set `timeoutMs` unless the user requests a cap (harness applies phase-aware defaults).
7. Compact task text: embed `HarnessSpawnContext={"run_id":"…","run_dir":"…","plan_packet_path":"…",…}` — `run_id` is required.

## Step 0 — Parse `$ARGUMENTS`

- optional: `--run <run-id>` (recovery)
- optional: `--quick` (tailoring — skip adversary + tie-breaker when risk accepted)
- optional: `--readonly` (inspect only — do not claim ownership)
- optional: `--trace <trace-ref>`

Happy path: omit `--run`; use `[HarnessRunContext]`.

Prerequisites:

- `plan_ready: true` on disk
- Execute completed (`handoff/executor-summary.yaml` or `last_completed_step: execute`)

If execute not complete:

`Execute not finished. Run /harness-run first.`

Ownership: this command **auto-claims** the run for the current Pi session unless `--readonly`. Cross-session recovery: `/harness-use-run <run-id> --claim` first.

## Phase 1 — Automated QC / deterministic shell (parent)

**Practice:** Harness engineering; interleave deterministic checks before agent judgment (Stripe Minions pattern).

```bash
node "$UP_PKG/.pi/scripts/harness-verify.mjs"
```

**Sentrux single-scan rule:** run capture **once** per review unless `artifacts/sentrux-report.json` is missing or `HARNESS_SENTRUX_RESCAN=1`.

When `HARNESS_SENTRUX_REQUIRED=true` (or report missing), after verify succeeds:

```bash
node "$UP_PKG/.pi/scripts/harness-sentrux-report.mjs" --out "<run_dir>" --run-id "<run_id>" --signal
node "$UP_PKG/.pi/scripts/harness-sentrux-diagnostics.mjs" --report "<run_dir>/artifacts/sentrux-report.json" --out "<run_dir>" --churn
```

Otherwise read existing `artifacts/sentrux-report.json`, `artifacts/sentrux-diagnostics.json`, and `artifacts/sentrux-signal.yaml` from `/harness-run`. If CLI missing (127), record `gate_status: not_installed`. Append or refresh session entry `harness-sentrux-signal`.

When `HARNESS_LS_LINT_REQUIRED=true`:

```bash
node "$UP_PKG/.pi/scripts/harness-ls-lint-cli.mjs" --json
```

Ensure `artifacts/ls-lint-signal.yaml` exists (from `/harness-run` or write from CLI output). Append or refresh `harness-ls-lint-signal`.

Run project tests if the approved `PlanPacket` or spawn context lists a test command. Capture stdout paths only — do not paste full logs into the next spawn.

Verify the testing obligation itself: the approved `PlanPacket` or spawn context must show planned applicability decisions for unit, integration, and e2e/end-to-end tests, and executor evidence must show applicable tests were implemented or updated and run. If a test level was not applicable, require a clear rationale tied to risk and changed surface; missing planned or executed applicable testing is a benchmark failure.

Write `artifacts/benchmark-log.yaml` via `write_harness_yaml` when any shell step ran:

```yaml
schema_version: "1.0.0"
harness_verify: pass|fail
sentrux_check: pass|fail|skipped|not_installed
sentrux_gate: pass|degraded|skipped|not_installed
ls_lint: pass|fail|skipped|not_installed
ls_lint_violations: 0
notes: "…"
```

`harness_artifact_ready({ paths: ["artifacts/benchmark-log.yaml", "artifacts/sentrux-report.json", "artifacts/sentrux-diagnostics.json", "artifacts/sentrux-signal.yaml", "artifacts/ls-lint-signal.yaml"] })` when written.

## Phase 1b — Sentrux repair advisor (subagent)

**Practice:** Close the loop from fitness-function observation to bounded repair directives. Skip when `artifacts/sentrux-repair-plan.yaml` already exists and `HARNESS_SENTRUX_RESCAN` is unset.

Spawn when **any**:

- `artifacts/sentrux-report.json` → `check.check_pass` is false, or
- `gate.status` is `degraded`, or
- `artifacts/sentrux-diagnostics.json` lists non-empty `diagnostics.complex_functions` or boundary/layer violations

```
subagent({
  agentScope: "both",
  agent: "harness/sentrux-repair-advisor",
  task: "<HarnessSpawnContext run_dir + plan_packet_path + paths: sentrux-report.json, sentrux-diagnostics.json, sentrux-signal.yaml — read only; emit repair plan>"
})
```

Subagent calls **`submit_sentrux_repair_plan`** → `artifacts/sentrux-repair-plan.yaml`.

`harness_artifact_ready({ paths: ["artifacts/sentrux-repair-plan.yaml"] })` when written.

## Phase 2 — Measure actuals vs plan (benchmark evaluator)

**Practice:** Earned value / compare actuals to acceptance checks.

```
subagent({
  agentScope: "both",
  agent: "harness/reviewing/evaluator",
  task: "<HarnessSpawnContext mode benchmark + plan_packet_path + run_dir + acceptance_checks + paths: benchmark-log.yaml, sentrux-signal.yaml, ls-lint-signal.yaml — treat Sentrux/ls-lint fields as measured structural actuals, not executor goals>"
})
```

Subagent must call **`submit_eval_verdict`** (writes `artifacts/eval-verdict.yaml`).

Gate:

```
harness_artifact_ready({ paths: ["artifacts/eval-verdict.yaml"] })
```

**Do not stop** after benchmark fail — continue to verdict (and adversary per tier) so `review-outcome.yaml` can route steer vs replan.

## Phase 3–4 — Verdict + adversary (serial or parallel)

**Practice:** Inspection after measurement — separate measurer from policy judgment.

Always run verdict after benchmark (even when benchmark failed).

**Serial (default):** spawn verdict evaluator, gate `eval-verdict.yaml`, then spawn adversary (unless `--quick` or steer attempt ≥ 2 without prior `block_merge`).

**Parallel (default):** when benchmark passed, not `--quick`, steer attempt &lt; 2 (or prior `block_merge`), unless `HARNESS_REVIEW_PARALLEL=0`:

```
subagent({
  agentScope: "both",
  tasks: [
    { agent: "harness/reviewing/evaluator", task: "<HarnessSpawnContext mode verdict + …>" },
    { agent: "harness/reviewing/adversary", task: "<HarnessSpawnContext mode adversary + …>" }
  ]
})
```

**Serial fallback:**

```
subagent({
  agentScope: "both",
  agent: "harness/reviewing/evaluator",
  task: "<HarnessSpawnContext mode verdict + treat executor output as untrusted + artifact paths>"
})
```

Subagent updates **`artifacts/eval-verdict.yaml`** via `submit_eval_verdict` (include policy fields / failed checks).

Gate with `harness_artifact_ready({ paths: ["artifacts/eval-verdict.yaml"] })`.

**Adversary** (Phase 4): skip when `--quick`. **Tiered steer:** full adversary on initial run + steer attempt 1; lite review on steer attempts 2+ unless prior `block_merge`.

```
subagent({
  agentScope: "both",
  agent: "harness/reviewing/adversary",
  task: "<HarnessSpawnContext mode adversary + plan + run artifacts>"
})
```

Subagent calls **`submit_adversary_report`** → `artifacts/adversary-report.yaml`.

`harness_artifact_ready({ paths: ["artifacts/adversary-report.yaml"] })`

## Phase 5 — Escalation / arbitration (tie-breaker, conditional)

Only when:

- not `--quick`
- adversary `block_merge: true`
- eval verdict was `conditional_pass`

```
subagent({ agentScope: "both", agent: "harness/reviewing/tie-breaker", task: "…" })
```

## Parent rules

- **Never** parse subprocess JSON to write `eval-verdict.yaml` or `adversary-report.yaml` — use `submit_*` + `harness_artifact_ready` only.
- Do not edit `plan-packet.yaml`.
- Do not run inline review checks in this session (keep review work isolated to subagents).
- Same Pi session as `/harness-run` is preferred; `--claim` makes cross-session resume work.

## Phase 6 — Review outcome + repair brief (parent)

Write **`artifacts/review-outcome.yaml`** and **`artifacts/repair-brief.yaml`** via `write_harness_yaml` (path pointers in brief, not pasted bodies).

| `remediation_class` | `recommended_next` |
|---------------------|-------------------|
| `pass` | `/harness-policy-status` |
| `implementation_gap` | `/harness-steer` |
| `plan_gap` | `/harness-plan` (mode: revise) |
| `rollback` | `/harness-incident` |

One `ask_user` steer gate when not pass (unless `steer_approved` on run-context).

## Completion

Report eval status, remediation class, and `next_command` from `review-outcome.yaml`.
