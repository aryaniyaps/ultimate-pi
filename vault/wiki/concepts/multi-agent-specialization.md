---
type: concept
tags:
  - multi-agent
  - specialization
  - team-composition
  - model-routing
related:
  - "[[Agentic Orchestration Pipeline]]"
  - "[[Agent Harness Architecture]]"
  - "[[sources/disler-pi-vs-claude-code]]"
  - "[[sources/mindstudio-four-agent-types]]"
---

# Multi-Agent Specialization

The practice of assigning different agents to different cognitive roles based on their specialized system prompts, tool sets, and underlying models. Specialization matters more than the raw capability ceiling of any single model.

## Specialization Axes

### By Role (What the agent does)
- **Planner**: Explores codebase, analyzes patterns, produces structured plans. Read-only tools.
- **Builder**: Implements code changes, writes files, runs commands. Full read-write tools.
- **Reviewer**: Analyzes diffs, finds issues, suggests improvements. Read + analysis tools.
- **Fixer**: Addresses review feedback, applies targeted fixes. Write tools.
- **Gatekeeper**: Final verification, test execution, merge approval. Read + test tools.
- **Narrator**: Produces human-readable summaries, PR descriptions, documentation.

### By Model (Which LLM powers it)
- **Opus/Strong models**: Planning, reviewing, complex reasoning (high quality, high cost)
- **Sonnet/Mid models**: Building, fixing, standard coding tasks (balanced quality/cost)
- **Haiku/Fast models**: Spec-checking, PR descriptions, summarization (low cost, fast)
- **Task routing**: Different pipeline stages use different models optimized for that stage

### By Tool Set (What capabilities it has)
- **Read-only**: Code explorer, reviewer (cannot modify files)
- **Read-write**: Builder, fixer (can create/edit files)
- **Shell access**: Builder, fixer (can run commands)
- **Web access**: Researcher, web-cloner (can fetch URLs)
- **User interaction**: Ask-user agents (structured surveys)

## Team Composition

Teams defined in YAML config map domain names to agent rosters:
```yaml
frontend: [planner, builder, reviewer]
backend: [architect, implementer, tester]
security: [auditor, remediator]
```

The dispatcher (orchestrator) selects the most appropriate team and specialist based on the user's request.

## Model-Agnostic Design

Specialization should be model-agnostic: switching providers requires only configuration changes, not code changes. Agents should declare model preferences per role but gracefully degrade to defaults.

## Key Insight

> "Multi-model pipelines beat single-model agents for non-trivial work. Specialization matters more than the raw capability ceiling of any one model." — Hamza L. (4CO-OP contributor)

The 4CO-OP project demonstrates this with 9 specialized agents across Claude Code and Codex: Planner, Builder, Spec Checker, Escalation, Reviewer, Fixer, Gatekeeper, PR Writer, Narrator. Each runs the model best at that specific job.
