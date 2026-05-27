# ADR 0054: Harness-native ask_user with Glimpse presenters

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

Harness orchestrators need structured human decisions (`ask_user`) during setup, Phase 0 task clarification, and governance forks. Terminal-only prompts are hard to scan for multi-dimensional forks. [@alexleekt/pi-ask-user-glimpse](https://www.npmjs.com/package/@alexleekt/pi-ask-user-glimpse) ships a rich WebView UI, but installing it as a second Pi extension would duplicate tool registration and couple harness policy to upstream extension lifecycle.

## Decision

1. **Single tool registration** — [`.pi/extensions/harness-ask-user.ts`](../../../extensions/harness-ask-user.ts) registers `ask_user` and delegates to [`runAskUser`](../../../lib/ask-user/index.ts).
2. **Domain module** — [`.pi/lib/ask-user/`](../../../lib/ask-user/): `types`, `schema`, `validate`, `format`, `policy`, `merge-task-clarification`, `core/questionnaire`.
3. **Presenter stack** (UI only) — `presenters/tui.ts`, `presenters/headless.ts`, `presenters/glimpse.ts`, routed by `presenters/select.ts`.
4. **Glimpse as npm dependency** — pinned in [`.pi/npm/package.json`](../../../npm/package.json) (`@alexleekt/pi-ask-user-glimpse`, `glimpseui`). Harness-owned payload builder + parser in `contracts/`; no import of glimpse’s private `tool/ask-user.ts`.
5. **Response shape** — `AskResponse` includes `kind: "questionnaire"` with `questionnaireDetails[]` (aligned with glimpse, not a parallel `answers` array).
6. **Routing** — `HARNESS_ASK_USER_UI=auto|tui|glimpse|headless`. `displayMode: "inline"` always uses TUI. Glimpse failure degrades to TUI with `details.ui_degraded: true`. Non-interactive sessions short-circuit via `isHarnessNonInteractive()`.
7. **Plan approval** — remains on `approve_plan` only; `isPlanApprovalAskUser` in `policy.ts` rejects mistaken plan-approval-shaped `ask_user` calls.
8. **Formatting** — only [`format.ts`](../../../lib/ask-user/format.ts) emits tool `content` text; presenters return structured `DialogResult`.

## Consequences

### Positive

- One `ask_user` contract for agents; swappable UI without policy forks.
- Questionnaire mode supports Phase 0 multi-fork clarification in one tool call.
- WSL/CI can force TUI or headless without removing glimpse for desktop users.

### Negative

- Glimpse bundle adds weight to `.pi/npm` installs (~3.5 MB web assets).
- `timeout` applies to TUI/headless only in v1; glimpse relies on user Cancel.
- `approve_plan` still uses TUI inline flow (v1.5: shared presenter + plan markdown context).

## References

- ADR 0053 (task clarification gate)
- `.agents/skills/harness-decisions/SKILL.md`
- `test/harness-ask-user.test.mjs`
- `.pi/lib/ask-user/merge-task-clarification.ts`
