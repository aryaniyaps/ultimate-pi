# 0004 - Publish package to npm as ultimate-pi

- Date: 2026-04-25
- Status: Accepted

## Context
User requested npm publication under package name ultimate-pi.
Current package metadata blocks publish (private true) and uses different name (ultimate-pi-package).

## Alternatives
1. Keep current package name and publish under existing metadata.
2. Publish under scoped name (for example @owner/ultimate-pi).
3. Rename package to ultimate-pi and remove publish block.

## Chosen option
Rename package.json name to ultimate-pi and remove private field so npm publish can succeed.

## Rationale
- Matches explicit user requirement.
- Keeps package unscoped and discoverable.
- Smallest metadata diff needed for publish.

## Consequences
- Package name must stay unique in npm registry.
- Future publishes require version bumps.
- Publish operation depends on local npm authentication.
