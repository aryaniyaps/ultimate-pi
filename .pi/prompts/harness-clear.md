---
description: Safely delete all harness run directories, including the active run.
---

# harness-clear

Delete all run directories under `.pi/harness/runs/`, including the current active run.

## What this does

- enumerates delete candidates strictly from `.pi/harness/runs/<run_id>/`
- includes active run ids discovered from session context and the active-run pointer
- asks for one confirmation before any filesystem mutation
- fails closed: cancel/decline/timeout/error/unavailable confirmation paths delete nothing
- clears `.pi/harness/active-run.json` and reports deleted vs skipped counts

## Usage

`/harness-clear`

## Safety boundaries

- in scope: all run directories plus `.pi/harness/active-run.json`
- out of scope: full `.pi/harness/` reset and non-run harness assets
- confirmation is mandatory; non-affirmative outcomes are no-op
