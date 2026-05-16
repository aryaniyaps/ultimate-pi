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

If something blocks, inspect the last run:

```text
/harness-trace-last
/harness-policy-status
```

## Commands

| Command | What it does |
|---------|----------------|
| `/harness-setup` | One-time project bootstrap (tools, harness dirs, extensions) |
| `/harness-auto "<task>"` | End-to-end pipeline (recommended) |
| `/harness-plan "<task>"` | Plan only (no code changes) |
| `/harness-run --plan <file>` | Execute an approved plan |
| `/harness-eval --run <run-id>` | Evaluation summary |
| `/harness-review --run <run-id>` | Independent review verdict |
| `/harness-critic --run <run-id>` | Adversarial review |
| `/harness-trace --run <run-id>` | Full trace for a run |
| `/harness-trace-last` | Summary of the most recent run |
| `/harness-policy-status` | Current policy / block reasons |
| `/harness-abort [reason]` | Stop and return to plan-only mode |

## Manual workflow

Use this when you want each step separate:

```text
/harness-plan "your task"
/harness-run --plan .pi/harness/runs/<run-id>/plan-packet.json
/harness-eval --run <run-id>
/harness-review --run <run-id>
/harness-critic --run <run-id>
```

## Defaults you should know

- **Model routing (vendored + gated)** — [`pi-model-router`](https://github.com/yeliu84/pi-model-router) ships inside this package (`vendor/pi-model-router/`). [`.pi/extensions/pi-model-router-harness.ts`](.pi/extensions/pi-model-router-harness.ts) activates it **only after** `.pi/model-router.json` exists (generation: `/harness-setup` Step 3.5), so **`router/auto` does not appear** beforehand. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). [`.pi/scripts/harness-sync-model-router.mjs`](.pi/scripts/harness-sync-model-router.mjs) may set **`defaultProvider`/`defaultModel`** to **`router`/`auto`** when the project sets no default — run **`/reload`** afterward. Do **not** add `npm:@yeliu84/pi-model-router` to `.pi/settings.json`; it duplicates the fork. Maintainer refresh: **`npm run vendor:sync-router`**.
- **Plan before mutate** — write/edit/shell that changes the repo is blocked until execute phase.
- **No auto-merge** — you decide when to open or merge a PR.
- **Structured runs** — each run writes artifacts under `.pi/harness/runs/` for replay and audit.

Optional: copy [`.env.example`](.env.example) to `.env` if you use PostHog or other integrations wired by `/harness-setup`.

## Troubleshooting

| Problem | Try |
|---------|-----|
| Setup fails | `node --version` (need 18+), rerun `/harness-setup` |
| Blocked in evaluate/review | Run review in a fresh session (isolation from execute) |
| Budget / scope stop | `/harness-budget-status`, narrow the task or split the plan |
| Test integrity warning | `/harness-test-integrity-last`, fix or justify test changes |

## Contributing

Local development, harness internals, and quality gates: [CONTRIBUTING.md](./CONTRIBUTING.md) and [`.pi/harness/README.md`](.pi/harness/README.md).
