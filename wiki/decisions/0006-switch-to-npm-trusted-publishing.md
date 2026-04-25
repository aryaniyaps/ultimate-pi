# 0006 - Switch npm automation to Trusted Publishing (OIDC)

- Date: 2026-04-25
- Status: Accepted

## Context
User flagged npm warning: token-based automation has security risks.
Current workflow uses NPM_TOKEN secret for publish.

## Alternatives
1. Keep automation token secret (NPM_TOKEN).
2. Publish manually from local machine only.
3. Use npm Trusted Publishing with GitHub OIDC.

## Chosen option
Use npm Trusted Publishing. Remove token auth from workflow. Grant id-token permission and publish with provenance.

## Rationale
- Eliminates long-lived npm secret in GitHub.
- Aligns with npm security guidance for CI/CD.
- Produces provenance attestations for supply-chain trust.

## Consequences
- Must configure Trusted Publisher in npm package settings.
- Publish only works from linked repo/workflow context.
- Workflow must run on supported GitHub-hosted runner.
