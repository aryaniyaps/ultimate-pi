---
description: Safely delete historical harness run directories while preserving the active run.
---

# harness-clear

Delete only historical run directories under `.pi/harness/runs/`.

## What this does

- enumerates delete candidates strictly from `.pi/harness/runs/<run_id>/`
- always preserves active run ids discovered from session context and active-run pointer
- asks for one confirmation before any filesystem mutation
- fails closed: cancel/decline/timeout/error/unavailable confirmation paths delete nothing
- reports deleted vs protected/skipped counts

## Usage

`/harness-clear`

## Safety boundaries

- in scope: historical run directories only
- out of scope: full `.pi/harness/` reset, non-run harness assets, active-run deletion overrides
- confirmation is mandatory; non-affirmative outcomes are no-op
