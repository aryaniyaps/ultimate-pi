# 0010 - Simplify setup-node for npm Trusted Publishing

- Date: 2026-04-25
- Status: Accepted

## Context
Publish run still fails with ENEEDAUTH after Trusted Publisher setup.
Current workflow sets npm registry-url and explicitly sets NODE_AUTH_TOKEN empty.
This may keep npm on token-based auth path and bypass OIDC exchange.

## Alternatives
1. Keep current workflow and retry only.
2. Re-introduce npm token secret.
3. Remove registry auth shaping and let npm Trusted Publishing OIDC path run naturally.

## Chosen option
Use setup-node with node-version only. Remove registry-url and NODE_AUTH_TOKEN override.

## Rationale
- Avoids writing auth-specific npmrc configuration for token path.
- Aligns with minimal OIDC trusted publishing examples.
- Smallest workflow diff.

## Consequences
- Requires npm Trusted Publisher config to be correct.
- If Trusted Publishing unavailable, publish will fail until fallback token flow is re-added.
