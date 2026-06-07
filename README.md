![Ultimate PI banner](https://raw.githubusercontent.com/aryaniyaps/ultimate-pi/main/.github/banner-v2.png)

> The **ultimate AI coding harness** on top of [**pi.dev**](https://pi.dev).

`ultimate-pi` adds a governed coding workflow to Pi: bootstrap the repo, plan with evidence, execute only against an approved PlanPacket, then run an independent review gate before merge.

## Documentation Paths

Use [`DOCS_BY_AUDIENCE.md`](./DOCS_BY_AUDIENCE.md) as the routing source of truth.
This README stays focused on the package itself, not on repeating the full doc map.

## Quick start

**Requirements:** Node 18+, npm 9+, git, and Pi.

1. Install the package in your project:

```bash
pi install npm:ultimate-pi
/reload
```

2. Bootstrap the harness once per project:

```text
/harness-setup
```

3. Run the strict end-to-end pipeline:

```text
/harness-auto "implement feature X safely"
```

`/harness-auto` runs plan → execute → review → optional steer loop. It may prepare commit/PR work when gates pass, but it never auto-merges.

## Core workflow

### Recommended: one command

```text
/harness-auto "your task" [--quick] [--risk low|med|high]
```

Use this for most feature, fix, and refactor work. The parent orchestrator handles the phase handoffs and keeps active run context in `.pi/harness/active-run.json` plus run artifacts under `.pi/harness/runs/`.

### Manual: phase by phase

```text
/harness-plan "your task" [--risk low|med|high] [--quick]
/harness-run
/harness-review [--quick]
```

Manual mode is useful when you want to inspect or approve each handoff. On the happy path you do **not** pass `--plan` or a run id; the harness restores the active PlanPacket and run context.

### Repair loop

If `/harness-review` returns `implementation_gap`, run:

```text
/harness-steer
/harness-review
```

`/harness-steer` uses `artifacts/repair-brief.yaml` and respawns the executor in repair mode without widening the approved plan scope.

## Command reference

| Command | Purpose |
|---|---|
| `/harness-setup [--skip-graphify] [--skip-tools] [--non-interactive] [--force]` | Idempotent project bootstrap: Graphify, harness-web/Scrapling, CLI tools, settings, contracts, Sentrux, ls-lint naming, harness lens, and verification. |
| `/harness-auto "<task>" [--quick] [--risk low\|med\|high]` | Strict full pipeline: plan, execute, review, steer when appropriate. |
| `/harness-plan "<task>" [--risk low\|med\|high] [--quick]` | PM-grade planning: clarifies the task with you first, then reconnaissance, decomposition, hypothesis, external research, ExecutionPlan, DAG validation, Review Gate debate, `approve_plan`, `create_plan`. |
| `/harness-run` | Executes the approved active PlanPacket by spawning `harness/running/executor`; no inline implementation. |
| `/harness-review [--run <id>] [--quick] [--readonly] [--trace <ref>]` | Post-run verification gate: deterministic checks, benchmark evaluator, policy verdict, adversary, optional tie-breaker. |
| `/harness-steer [--attempt N]` | Post-review repair pass for `implementation_gap`; executor reads `repair-brief.yaml`, then you re-run `/harness-review`. |
| `/harness-abort [reason]` | Safely aborts the active run, clears plan readiness, and re-locks mutation until a fresh plan is approved. |

| `/harness-clear` | Deletes all `.pi/harness/runs/<run_id>/` directories, including the active run, after mandatory confirmation; non-affirmative/outage confirmation paths are no-op. |
| `/harness-trace [--run <id>] [--phase plan\|execute\|evaluate\|adversary\|merge]` | Summarizes run traces and artifact handoffs for replay/forensics. |
| `/harness-incident --trigger <reason> [--run <id>] [--severity low\|med\|high\|critical]` | Records incident, rollback, and override trail for harness failures. |
| `/harness-sentrux-steward [--run <id>]` | Ad-hoc architectural intent review for Sentrux manifest/rule alignment. |
| `/harness-ls-lint-sync` | Regenerate `.ls-lint.yml` from `.pi/harness/ls-lint/naming.manifest.json`. |
| `/harness-ls-lint-steward [--run <id>]` | Ad-hoc naming-intent review for ls-lint manifest/rule alignment. |
| `/graphify [directory]` | Bootstraps or updates the Graphify knowledge graph. |
| `/wiki-autoresearch [topic]` | Runs autonomous web research and builds a Graphify-backed research wiki. |
| `/wiki-save` | Saves the current conversation or insight as a structured wiki note. |
| `/release [patch\|minor\|major] [--dry-run]` | Maintainer release helper. |

## Harness phases and agents

- **Planning** uses agents under `.pi/agents/harness/planning/` plus parent-led Graphify → `sg` → `ccc` reconnaissance. Legacy tool-tied `planning/scout-*` agents have been removed; planning context is captured in `artifacts/planning-context.yaml`.
- **Running** uses `.pi/agents/harness/running/executor.md` via agent id `harness/running/executor`.
- **Reviewing** uses `.pi/agents/harness/reviewing/` via `harness/reviewing/evaluator`, `harness/reviewing/adversary`, and `harness/reviewing/tie-breaker`.
- **Support agents** such as `harness/incident-recorder`, `harness/sentrux-steward`, `harness/ls-lint-steward`, and `harness/trace-librarian` remain under `.pi/agents/harness/`.

Subagents run isolated from the parent session. They persist canonical YAML through `submit_*` tools; the parent gates with `harness_artifact_ready` and writes only orchestrator-owned merge artifacts.

## Artifacts and layout

| Path | Description |
|---|---|
| `.pi/harness/active-run.json` | Active run pointer for happy-path commands. |
| `.pi/harness/runs/<run_id>/plan-packet.yaml` | Approved execution baseline. |
| `.pi/harness/runs/<run_id>/research-brief.yaml` | Planning evidence and research merge. |
| `.pi/harness/runs/<run_id>/artifacts/` | Planning context, decomposition, research, benchmark, verdict, adversary, repair, Sentrux, and ls-lint signal artifacts. |
| `.pi/harness/runs/<run_id>/handoff/executor-summary.yaml` | Executor handoff written by `submit_executor_handoff`. |
| `.pi/harness/incidents/` | Incident records and rollback/override trail. |
| `.pi/harness/docs/adrs/` | Harness architectural decisions. |
| `.pi/harness/specs/` | Artifact contracts and schemas seeded into projects. |

## Safety defaults

- **Graph before grep:** planning consults `graphify-out/GRAPH_REPORT.md` and Graphify queries before raw file reads.
- **Plan before mutate:** mutating tools are blocked until `/harness-plan` approves and creates a plan.
- **No inline execution:** `/harness-run` delegates to `harness/running/executor` only.
- **No inline review:** `/harness-review` delegates verdicts to isolated reviewing agents.
- **No auto-merge:** final merge remains a human/operator decision.
- **Sentrux is the architecture signal:** structural baselines and gates inform review; executor does not optimize metrics as a goal.
- **ls-lint is the naming signal:** manifest-driven `.ls-lint.yml` enforces filesystem conventions; steward evolves rules via chair-approved proposals (ADR 0052).
- **pi-lens is edit-time diagnostics:** LSP/lint/format/ast feedback complements Sentrux and does not replace architecture gating.

## Troubleshooting

| Problem | Try |
|---|---|
| Setup fails | Confirm `node --version` is 18+, `npm --version` is 9+, then rerun `/harness-setup`. |
| No approved plan | Run `/harness-plan "<task>"`, then `/harness-run`. |
| Need to inspect handoff | Run `/harness-trace` or inspect `.pi/harness/runs/<run_id>/`. |
| Need to restart safely | Run `/harness-abort [reason]`, then create a fresh plan. |

| Need to prune old run history safely | Run `/harness-clear`; all run directories, including the active run, are eligible and confirmation failure/cancel deletes nothing. |
| Review says `implementation_gap` | Run `/harness-steer`, then `/harness-review`. |
| Review says `plan_gap` | Revise with `/harness-plan "<updated task>"`. |
| Sentrux missing | Install/configure Sentrux or keep it skipped; harness verification still reports the status. |
| ls-lint failures | Run `node .pi/scripts/harness-ls-lint-cli.mjs`, fix paths or propose manifest changes via `/harness-ls-lint-steward`. |

Optional integrations can be configured by copying `.env.example` to `.env`; `/harness-setup` appends missing keys without overwriting existing values.

## Contributing

Local development, harness internals, and quality gates: [CONTRIBUTING.md](./CONTRIBUTING.md), [`.pi/scripts/README.md`](.pi/scripts/README.md), and [`.pi/harness/docs/adrs/`](.pi/harness/docs/adrs/).
