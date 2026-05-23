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

Parent orchestrator calls **`approve_plan`** with the full `plan_packet` (scrollable plan + Approve / Request changes / Cancel), then **`create_plan`** with the same packet after Approve.

```json
{
  "plan_packet": {
    "schema_version": "1.0.0",
    "contract_version": "1.0.0",
    "plan_id": "…",
    "task_id": "…",
    "scope": "…",
    "assumptions": [],
    "risk_level": "med",
    "acceptance_checks": ["…"],
    "rollback_plan": { "revert_commit_ready": true, "rollback_artifacts": { "revert_command": "…", "revert_branch": "…", "patch_bundle": "…" } }
  },
  "human_summary": "One-line summary for the overlay header"
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

## Who calls what

- **Parent orchestrator** during `/harness-plan` — `ask_user` for clarification; **`approve_plan`** then **`create_plan`** for the plan file.
- `harness/planning/*` (scouts, decompose, hypothesis, hypothesis-eval) — JSON only; no `ask_user` / `approve_plan` / `create_plan`.
- `harness/reviewing/evaluator`, `harness/reviewing/adversary`, and `harness/reviewing/tie-breaker` — emit `human_required`; the **parent orchestrator** calls `ask_user`.
