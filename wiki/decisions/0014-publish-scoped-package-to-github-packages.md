# 0014 - Publish scoped package to GitHub Packages npm registry

- Date: 2026-04-25
- Status: Accepted

## Context
User requested package visibility in GitHub Packages npm registry.
Current pipeline publishes unscoped package ultimate-pi to npmjs.org only.
GitHub npm registry requires scoped package names.

## Alternatives
1. Keep npmjs-only publishing.
2. Rename canonical npm package to scoped name only.
3. Keep npmjs package as-is and publish second scoped variant to GitHub Packages.

## Chosen option
Add separate GitHub Actions workflow that publishes @aryaniyaps/ultimate-pi to GitHub Packages while preserving npmjs publish for ultimate-pi.

## Rationale
- Satisfies request to show package in GitHub Packages.
- Avoids breaking existing npm package consumers.
- Keeps changes isolated to CI workflow.

## Consequences
- Two package coordinates exist (ultimate-pi and @aryaniyaps/ultimate-pi).
- Release process publishes to two registries.
- Scoped name must remain aligned with repository owner.
