![Ultimate PI banner](https://raw.githubusercontent.com/aryaniyaps/ultimate-pi/main/.github/banner-v2.png)

> The **ultimate AI coding harness** on top of [**pi.dev**](https://pi.dev).

## What this project is

`ultimate-pi` is a production-oriented harness for AI-assisted coding with strict safety and governance built in.

It gives you:

- A phase-based workflow (`plan -> execute -> evaluate -> adversary -> merge`)
- Enforcement that blocks unsafe behavior (for example, mutating code before planning)
- Structured artifacts in `.pi/harness/` for auditability and replay
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
- `/harness-trace-last`
- `/harness-debate-open`
- `/harness-debate-round`
- `/harness-debate-consensus`

## Harness artifacts and file layout

Primary harness directories:

- `.pi/harness/specs/` - JSON schemas for core contracts
- `.pi/harness/runs/` - per-run trace summaries + event indexes
- `.pi/harness/incidents/` - incident and policy override records
- `.pi/harness/debates/` - debate rounds, consensus packets, budget events
- `.pi/harness/router/` - router tuning proposals and apply flow scripts

Core contract schemas in `.pi/harness/specs/`:

- `PlanPacket`
- `RunTrace`
- `EvalVerdict`
- `AdversaryReport`
- `RoundResult`
- `ConsensusPacket`
- `BudgetExhausted`
- `IncidentRecord`
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

## Contributing

For local dev setup, lint/test commands, Firecrawl notes, extension details, and architectural quality gate workflow, see:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
