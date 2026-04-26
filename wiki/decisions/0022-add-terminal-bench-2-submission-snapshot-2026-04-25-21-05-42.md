# 0022 - Add Terminal-Bench 2.0 submission snapshot (2026-04-25__21-05-42)

- Date: 2026-04-25
- Status: Accepted

## Context
Need to prepare a leaderboard submission package from local Harbor run artifacts at `jobs/2026-04-25__21-05-42`.
Leaderboard requires submission content under `submissions/terminal-bench/2.0/<agent>__<model(s)>/` plus `metadata.yaml`.
Related prior decisions: 0019 (Harbor adapter) and 0021 (keep benchmark artifacts out of npm package).

## Alternatives
1. Keep run artifacts only in `jobs/` and ask maintainers to pull manually.
2. Copy exact run artifacts into a new submission folder with required metadata.
3. Re-run benchmark to regenerate artifacts in a different layout before submission.

## Chosen option
Adopt option 2.

## Rationale
- Smallest change to produce a valid submission package.
- Preserves original run outputs and reproducibility.
- Avoids re-running expensive benchmark jobs.

## Consequences
- Repository now contains submission snapshot under `submissions/terminal-bench/2.0/ultimate-pi__oracle/`.
- Future submissions should use new sibling folders and metadata updates.
