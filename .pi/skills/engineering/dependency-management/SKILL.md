---
name: dependency-management
description: Prevent dependency sprawl and risky coupling to third-party or shared code. Use when adding, upgrading, replacing, or wrapping dependencies, libraries, tools, plugins, shared utilities, or platform services. Encourages reuse, isolation, compatibility checks, and lockfile discipline.
---

# Dependency Management

Use this skill before introducing or changing a dependency.

## Decision workflow

1. Check whether the project already has an equivalent dependency or local utility.
2. Decide whether the task needs a dependency or simple local code is safer.
3. Evaluate maintenance, license, security, size, compatibility, and operational risk.
4. Isolate third-party APIs behind a local boundary when they affect core code.
5. Keep dependency updates scoped and explain lockfile changes.
6. Add tests around behavior that depends on external packages or services.

## Guidelines

- Do not add dependencies for trivial transformations.
- Avoid leaking vendor-specific types across domain or public boundaries.
- Prefer stable, actively maintained dependencies already accepted by the project.
- Treat major upgrades as behavior-risk changes.
- Document why the dependency is needed when the choice is non-obvious.

## Verification

Run dependency-aware checks available in the project: install/lockfile validation, tests, build, security audit, or compatibility checks as appropriate to risk.
