---
type: concept
title: "Lifecycle Hook System"
aliases: ["lifecycle hooks", "tool-level hooks", "deterministic hooks"]
created: 2026-05-01
tags: [concept, harness-design, hooks, deterministic-policy, claude-code]
status: developing
related:
  - "[[harness-implementation-plan]]"
  - "[[agentic-harness]]"
  - "[[feedforward-feedback-harness]]"
  - "[[harness-wiki-skill-mapping]]"
sources:
  - "[[claude-code-architecture-karaxai-2026]]"
  - "[[claude-code-security-architecture-penligent-2026]]"
updated: 2026-05-02
---
# Lifecycle Hook System

Deterministic policy enforcement at the tool lifecycle level through hook events with exit-code semantics. The key insight: **CLAUDE.md achieves ~92% compliance. Hooks achieve 100% compliance** for conditions they match (Source: [[claude-code-architecture-karaxai-2026]]).

## Hook vs Prompt

| Mechanism | Compliance | Method | When it fails |
|---|---|---|---|
| CLAUDE.md rules | ~92% | Prompt injection | Model ignores, forgets under load, context anxiety |
| Hooks | 100% (when matched) | Shell command with exit code | Only if hook script has bugs |

The 8% gap between CLAUDE.md and hooks represents every case where the model "knew the rule but didn't follow it." Hooks close this gap by making policy enforcement external to the model.

## Key Hook Events

### PreToolUse (Most Critical)
Fires before tool execution. Can: allow, deny, ask (prompt user), defer (for batch processing), modify tool input, inject context. Exit code 2 blocks the tool. JSON output allows finer control.

**Use cases**:
- Block dangerous shell commands (`rm -rf`, `curl` to unknown hosts)
- Auto-approve safe commands (`npm test`, `git status`)
- Modify tool input (sanitize paths, add safety flags)
- Inject environment context ("current branch: main, CI is red")
- Defend against prompt injection in tool calls

### PostToolUse
Fires after tool succeeds. Can: audit output, auto-format files, run tests asynchronously, replace tool output (redact secrets), inject context. Cannot block (tool already ran).

**Use cases**:
- Run linter after every `Write`/`Edit`
- Redact secrets from tool output before model sees them
- Log all file modifications for audit trail
- Trigger async test suite after code changes

### Stop / SubagentStop
Fires when agent finishes. Can: block stopping, re-invoke agent with feedback. Exit code 2 or JSON `decision: "block"` prevents stop.

**Use cases**:
- "Tests must pass before you stop"
- "All lint errors must be resolved"
- "Task list must be fully checked off"
- "Build must succeed before claiming completion"

### PermissionRequest
Fires when permission dialog would appear. Can: programmatically allow/deny, modify input, update permission rules. Replaces user-facing approval dialogs.

**Use cases**:
- Auto-approve based on environment (CI vs local)
- Implement time-based policies ("no deploys after 5 PM")
- Apply team-wide permission rules dynamically

## Five Hook Types

| Type | Mechanism | Blocking | Use |
|---|---|---|---|
| `command` | Shell script, exit codes + JSON stdout | Yes (exit 2) | Deterministic checks, validation |
| `http` | POST to URL, JSON response | Yes (2xx with block) | Webhook integrations, external services |
| `mcp_tool` | Call MCP server tool | Depends on tool | Reuse existing MCP infrastructure |
| `prompt` | Single-turn LLM evaluation | Yes (JSON ok:false) | Semantic checks, policy evaluation |
| `agent` | Multi-turn subagent with tools | Yes (JSON ok:false) | Complex verification needing codebase access |

## Integration with Our Harness

Current state: `extensions/harness-*.ts` provides layer-level hooks (before/after each pipeline stage). Missing: tool-level hooks with deterministic exit-code semantics.

**Proposed**: Add a `lib/harness-hooks.ts` module that:
1. Registers hook events at tool lifecycle boundaries (PreToolUse, PostToolUse, etc.)
2. Supports command-based and prompt-based hook types
3. Uses exit-code semantics for deterministic allow/deny
4. Integrates with existing layer-level extension hooks (they fire before/after tool-level hooks)
5. Hooks configured in `.pi/harness/hooks.json` with the same scoping model (project, user, managed)

## First Principles

- **Hooks determine correctness, not prompts.** If a rule must never be broken, use a hook. If a rule should usually be followed, use prompts.
- **Exit codes are the contract.** 0 = allow, 2 = deny (feed stderr to model), other = non-blocking error.
- **Hooks are external to the model.** They don't consume context. They can't be ignored, forgotten, or bypassed through clever prompting.
