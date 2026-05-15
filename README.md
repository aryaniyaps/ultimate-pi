![Ultimate PI banner](https://raw.githubusercontent.com/aryaniyaps/ultimate-pi/main/.github/banner-v2.png)

> The **ultimate AI coding harness** on top of [**pi.dev**](https://pi.dev).

## What this project is

`ultimate-pi` is a production-oriented harness for AI-assisted coding with strict safety and governance built in.

It gives you:

- A phase-based workflow (`plan -> execute -> evaluate -> adversary -> merge`)
- Enforcement that blocks unsafe behavior (for example, mutating code before planning)
- Structured artifacts in `.pi/harness/` for auditability and replay
- Canonical contracts (`HarnessRunRecord`, observations, harness PostHog events) and team ADRs
- Dual PostHog analytics: LLM spans (`$ai_*`) plus harness domain events (`harness_*`)
- A practical bootstrap command that sets up tools, graph, and runtime integrations

If you are new: start with the **Quick Start** section and run one task through the full pipeline.

## 5-minute quickstart

If you just want to get started fast:

1. Install into your current project:

```bash
pi install npm:ultimate-pi
/reload
```

2. Bootstrap the harness:

```text
/harness-setup
```

3. Run your first task:

```text
/harness-auto "implement feature X safely"
```

That command runs the strict pipeline:
`plan -> execute -> evaluate -> adversary -> policy decision`.

If it blocks, inspect with:

```text
/harness-trace-last
/harness-policy-status
```

## Table of Contents

- [5-minute quickstart](#5-minute-quickstart)
- [How the harness works](#how-the-harness-works)
- [Harness Phase 2 (developers)](#harness-phase-2-developers)
- [PostHog and harness telemetry](#posthog-and-harness-telemetry)
- [Verify your harness install](#verify-your-harness-install)
- [Prerequisites](#prerequisites)
- [Quick Start (new users)](#quick-start-new-users)
- [Run your first harness task](#run-your-first-harness-task)
- [Command reference](#command-reference)
- [Harness artifacts and file layout](#harness-artifacts-and-file-layout)
- [Safety and governance defaults](#safety-and-governance-defaults)
- [Router tuning flow](#router-tuning-flow)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## How the harness works

The harness enforces a deterministic execution lifecycle:

1. **Plan**  
   Create a `PlanPacket` before any mutating work.
2. **Execute**  
   Implement only within the approved plan scope.
3. **Evaluate**  
   Run independent evaluation and produce an `EvalVerdict`.
4. **Adversary**  
   Run adversarial review and produce an `AdversaryReport`.
5. **Policy / Merge decision**  
   Debate consensus + severity policy decides `pass`, `conditional_pass`, `block`, or `human_required`.

### Why this matters

- You get fewer silent mistakes.
- Reviews are reproducible, not opinion-only.
- Incidents and overrides are recorded in structured, machine-readable artifacts.

## Harness Phase 2 (developers)

Phase 2 adds machine-readable contracts, observability, and deterministic checks on top of the phase workflow above. You do not need to read every ADR to use the harness; run `/harness-auto` and `npm run harness:verify` first, then drill down when you are changing behavior.

**What shipped**

- **Contracts** in `.pi/harness/specs/` — including `HarnessRunRecord`, `HarnessPostHogEvent`, and `HarnessObservation` (see [specs README](.pi/harness/specs/README.md))
- **Extensions** (auto-loaded from `.pi/extensions/`) — `trace-recorder`, `harness-telemetry`, `observation-bus`, `drift-monitor`, plus existing governance extensions
- **ADRs** — team-shared decisions in [`.pi/harness/docs/adrs/`](.pi/harness/docs/adrs/README.md) (0001–0008)
- **Skills** — `harness-spec`, `harness-plan`, `harness-governor`, `harness-eval`, `harness-context` (context-mode only)
- **Smoke evals** — `.pi/harness/evals/smoke/` (fixtures only; no CI LLM)
- **Evolution** — `.pi/harness/evolution/` (self-healing rules, meta-optimizer)

**Typical flows**

| Goal | Command |
|------|---------|
| End-to-end task (strict pipeline) | `/harness-auto "<task>"` |
| Check schemas, fixtures, and extension wiring | `npm run harness:verify` |
| Last run trace summary | `/harness-trace-last` |
| Telemetry config | `/harness-telemetry-status` |

For extension internals, env vars, and verification details, see [`.pi/harness/README.md`](.pi/harness/README.md) and [CONTRIBUTING.md](./CONTRIBUTING.md#harness-governance-extensions).

## PostHog and harness telemetry

ultimate-pi uses **two PostHog layers** on the same project key (`POSTHOG_API_KEY`, project `ultimate-pi`):

| Layer | Source | Events | Purpose |
|-------|--------|--------|---------|
| LLM analytics | `@posthog/pi` | `$ai_generation`, `$ai_span`, `$ai_trace` | Model/tool usage and latency |
| Harness domain | `harness-telemetry.ts` | `harness_run_started`, `harness_run_completed`, `harness_policy_violation`, … | Governance KPIs and run correlation |

Copy [`.env.example`](.env.example) to `.env` and set at minimum:

- `POSTHOG_API_KEY` — project API key
- `POSTHOG_PROJECT_NAME=ultimate-pi`
- `HARNESS_TELEMETRY_ENABLED=true` — set `false` to disable **only** `harness_*` captures (LLM layer unchanged)
- `POSTHOG_PRIVACY_MODE` — when `true`, harness properties strip paths (counts/enums only)

**Verify `harness_*` events**

1. Ensure env vars above are set; run `/harness-telemetry-status` in a pi session.
2. Run `/harness-auto "smoke task"` (or any harness run that completes).
3. In PostHog → **Live events**, filter `event` contains `harness_`.
4. Confirm `harness_run_started` and `harness_run_completed` share the same `harness_run_id`.

Event catalog and dashboard seed queries: [ADR 0008](.pi/harness/docs/adrs/0008-harness-posthog-telemetry.md).

## Verify your harness install

After `/harness-setup` or when changing harness specs/extensions:

```bash
npm run harness:verify
```

This runs deterministic checks (schemas, smoke fixtures, extension registration) without calling an LLM. Fix any reported errors before relying on `/harness-auto` in production workflows.

Optional: set `HARNESS_SENTRUX_REQUIRED=true` in `.env` if your environment must assert Sentrux stub wiring (see `.env.example`).

## Prerequisites

Minimum recommended environment:

- `node >= 18`
- `npm >= 9`
- `git`
- `python >= 3.10` (for Graphify workflow)

Optional but commonly used:

- `gh` CLI for GitHub workflow
- Docker (only if you want self-hosted Firecrawl)

## Quick Start (new users)

From your project folder:

```bash
pi install npm:ultimate-pi
/reload
```

Run the full bootstrap:

```text
/harness-setup
```

`/harness-setup` is idempotent and designed as the one-command initializer for:

- Graphify knowledge graph setup
- CLI tool installation and checks
- Harness/runtime directory scaffolding
- Extension package verification
- Model-router bootstrap configuration

## Run your first harness task

### Fastest path

Use the one-command pipeline:

```text
/harness-auto "implement feature X safely"
```

This runs:

`plan -> execute -> evaluate -> adversary -> policy decision -> commit/PR (no auto-merge)`

### Manual path (recommended for learning)

1. Plan

```text
/harness-plan "implement feature X safely"
```

2. Execute with approved plan:

```text
/harness-run --plan <path-to-plan-packet.json>
```

3. Evaluate:

```text
/harness-eval --run <run-id>
/harness-review --run <run-id>
```

4. Adversarial review:

```text
/harness-critic --run <run-id>
```

5. If blocked or ambiguous, record incident:

```text
/harness-incident --run <run-id> --trigger "<reason>"
```

6. Trace/debug:

```text
/harness-trace --run <run-id>
```

## Command reference

### Core workflow commands

- `/harness-setup` - bootstrap complete environment and harness scaffolding
- `/harness-auto "<task>"` - run strict end-to-end pipeline
- `/harness-plan "<task>"` - generate read-only `PlanPacket`
- `/harness-run --plan <file>` - execute approved scope only
- `/harness-eval --run <run-id>` - benchmark/evaluation summary
- `/harness-review --run <run-id>` - independent evaluator verdict
- `/harness-critic --run <run-id>` - adversarial findings and merge-block signal
- `/harness-incident --run <run-id> --trigger "<reason>"` - incident record
- `/harness-trace --run <run-id>` - replay and artifact completeness
- `/harness-abort [reason]` - reset safely to plan phase and lock mutation until new plan

### Operational/status commands

- `/harness-policy-status`
- `/harness-budget-status`
- `/harness-review-integrity-status`
- `/harness-test-integrity-last`
- `/harness-trace-last` — compact summary of the most recent run trace + `HarnessRunRecord`
- `/harness-telemetry-status` — PostHog harness layer config and session flush count
- `/harness-debate-open`
- `/harness-debate-round`
- `/harness-debate-consensus`

## Harness artifacts and file layout

Primary harness directories:

- `.pi/harness/specs/` — JSON schemas for core contracts
- `.pi/harness/runs/` — per-run trace summaries, `HarnessRunRecord`, event indexes
- `.pi/harness/incidents/` — incident and policy override records
- `.pi/harness/debates/` — debate rounds, consensus packets, budget events
- `.pi/harness/router/` — router tuning proposals and apply flow scripts
- `.pi/harness/docs/adrs/` — Architectural Decision Records ([index](.pi/harness/docs/adrs/README.md))
- `.pi/harness/evals/smoke/` — deterministic smoke fixtures
- `.pi/harness/evolution/` — self-healing rules and meta-optimizer (JSONL-first)

Core contract schemas in `.pi/harness/specs/`:

- `PlanPacket`, `RunTrace`, `HarnessRunRecord`
- `HarnessPostHogEvent`, `HarnessObservation`
- `EvalVerdict`, `AdversaryReport`
- `RoundResult`, `ConsensusPacket`
- `BudgetExhausted`, `IncidentRecord`
- `RouterTuningProposal`

## Safety and governance defaults

The harness intentionally locks in these behaviors:

- **Plan-before-mutate**: write/edit/mutating shell commands blocked outside execute phase
- **Mandatory adversarial review** in the strict pipeline
- **Review isolation**: evaluator/adversary cannot share executor session context
- **Budget hard-stops** with structured `budget_exhausted` events
- **Test-diff integrity checks** for suspicious test weakening patterns
- **Severity policy thresholds**:
  - block if `security >= 0.70` or `correctness >= 0.70`
  - block if `architecture >= 0.80` or `test_integrity >= 0.80`
- **Override policy**: single human approver with explicit justification
- **Never auto-merge**

## Router tuning flow

Router changes are two-step and approval-gated:

1. Propose (no live mutation):

```bash
node .pi/harness/router/propose-router-tuning.mjs \
  --evidence /path/to/evidence.json \
  --candidate /path/to/candidate-router.json \
  --proposal-out .pi/harness/router/proposals/proposal-001.json
```

2. Apply (explicit human approval + justification + `--write`):

```bash
node .pi/harness/router/apply-router-proposal.mjs \
  --proposal .pi/harness/router/proposals/proposal-001.json \
  --approve-by "human.name" \
  --justification "why this is safe" \
  --write
```

Blind writes to `.pi/model-router.json` are intentionally disallowed.

## Troubleshooting

### `/harness-setup` fails early

- Check `node --version`, `npm --version`, `git --version`
- Ensure Node is at least 18

### Graphify not available

- Install Python 3.10+
- Then install Graphify and build/update graph

### Review/integrity blocks in evaluate/adversary phase

- This means review is not isolated from execute context
- Fork/switch session, then rerun review commands

### Budget hard-stop triggers

- Use `/harness-budget-status`
- Reduce scope, split task, or restart with a narrower plan

### Suspicious test diff warning

- Use `/harness-test-integrity-last`
- Restore or justify test changes; expect adversarial scrutiny

### No `harness_*` events in PostHog

- Run `/harness-telemetry-status` — confirm `POSTHOG_API_KEY` is set and `HARNESS_TELEMETRY_ENABLED` is not `false`
- Complete a full run (`/harness-auto` or `/harness-run` through `agent_end`) so `harness-telemetry` can flush
- Filter Live events for `harness_`, not `$ai_*` (those come from `@posthog/pi` only)

### `npm run harness:verify` fails

- Read the script output for the first schema or fixture mismatch
- Compare your change against [`.pi/harness/specs/`](.pi/harness/specs/) and [ADR 0002](.pi/harness/docs/adrs/0002-harness-run-record.md) if you edited run/trace shapes

## Contributing

For local dev setup, lint/test commands, Firecrawl notes, harness extension details, and architectural quality gate workflow, see:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [`.pi/harness/README.md`](.pi/harness/README.md) — scaffold layout, verification, governance extensions
