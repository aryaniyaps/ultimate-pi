# ADR 0055: Auto-commit co-author lifecycle

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

Harness agents and `/harness-auto` frequently commit after review. Attribution should credit **pi-mono** (or a project-configured bot) via GitHub `Co-authored-by` trailers. Message shape should be consistent and configurable for external repos installing `ultimate-pi` via npm.

Prior state: `.pi/auto-commit.json` existed with `coAuthor` and `scopeDefault`, but agents used ad-hoc `git commit -m` (e.g. `release.md` hardcoded trailers). No deterministic formatter or skill contract.

## Decision

1. **Canonical config:** `.pi/auto-commit.json` at project root (seeded from package template on bootstrap).
2. **Merge:** Project file deep-merges over `$UP_PKG/.pi/auto-commit.json`; project `coAuthor` **fully replaces** package co-author fields after merge (no forced pi-mono when project overrides).
3. **CLI:** `harness-git-commit.mjs` — format message, append trailer idempotently, `git commit -F` (argv spawn, no shell), supports `--amend`, `--dry-run`, `--print-message`, `--root`.
4. **Bootstrap:** `harness-auto-commit-bootstrap.mjs` seeds project config when missing; personalizes `message.scopeDefault`.
5. **Skill:** `harness-git-commit` — agents must use CLI; raw `git commit` forbidden in skill text.
6. **Enforcement:** Skill + prompts + `harness-verify` contract only — **no** `commit-msg` git hook (v1).
7. **Schema:** `.pi/harness/specs/auto-commit.schema.json` for validation and seeding.

## Consequences

### Positive

- One path for agent commits with configurable conventional-commit templates.
- External projects customize format and co-author without forking the package.

### Negative

- Bypass remains possible (raw git, subagents, gstack `/ship`, humans).
- Submodule commits at nested roots do not pick up project config unless `--root` points at owner repo.
- Squash merges on GitHub may drop co-authors — documented limitation.

## References

- `.pi/auto-commit.json`, `.pi/lib/harness-auto-commit-config.mjs`
- `.pi/scripts/harness-git-commit.mjs`, `harness-auto-commit-bootstrap.mjs`
- `.agents/skills/harness-git-commit/SKILL.md`
- ADR 0052 (parallel bootstrap/sync pattern for ls-lint)
