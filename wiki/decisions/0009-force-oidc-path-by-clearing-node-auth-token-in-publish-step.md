# 0009 - Force OIDC path by clearing NODE_AUTH_TOKEN in publish step

- Date: 2026-04-25
- Status: Accepted

## Context
GitHub Actions publish job failed with npm E404 on PUT for ultimate-pi@0.1.2.
Job log shows NODE_AUTH_TOKEN present during publish step, which can force token auth path instead of Trusted Publishing OIDC.

## Alternatives
1. Keep workflow unchanged and only reconfigure npm settings.
2. Revert fully to long-lived NPM_TOKEN secret.
3. Keep Trusted Publishing and explicitly clear NODE_AUTH_TOKEN in publish step.

## Chosen option
Use Trusted Publishing and set NODE_AUTH_TOKEN to empty string for publish step.

## Rationale
- Prevents accidental fallback to stale/unauthorized token auth.
- Preserves secure OIDC-based publish flow.
- Minimal surgical workflow diff.

## Consequences
- Requires npm Trusted Publisher to be correctly configured.
- Any desired token-based publish would need explicit workflow change.
