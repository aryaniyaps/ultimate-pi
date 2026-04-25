# 0012 - Align workflow runtime with npm Trusted Publishing requirements

- Date: 2026-04-25
- Status: Accepted

## Context
Publish workflow still fails authentication.
Trusted publisher mapping is already verified by user.
Remaining common causes include runtime mismatch: npm 11.5.1+ and Node 22.14+.

## Alternatives
1. Keep current Node 20 workflow.
2. Switch to token-based publish only.
3. Upgrade workflow runtime to Node 22.14+, ensure npm 11.5.1+, keep OIDC permissions.

## Chosen option
Upgrade workflow to Node 22.14.0 and add npm upgrade/verification step before publish.

## Rationale
- Directly addresses documented Trusted Publishing runtime requirements.
- Keeps secure OIDC model intact.
- Minimal focused diff in workflow only.

## Consequences
- Slightly longer workflow run due npm update step.
- Future runtime bumps may be needed when npm guidance changes.
