# ADR 0032: Harness slash commands as agent orchestrators

- **Status:** Accepted
- **Date:** 2026-05-17

## Context

Harness slash prompts duplicated logic already defined in `harness/*` agents. Commands did not invoke the `Agent` tool. Review docs told users to fork a new Pi session even though subagents already provide isolated context.

## Decision

1. **Slash commands** (prompt templates) are orchestrators: spawn `harness/*` agents once, perform policy-gated writes, emit handoff blocks. Command identity is captured on Pi **`input`** as `harness-turn` (raw `/harness-*`), not from expanded prompt markdown.
2. **Agents** perform multi-turn reads and emit structured JSON drafts. **Planning** (`harness/planning/*`) scouts and plan-adversary are read-only; parent orchestrator runs `ask_user`, `approve_plan`, and `create_plan` (see ADR 0033).
3. **HarnessSpawnContext** is injected in `[HarnessRunContext]`; orchestrator copies it into spawn prompts. Subagents do not receive `[HarnessActivePlan]` injection.
4. **Review isolation** uses `Agent` spawn with `inherit_context: false`. `review-integrity` allows `Agent` / `get_subagent_result` for evaluator/adversary/tie-breaker.
5. **Subagent policy** blocks mutating tools for read-only phase agents; `ask_user` bridged for evaluator/adversary/tie-breaker only (not planning scouts).
6. **Parent** owns plan-phase `ask_user`, `approve_plan`, and `create_plan` per ADR 0033.

## Consequences

### Positive

- Single source of truth for phase logic in agent files; prompts stay thin.
- L4 review isolation without manual session management.

### Negative

- Orchestrator must parse subagent JSON reliably and pass complete spawn context.
- Scope enforcement remains prompt-driven for executor until optional path allowlist.

## References

- `.pi/prompts/harness-*.md`
- `.pi/agents/harness/*.md`
- `.pi/extensions/lib/harness-subagents/harness-subagent-policy.ts`
- `.pi/extensions/review-integrity.ts`
- `.pi/lib/harness-agent-output.ts`
