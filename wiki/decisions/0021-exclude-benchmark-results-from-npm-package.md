# 0021 - Exclude benchmark result artifacts from npm package

- Date: 2026-04-25
- Status: Accepted

## Context
Running local Harbor jobs creates `jobs/` artifacts in repo root.
`npm pack --dry-run` showed `jobs/` files included in tarball.
User requirement: benchmark-related code/artifacts must not be published to npm.

## Alternatives
1. Keep as-is and rely on manual cleanup before publish.
2. Add `jobs/` to `.npmignore` so artifacts are always excluded.
3. Move jobs directory outside repo for every run.

## Chosen option
Adopt option 2.

## Rationale
- Deterministic publish safety.
- Smallest codebase change.
- No workflow friction for local benchmarking.

## Consequences
- Local benchmark artifacts remain available in repo working tree but never ship in npm tarballs.
