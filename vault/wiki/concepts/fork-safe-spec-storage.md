---
type: concept
title: "Fork-Safe Spec Storage"
status: developing
created: 2026-04-30
updated: 2026-04-30
tags:
  - harness
  - spec-storage
  - github-issues
  - fork
  - multi-tenant
  - isolation
related:
  - "[[Research: GitHub Issues as Harness Spec Storage]]"
  - "[[content-addressed-spec-identity]]"
  - "[[spec-hardening]]"
  - "[[harness-implementation-plan]]"
sources:
  - "[[github-fork-issues-discussion]]"
  - "[[Research: GitHub Issues as Harness Spec Storage]]"

---# Fork-Safe Spec Storage

How ultimate-pi's harness keeps spec storage isolated across forks. When someone forks a project using ultimate-pi, zero upstream spec state leaks into the fork.

## The Problem

| Threat | Mechanism |
|--------|-----------|
| Stale local cache | `.pi/harness/specs/<id>.json` committed to git → forked with upstream issue URLs |
| Empty issue tracker | Fork's Issues tab is disabled by default (historical) or starts empty (post-Dec 2025) |
| Wrong repo context | `gh` CLI authenticated to upstream, not fork |
| Divergent issue numbers | Fork issue #5 ≠ upstream issue #5. Merge = collision |

## The Solution: Three-Layer Isolation

### Layer 1: Gitignored Runtime Cache

`.pi/harness/specs/` is in `.gitignore`. The cache is, by definition, runtime-only. It's never committed, never pushed, never forked. Each clone starts fresh.

**Rationale**: The local JSON is a **speed cache**, not a source of truth. GitHub Issues are the durable store. Caches should never be version-controlled.

### Layer 2: `harness init` Bootstrap

On first run in any repo (fork or not), `ultimate-pi harness init`:

```
ultimate-pi harness init
  ├─ Detect fork: gh repo view --json isFork
  ├─ Enable Issues: if disabled, guide user or auto-enable via API
  ├─ gh auth check: prompt login if missing
  ├─ gh repo set-default: point to current repo (fork, not upstream)
  ├─ Create labels: gh label create harness-spec, harness-task, layer-1..8, status:*
  ├─ Create templates: .github/ISSUE_TEMPLATE/harness-spec.yml
  ├─ Gitignore: ensure .pi/harness/specs/ is in .gitignore
  └─ Done. Idempotent — re-running is a no-op.
```

### Layer 3: GitHub's Native Repo Scoping

GitHub Issues are scoped to a repository. A fork is a separate repository. Upstream's issues are never copied to forks. Each fork creates its own issues in its own namespace.

| Scope | Upstream (`owner/project`) | Fork (`forker/project`) |
|-------|---------------------------|------------------------|
| Issue #1 | "Initial spec: auth system" | (empty — fork starts fresh) |
| Issue #2 | "Bug: memory leak" | (empty) |
| After `harness init` | Unchanged | Issue #1: "Spec: forker's first feature" |

## Why Labels Instead of Issue Numbers

Labels are the only shared artifact between upstream and fork. This is by design:

- **Labels are convention, not data**. `harness-spec`, `layer-3`, `status:active` are semantic tags that mean the same thing in any repo.
- **Labels are cheap to recreate**. `harness init` creates them in 8 API calls.
- **Labels don't collide**. Issue #5 in upstream with `harness-spec` and issue #5 in fork with `harness-spec` are different issues with the same semantic category. No conflict.

## The Merge Problem — SOLVED

Fork issue #5 and upstream issue #5 are different specs. When code merges, spec identities must be reconciled. **Solution**: Content-addressed spec identity via `SHA256` fingerprinting + `gh issue transfer` API. See [[content-addressed-spec-identity]] for the full creative architecture.

Summary: every spec carries a content hash in its issue body (`<!-- spec-fp: <hash> -->`). Harness resolves by hash search across repos, not by brittle issue numbers. `ultimate-pi harness migrate` transfers specs from fork to upstream on merge. Idempotent, ~2-3 days to implement.

## Enforcement

- L7 Schema Orchestration enforces that every harness run checks `gh repo view` before creating issues
- `harness init` is a prerequisite gate — harness refuses to create issues until init completes
- Config file `.pi/harness/config.json` stores the canonical repo for issue operations
- Runtime validation: if `gh repo view --json nameWithOwner` doesn't match config, harness warns and offers re-init
