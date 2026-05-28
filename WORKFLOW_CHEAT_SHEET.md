# Workflow Cheat Sheet

Use this when you already know the repo and need the shortest correct path.

## Default Choice

| Need | Command | Result |
|---|---|---|
| Do the normal end-to-end flow | `/harness-auto "<task>"` | Plan, run, review, and repair if needed |
| Inspect each phase manually | `/harness-plan "<task>"` then `/harness-run` then `/harness-review` | Step-by-step control |
| Repair an implementation gap | `/harness-steer` then `/harness-review` | Narrow fix only |
| Revise the plan | `/harness-plan "<updated task>"` | Replace the approved plan |
| Stop safely | `/harness-abort [reason]` | Clear active work and lock mutation |

| Prune historical run directories safely | `/harness-clear` | Deletes only historical `.pi/harness/runs/<run_id>/` directories after confirmation; active run is preserved |
| Inspect a run | `/harness-trace [--run <id>]` | Summarize run handoffs and traces |
| Record a failure | `/harness-incident --trigger <reason>` | Write an incident record |
| Check architecture alignment | `/harness-sentrux-steward [--run <id>]` | Review Sentrux intent and rules |
| Bootstrap a project | `/harness-setup` | Seed graph, tools, settings, and checks |

## Phase Flow

| Phase | What it does | Main output |
|---|---|---|
| Plan | Collect evidence, split the task, validate the shape of the work, and approve scope. | `plan-packet.yaml` |
| Run | Execute only the approved work. | Code changes and handoff artifacts |
| Review | Run deterministic checks, benchmark logic, policy checks, and review agents. | Review verdict and outcome files |
| Steer | Fix only the approved gap without widening scope. | Updated implementation and new review pass |

## Rules That Matter Most
- `--quick` changes depth, not the requirement for a correct flow.
- `--risk low|med|high` changes the amount of planning and review detail.
- The happy path does not need `--plan` or an explicit run id.
- `/harness-run` only executes the approved active plan.
- `/harness-review` is not optional when the workflow expects a review.

## If Something Fails

| Symptom | What to do |
|---|---|
| Review says `implementation_gap` | Run `/harness-steer`, then re-run `/harness-review` |
| Review says `plan_gap` | Re-run `/harness-plan` with the corrected task |
| Setup fails | Confirm Node 18+, npm 9+, git, and Pi, then retry `/harness-setup` |
| You need to restart cleanly | Run `/harness-abort`, then start a fresh plan |

| You need to clean old run history | Run `/harness-clear`; cancellation or confirmation outage is a no-op |
| You need evidence from the run | Run `/harness-trace` or inspect `.pi/harness/runs/<run_id>/` |

## Important On-Disk Files

| File or directory | Purpose |
|---|---|
| `.pi/harness/active-run.json` | Points to the current run |
| `.pi/harness/runs/<run_id>/plan-packet.yaml` | Approved plan baseline |
| `.pi/harness/runs/<run_id>/research-brief.yaml` | Planning evidence |
| `.pi/harness/runs/<run_id>/artifacts/` | Run, review, repair, and Sentrux artifacts |
| `.pi/harness/runs/<run_id>/handoff/executor-summary.yaml` | Executor handoff |
| `.pi/harness/incidents/` | Incident and rollback records |
