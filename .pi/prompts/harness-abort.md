---
description: Safely abort the current harness run and force clean re-entry.
argument-hint: "[optional reason]"
---

# harness-abort

Safely abort the current harness run in this session.

## What this does

- resets policy state to:
  - `phase: plan`
  - `approvedPlan: false`
  - `planId: null`
- clears active run `plan_ready` (plan files may remain on disk for forensics)
- records abort metadata for observability
- enables a hard safety lock that blocks mutating tools until a new approved plan is attached

## Usage

`/harness-abort [optional reason]`

Examples:

- `/harness-abort`
- `/harness-abort scope changed, restarting safely`

## Safety guarantees

- no mutating work should continue under the previous run context
- a fresh approved plan is required before mutation can resume

## Next step

Run:

`/harness-plan "<task>"`

Then:

`/harness-run`

(No `--plan` or run id required — the harness restores active context after replan.)
