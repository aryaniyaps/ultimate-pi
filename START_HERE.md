# Start Here

`ultimate-pi` is a Pi package that adds a governed workflow around AI-assisted coding. It does not replace Pi. It shapes how Pi plans work, executes changes, reviews results, and records evidence.

## Audience Guide

If you already know your role, start with [`DOCS_BY_AUDIENCE.md`](./DOCS_BY_AUDIENCE.md). It points you to the shortest correct reading path.
This page stays focused on the core overview.

## What This Repo Is
- A control layer for Pi.
- A set of Pi extensions, agents, skills, prompts, scripts, and harness artifacts.
- A repository that treats planning, review, telemetry, and structure checks as first-class work.

## What This Repo Is Not
- Not a general application template.
- Not a one file prompt pack.
- Not a loose collection of helper scripts.
- Not designed for silent, unreviewed mutation.

## The Short Mental Model
- Pi is the host.
- `ultimate-pi` is the policy and workflow layer.
- Extensions enforce runtime behavior.
- Agents handle phase specific work.
- Skills provide reusable instructions.
- Scripts bootstrap, verify, and sync.
- Files under `.pi/harness/` store the run record.

## The Standard Path
Use `/harness-auto "<task>"` for most work. It is the simplest supported path. Use the phase commands only when you want to inspect or control each step.

## The Main Phases
- Plan: gather evidence, decompose the task, validate the shape of the work, and approve the plan.
- Run: execute only against the approved plan.
- Review: verify the result with deterministic checks and independent review.
- Steer: repair only the approved gap.

## What To Check Before You Edit
- The task should fit the harness model.
- The relevant docs should be read first.
- The change should stay within the approved scope.
- The right artifact files should be updated, not rewritten ad hoc.

## Safety Rules
- Do not skip planning when the harness expects it.
- Do not widen scope silently.
- Do not treat review as optional.
- Do not change vendored code casually.
- Do not change Graphify or Sentrux behavior without reading their docs.

## Files To Know First
- `package.json`
- `README.md`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `.pi/harness/README.md`
- `.pi/harness/docs/adrs/README.md`
- `.pi/scripts/README.md`
- `docs/posthog-plan-latency-dashboard.md`

## Where State Lives
- `.pi/harness/active-run.json`
- `.pi/harness/runs/<run_id>/plan-packet.yaml`
- `.pi/harness/runs/<run_id>/research-brief.yaml`
- `.pi/harness/runs/<run_id>/artifacts/`
- `.pi/harness/incidents/`

## What Good Work Looks Like Here
- Small and explicit scope.
- Clear gates.
- Durable artifacts.
- Measurable behavior.
- No hidden side effects.
