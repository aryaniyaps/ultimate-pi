![Ultimate PI banner](https://raw.githubusercontent.com/aryaniyaps/ultimate-pi/main/.github/banner-v2.png)

> The **ultimate AI coding harness** on top of [**pi.dev**](https://pi.dev).

`ultimate-pi` is a pi package that adds a governed coding workflow: plan first, then implement, then independent review—so agents cannot silently skip planning or merge unsafe changes.

## Quick start

**Requirements:** Node 18+, npm 9+, git.

1. **Install** (from your project directory):

```bash
pi install npm:ultimate-pi
/reload
```

2. **Bootstrap** (once per project):

```text
/harness-setup
```

3. **Run a task** (full pipeline in one command):

```text
/harness-auto "implement feature X safely"
```

That runs: plan → execute → evaluate → adversary → policy decision. It does **not** auto-merge.

If something blocks, inspect status (no run id needed):

```text
/harness-run-status
/harness-policy-status
/harness-trace-last
```

## Commands

| Command | What it does |
|---------|----------------|
| `/harness-setup` | One-time project bootstrap (tools, harness dirs, extensions) |
| `/harness-auto "<task>"` | End-to-end pipeline (recommended) |
| `/harness-plan "<task>"` | Create or **revise** the active plan in context (no plan path to copy) |
| `/harness-run` | Execute the active plan from context (**no `--plan`** on happy path) |
| `/harness-eval` | Eval for active run (optional `--run`; **new session** after execute) |
| `/harness-review` | Independent review (optional `--run`) |
| `/harness-critic` | Adversarial review (optional `--run`) |
| `/harness-trace` | Trace summary (optional `--run`) |
| `/harness-run-status` | Where you are + what to run next (no run id shown) |
| `/harness-new-run` | Abandon current run and start fresh |
| `/harness-use-run <id>` | Advanced recovery only |
| `/harness-trace-last` | Last phase / handoff (no run id) |
| `/harness-policy-status` | Current policy / block reasons |
| `/harness-abort [reason]` | Stop and replan path |

## Manual workflow

Use this when you want each step separate:

```text
/harness-plan "your task"
/harness-run
# New Pi session (review isolation):
/harness-eval
/harness-review
/harness-critic
```

The harness **remembers the active run and plan** per project — you do not pass `plan-packet.json` paths or run ids between steps. The live widget shows phase/policy; after each step the agent (and UI notify) suggests the next command.

Recovery: `--run` and `--plan` remain for scripts; `/harness-use-run` and `/harness-run-status` for operators.

## Defaults you should know

- **System prompt** — [`.pi/extensions/00-ultimate-pi-system-prompt.ts`](.pi/extensions/00-ultimate-pi-system-prompt.ts) sets the base prompt from packaged [`.pi/SYSTEM.md`](.pi/SYSTEM.md), or from your workspace override **`.pi/system.md`** (lowercase) if you create one. Nothing is copied into your project by default. After upgrading the package or editing either file, run **`/reload`**.
- **Model routing (vendored + gated)** — [`pi-model-router`](https://github.com/yeliu84/pi-model-router) ships inside this package (`vendor/pi-model-router/`). [`.pi/extensions/pi-model-router-harness.ts`](.pi/extensions/pi-model-router-harness.ts) activates it **only after** `.pi/model-router.json` exists (generation: `/harness-setup` Step 3.5), so **`router/auto` does not appear** beforehand. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). [`.pi/scripts/harness-sync-model-router.mjs`](.pi/scripts/harness-sync-model-router.mjs) may set **`defaultProvider`/`defaultModel`** to **`router`/`auto`** when the project sets no default — run **`/reload`** afterward. Do **not** add `npm:@yeliu84/pi-model-router` to `.pi/settings.json`; it duplicates the fork. Maintainer refresh: **`npm run vendor:sync-router`**.
- **Active run + plan context** — PlanPacket lives at a fixed path per run; the extension injects it for `/harness-plan` (revise) and `/harness-run` (execute). Session state plus `.pi/harness/active-run.json`; no run ids or plan paths to copy.
- **Review isolation** — run evaluate/review/critic in a **new session** after execute (see troubleshooting).
- **Concurrent plans** — a second `/harness-plan` while a run is active is blocked until `/harness-abort` or `/harness-new-run` (except drift replan / amend after `needs_clarification`).
- **Plan before mutate** — write/edit/shell that changes the repo is blocked until execute phase.
- **No auto-merge** — you decide when to open or merge a PR.
- **Structured runs** — each run writes artifacts under `.pi/harness/runs/` for replay and audit.

Optional: copy [`.env.example`](.env.example) to `.env` if you use PostHog or other integrations wired by `/harness-setup`.

## Troubleshooting

| Problem | Try |
|---------|-----|
| Setup fails | `node --version` (need 18+), rerun `/harness-setup` |
| "No active run" on eval | Finish plan+run first, or `/harness-run-status`; open a new session for eval |
| Forgot where you left off | `/harness-run-status` |
| Second plan rejected | `/harness-abort` or `/harness-new-run` |
| Blocked in evaluate/review | Run review in a fresh session (isolation from execute) |
| High plan drift | `harness-drift-replan` or abort then replan (ADR 0007) |
| Budget / scope stop | `/harness-budget-status`, narrow the task or split the plan |
| Test integrity warning | `/harness-test-integrity-last`, fix or justify test changes |

## Contributing

Local development, harness internals, and quality gates: [CONTRIBUTING.md](./CONTRIBUTING.md) and [`.pi/harness/README.md`](.pi/harness/README.md).
