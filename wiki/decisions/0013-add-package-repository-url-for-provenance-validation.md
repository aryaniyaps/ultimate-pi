# 0013 - Add package repository URL for provenance validation

- Date: 2026-04-25
- Status: Accepted

## Context
Trusted publishing auth now passes, but publish fails with npm E422 provenance validation.
Error states package.json repository.url is empty and must match https://github.com/aryaniyaps/ultimate-pi.

## Alternatives
1. Disable provenance flag in publish command.
2. Keep failing publish and document manual workaround.
3. Add exact repository URL metadata in package.json to satisfy provenance validation.

## Chosen option
Add package.json repository metadata with URL https://github.com/aryaniyaps/ultimate-pi.

## Rationale
- Fixes current hard failure from npm provenance verifier.
- Keeps secure --provenance publish mode.
- Minimal metadata-only package diff.

## Consequences
- Repository URL must stay accurate.
- If repo moves, metadata must be updated before next publish.
