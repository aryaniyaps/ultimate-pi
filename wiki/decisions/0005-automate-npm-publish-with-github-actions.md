# 0005 - Automate npm publish with GitHub Actions

- Date: 2026-04-25
- Status: Accepted

## Context
User requested automated package publishing through GitHub Actions.
Repository currently has no workflow files.
Package already prepared for npm publish as ultimate-pi.

## Alternatives
1. Keep manual local npm publish only.
2. Publish on every push to main.
3. Publish on version tags with optional manual trigger.

## Chosen option
Create a GitHub Actions workflow that publishes to npm on tags matching v* and supports manual dispatch.

## Rationale
- Safe release gate with explicit version tags.
- Standard npm automation pattern.
- Keeps accidental publishes low risk.

## Consequences
- Maintainer must create npm token and store as NPM_TOKEN secret.
- Release process must include tag creation.
- Version in package.json must be bumped before tagging.
