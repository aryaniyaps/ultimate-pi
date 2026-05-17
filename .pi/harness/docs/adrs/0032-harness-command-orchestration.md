# ADR 0032: Harness slash commands as agent orchestrators

- **Status:** Accepted
- **Date:** 2026-05-17

## Context

Harness slash prompts duplicated logic already defined in `harness/*` agents. Commands did not invoke the `Agent` tool. Review docs told users to fork a new Pi session even though subagents already provide isolated context.

## Decision

1. **Slash commands** parse args, spawn the matching `harness/*` agent, run all `ask_user` gates, perform policy-gated writes, and emit handoff blocks.
2. **Agents** perform multi-turn reads and emit structured JSON drafts; they do not approve plans or write canonical run artifacts (except executor mutations in scope).
3. **HarnessSpawnContext** JSON (`.pi/harness/specs/harness-spawn-context.schema.json`) is required in every spawn prompt because subagents do not receive `[HarnessActivePlan]` injection.
4. **Review isolation** uses `Agent` spawn with `inherit_context: false`, not session fork. `review-integrity` allows `Agent` / `get_subagent_result` for `harness/evaluator`, `harness/adversary`, and `harness/tie-breaker`.
5. **Subagent policy** (`harness-subagent-policy.ts`) blocks mutating tools for planner/evaluator/adversary and related read-only agents; executor keeps write tools and `extensions: true`.
6. **Planner** has `disallowed_tools: ask_user`; clarification options return in JSON for the parent orchestrator.

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
