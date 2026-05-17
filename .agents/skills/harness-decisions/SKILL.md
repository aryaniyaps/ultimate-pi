---
name: harness-decisions
description: Structured user decisions via ask_user for harness setup, planning, and governance forks. Use with /harness-setup, /harness-plan, harness-auto plan phase, and when agents emit human_required.
---

# harness-decisions

## When to use

- `/harness-setup` — missing project `.env`, other bootstrap forks
- `/harness-plan` or harness-auto **plan** phase — scope, risk, acceptance ambiguity
- Orchestrator receives `human_required` from evaluator, adversary, tie-breaker, or meta-optimizer
- `/harness-router-tune` — approve / reject / edit a router proposal before apply

## Decision handshake

1. **One focused `ask_user` call** per blocking fork (2–4 options with short descriptions).
2. **Never guess** on `.env` creation, risk level, scope boundaries, or merge policy.
3. If the user **cancels** (Esc), stop with `needs_clarification` / `human_required` — do not assume defaults.
4. **CI / automation only:** pass `--non-interactive` to `/harness-setup` to skip prompts and use documented defaults.

## Example (harness-setup — search engine)

```json
{
  "question": "Which harness-web search backend should this project use?",
  "context": "Scrapling handles scrape/map/bulk. Search: DDG HTML needs no Docker. SearXNG must be self-hosted — public instances often block JSON and rate-limit API to ~4/hour per IP.",
  "options": [
    { "title": "DuckDuckGo HTML (default)", "description": "HARNESS_WEB_SEARCH_ENGINE=ddg_html" },
    { "title": "Self-host SearXNG here (Docker)", "description": "node harness-searxng-bootstrap.mjs" },
    { "title": "Use existing SearXNG instance", "description": "Freeform base URL → HARNESS_WEB_SEARXNG_URL" }
  ],
  "allowFreeform": true
}
```

## Example (plan — approval gate)

After presenting the full PlanPacket in chat:

```json
{
  "question": "Approve this plan for execution?",
  "context": "Scope, acceptance checks, and rollback are listed above. The plan file is written only after you approve.",
  "options": [
    { "title": "Approve", "description": "Write plan-packet.json and mark plan ready" },
    { "title": "Request changes", "description": "Revise scope or acceptance before writing" },
    { "title": "Cancel", "description": "Stop with needs_clarification" }
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

- `harness/planner` — returns `clarification.options` in JSON; parent runs `ask_user`.
- `harness/evaluator`, `harness/adversary`, and `harness/tie-breaker` — emit `human_required` in structured verdicts; the **parent orchestrator** calls `ask_user`.
- `harness/executor` — parent handles plan-level and governance forks.
