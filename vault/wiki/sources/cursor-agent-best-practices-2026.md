---
type: source
status: ingested
source_type: engineering-blog
title: "Best Practices for Coding with Agents"
author: "Lee Robinson (Cursor/Anysphere)"
date_published: 2026-01-09
url: "https://cursor.com/blog/agent-best-practices"
confidence: high
tags: [cursor, agent-best-practices, plan-mode, hooks, skills, context-management]
key_claims:
  - "Agent harness = Instructions + Tools + Model, tuned per model family"
  - "Plan Mode: research codebase → clarify → plan → approve → build"
  - "Context management: let agent find context dynamically; don't pre-load everything"
  - "Rules (.cursor/rules/): static always-on context. Skills (SKILL.md): dynamic on-demand capabilities"
  - "Long-running agent hooks: stop hooks that re-invoke agent until goal achieved"
  - "Git worktree isolation for parallel agents"
  - "Multi-model parallel execution with judging"
  - "Context anxiety: models start refusing work as context fills up"
created: 2026-05-02
updated: 2026-05-02
---
# Best Practices for Coding with Agents

Cursor's official guide (Lee Robinson, Jan 2026) covering agent harness design, Plan Mode, context management strategies, Rules/Skills system, long-running agent hooks, parallel agents via git worktrees, and workflow patterns.

## Harness Components

1. **Instructions**: System prompt + rules guiding agent behavior
2. **Tools**: File editing, codebase search, terminal execution
3. **Model**: The agent model for the task

Cursor tunes instructions and tools specifically for every frontier model based on internal evals and external benchmarks.

## Plan Mode

`Shift+Tab` toggles Plan Mode. Agent:
1. Researches codebase for relevant files
2. Asks clarifying questions
3. Creates detailed implementation plan with file paths
4. Waits for approval before building

Plans open as editable Markdown. Save to `.cursor/plans/` for documentation + future agent context.

## Context Management

- Let agent find context via grep + semantic search — don't pre-tag every file
- Start new conversation per task; continue for iterations on same feature
- `@Past Chats` to reference previous work selectively
- Long conversations cause context noise → agent loses focus

## Long-Running Agent Hooks

Stop hooks in `.cursor/hooks.json` that re-invoke agent via `followup_message` until a DONE condition is met (scratchpad check). Max iteration guard. Pattern: run tests, fix until pass.

## Parallel Agents

Git worktrees provide isolated workspaces per agent. Multiple models can run same prompt simultaneously; Cursor judges which solution is best. Apply to merge results back.

## Relevance to Harness

Directly validates our: L2 Structured Planning (Plan Mode), SKILL.md system (Skills), context drift concerns (context anxiety), and model-adaptive harness design. Long-running agent hooks are an elegant alternative to our drift monitor's stop-only approach — we need both.
