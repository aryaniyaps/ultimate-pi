# ADR 0032: Harness slash commands as agent orchestrators

- **Status:** Accepted
- **Date:** 2026-05-17

## Context

Harness slash prompts duplicated logic already defined in `harness/*` agents. The in-process `Agent` / `createAgentSession` stack was heavy and unstable. Review docs told users to fork a new Pi session even though subprocess subagents already provide isolation.

## Decision

1. **Slash commands** (prompt templates) are orchestrators: spawn `harness/*` agents once, perform policy-gated writes, emit handoff blocks. Command identity is captured on Pi **`input`** as `harness-turn` (raw `/harness-*`), not from expanded prompt markdown.
2. **Agents** perform multi-turn reads and emit structured JSON drafts. **Planning** (`harness/planning/*`) scouts and plan-adversary are read-only; parent orchestrator runs `ask_user`, `approve_plan`, and `create_plan` (see ADR 0033).
3. **HarnessSpawnContext** is injected in `[HarnessRunContext]`; orchestrator copies it into spawn prompts. Subagents do not receive `[HarnessActivePlan]` injection.
4. **Review isolation** uses native `subagent` (vendored pi-subagents: isolated `pi --mode json` subprocess). `review-integrity` allows `subagent` when `agent` is evaluator/adversary/tie-breaker; bridge blocks plan-phase mutating spawns and nested `subagent` in children.
5. **Subagent policy** blocks mutating tools for read-only phase agents; `ask_user` bridged for evaluator/adversary/tie-breaker only (not planning scouts).
6. **Parent** owns plan-phase `ask_user`, `approve_plan`, and `create_plan` per ADR 0033.

## Consequences

### Positive

- Single source of truth for phase logic in agent files; prompts stay thin.
- L4 review isolation without manual session management.

### Negative

- Orchestrator must parse subagent JSON reliably and pass complete spawn context.
- Scope enforcement remains prompt-driven for executor until optional path allowlist.

## Amendment (2026-05-23)

- **`/harness-review`** is the master **post-run** orchestrator (benchmark + verdict + adversary). See ADR 0039.
- **`/harness-eval`** and **`/harness-critic`** are thin deprecated aliases; do not implement separate pipelines.
- Post-run artifacts use **`submit_*`** + **`harness_artifact_ready`** per ADR 0037; parent does not parse subprocess JSON into `artifacts/eval-verdict.yaml`.

## References

- `.pi/prompts/harness-*.md`
- ADR 0039 — post-run review gate
- `.pi/agents/harness/*.md`
- `vendor/pi-subagents/src/subagents.ts`, `.pi/extensions/lib/harness-subagents-bridge.ts`
- `.pi/extensions/lib/harness-subagent-policy.ts`
- `.pi/extensions/review-integrity.ts`
- `.pi/lib/harness-agent-output.ts`
