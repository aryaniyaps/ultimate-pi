---
name: harness-decisions
description: Structured user decisions via ask_user for harness setup, planning, and governance forks. Use with /harness-setup, /harness-plan, harness-auto plan phase, and when agents emit human_required.
---

# harness-decisions

## When to use

- `/harness-setup` — missing project `.env`, other bootstrap forks
- `/harness-plan` or harness-auto **plan** phase — scope, risk, acceptance ambiguity
- Orchestrator receives `human_required` from evaluator, adversary, or tie-breaker

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

## Phase 0 — task contract (before reconnaissance)

Use during **`/harness-plan` Phase 0** only. Purpose: disambiguate the **task** (scope, success, risk) — not research-backed implementation forks (those are Phase 4 after Phase 3.5).

### Example (Phase 0 — success criteria)

```json
{
  "question": "What does done look like for this task?",
  "context": "The request could mean harness-only changes, product code, or docs. Phase 0 must lock acceptance before reconnaissance.",
  "options": [
    { "title": "Harness contract only", "description": "Changes under .pi/harness and prompts; harness-verify passes" },
    { "title": "End-to-end feature", "description": "User-visible behavior + tests in the app repo" },
    { "title": "Docs / ADR only", "description": "No runtime code changes" }
  ],
  "allowFreeform": true
}
```

### Example (Phase 0 — risk when `--risk` omitted)

```json
{
  "question": "What risk level should tailor debate and research depth?",
  "options": [
    { "title": "Low", "description": "Small, localized change; fast plan-verify profile" },
    { "title": "Med (default)", "description": "Typical feature or multi-file harness work" },
    { "title": "High", "description": "Architecture, security, or broad blast radius" }
  ],
  "allowFreeform": false
}
```

## Example (plan — scope) — Phase 4 fork, not Phase 0

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

- **Parent orchestrator** during `/harness-plan` — Phase 0: `ask_user` for **task contract** → `artifacts/task-clarification.yaml`; later: **`approve_plan`** then **`create_plan`** for the plan file; Phase 4: `ask_user` for **dialectical forks** only.
- `harness/planning/*` (scouts, decompose, hypothesis, hypothesis-eval) — JSON only; no `ask_user` / `approve_plan` / `create_plan`.
- `harness/reviewing/evaluator`, `harness/reviewing/adversary`, and `harness/reviewing/tie-breaker` — emit `human_required`; the **parent orchestrator** calls `ask_user`.
