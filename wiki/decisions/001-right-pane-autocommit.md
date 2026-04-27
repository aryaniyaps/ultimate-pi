# ADR-001: Right-side pane for git autocommit status

## Context
The auto-commit orchestrator shows status via `ctx.ui.setStatus()` which renders in the footer bar below the prompt. User wants git autocommit status and details displayed in a right-side pane, not below the prompt.

## Decision
Create an `AutoCommitPaneComponent` that renders as a TUI overlay anchored to `top-right`. The overlay is managed via `tui.showOverlay()` from `@mariozechner/pi-tui`. The pane displays:
- Current status (idle, checking, committed, pushed, blocked, disabled)
- Session commit count
- Last commit branch
- Blocked reason (if any)
- Config state (enabled, dry-run, AI mode)

Also keep `ctx.ui.setStatus()` for the footer bar — the pane is supplementary, not a replacement.

## Alternatives considered
1. **`setWidget` with `placement: "aboveEditor"`** — renders above prompt, not on the right. Rejected.
2. **Pure `setWidget` with string content** — no positioning control. Rejected.
3. **`showOverlay` with `anchor: "right-center"`** — vertically centered. "top-right" keeps it near the conversation area. Chose top-right.
4. **Remove footer status entirely** — losing backward compat. Kept both.

## Consequences
- Right pane overlays the conversation area at top-right; can be dismissed naturally on resize.
- Pane width is configurable (defaults to 30 columns).
- The overlay approach requires holding an `OverlayHandle` and calling `.hide()` on session shutdown.
- Depends on `@mariozechner/pi-tui` (already a dependency of pi-coding-agent).