---
name: harness-decisions
description: Structured user decisions via ask_user for harness setup, planning, and governance forks. Use with /harness-setup, /harness-plan, harness-auto plan phase, and when agents emit human_required.
---

# harness-decisions

## When to use

- `/harness-setup` — Firecrawl mode, missing project `.env`, other bootstrap forks
- `/harness-plan` or harness-auto **plan** phase — scope, risk, acceptance ambiguity
- Orchestrator receives `human_required` from evaluator, adversary, tie-breaker, or meta-optimizer
- `/harness-router-tune` — approve / reject / edit a router proposal before apply

## Decision handshake

1. **One focused `ask_user` call** per blocking fork (2–4 options with short descriptions).
2. **Never guess** on Firecrawl mode, `.env` creation, risk level, scope boundaries, or merge policy.
3. If the user **cancels** (Esc), stop with `needs_clarification` / `human_required` — do not assume defaults.
4. **CI / automation only:** pass `--non-interactive` to `/harness-setup` to skip prompts and use documented defaults.

## Example (setup — Firecrawl)

```json
{
  "question": "Which Firecrawl deployment should this project use?",
  "context": "Self-hosted requires Docker (~8GB RAM). Cloud uses api.firecrawl.dev and FIRECRAWL_API_KEY.",
  "options": [
    { "title": "Cloud (api.firecrawl.dev)", "description": "Recommended default; run firecrawl login in setup" },
    { "title": "Self-hosted (Docker on :3002)", "description": "Runs firecrawl/ compose stack locally" }
  ],
  "allowFreeform": false
}
```

## Example (plan — scope)

```json
{
  "question": "What should be in scope for this plan?",
  "options": [
    { "title": "Backend API only", "description": "No UI or infra changes" },
    { "title": "Full stack including UI", "description": "API + frontend + tests" }
  ],
  "allowFreeform": true
}
```

## Who must NOT call ask_user

- `harness/evaluator` and `harness/adversary` — emit `human_required` in structured verdicts; the **parent orchestrator** calls `ask_user`.
