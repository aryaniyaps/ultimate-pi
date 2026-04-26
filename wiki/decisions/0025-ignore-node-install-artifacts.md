# 0025 - Ignore Node installation artifacts in git

- Date: 2026-04-26
- Status: Accepted

## Context
Repository now uses Node dev dependencies (including `@mariozechner/pi-coding-agent`).
Local installs create large/generated artifacts (`node_modules`, package-manager logs/caches) that should not be committed.

## Alternatives
1. Keep current ignore list and rely on manual discipline.
2. Add ignore patterns for Node install artifacts.

## Chosen option
Adopt option 2.

## Rationale
- Prevents accidental commits of generated dependency trees.
- Reduces repo noise from local package manager logs/caches.
- Keeps source control focused on authored files.

## Consequences
- Local dependency artifacts are excluded by default.
- Developers can still force-add files explicitly if ever needed.
