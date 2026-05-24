---
name: documentation-update
description: Update documentation only where it helps future work. Use when behavior, setup, contracts, commands, architecture decisions, operational procedures, or user-facing workflows change. Avoids redundant comments while capturing decisions, invariants, examples, and caveats near the relevant surface.
---

# Documentation Update

Use this skill when code changes affect how people or agents should use, operate, or maintain the system.

## What to document

- public contracts and compatibility notes
- behavior changes and examples
- setup/configuration changes
- operational caveats and failure modes
- invariants not obvious from code
- design decisions and rejected alternatives
- migration or rollback procedures

## Workflow

1. Identify who needs the documentation: user, maintainer, operator, integrator, or future agent.
2. Update the nearest authoritative doc rather than creating duplicates.
3. Keep examples current and minimal.
4. Remove or correct stale docs when behavior changes.
5. Prefer comments for local non-obvious why; prefer docs for broader usage or process.
6. Verify links, commands, and paths when practical.

## Avoid

- Comments that merely restate obvious code.
- New docs that duplicate existing sources of truth.
- Documentation promises not enforced by tests or code.
