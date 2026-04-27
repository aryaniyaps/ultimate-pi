# ADR-001: Right-side pane for git autocommit status (REMOVED)

## Context
The auto-commit orchestrator previously displayed status via a right-side TUI overlay (`AutoCommitPaneComponent`). User requested removal of the entire pane.

## Decision
**Removed** the auto-commit pane entirely (2026-04-27).

Changes:
- Deleted `lib/auto-commit-pane.ts` (the `AutoCommitPaneComponent` class)
- Removed pane import, state fields, creation, updates, and teardown from `extensions/auto-commit-orchestrator.ts`
- Removed `extensions/auto-commit-pane.ts` from `package.json` `check:ts` script
- `setStatus()` retained as no-op for call-site compatibility; orchestrator still logs via `ctx.ui.notify()`

## Consequences
- No overlay or widget rendered for auto-commit status
- Status still surfaced via `ctx.ui.notify()` calls (footer bar)
- No `@mariozechner/pi-tui` dependency needed for pane rendering