---
type: concept
title: "Subagent Worktree Isolation"
aliases: ["worktree isolation", "subagent sandboxing"]
created: 2026-05-01
tags: [concept, harness-design, subagents, isolation, claude-code]
status: developing
related:
  - "[[harness-implementation-plan]]"
  - "[[agentic-harness]]"
  - "[[consensus-debate]]"
sources:
  - "[[claude-code-architecture-vila-lab-2026]]"
  - "[[claude-code-security-architecture-penligent-2026]]"
  - "[[claude-code-architecture-karaxai-2026]]"
---

# Subagent Worktree Isolation

Claude Code's approach to subagent safety: each subagent gets a fresh context window AND optionally an isolated Git worktree. Only the final summary returns to the parent. No intermediate state leaks.

## Two Dimensions of Isolation

### Context Isolation
- Fresh 200K-token context window per subagent
- Only `subagent_type` (Explore, Plan, custom) and the prompt string are passed from parent
- NO parent conversation history, file contents, or tool outputs carry over
- Subagent's own file reads, tool calls, and reasoning stay isolated
- Only the final message returns to parent as a tool result
- Net effect: parent context grows by 1 summary, not the full subtask transcript

### Filesystem Isolation (Worktree)
- `isolation: worktree` creates a temporary Git worktree
- Subagent gets an isolated copy of the repository
- Edits don't conflict with main agent's working directory
- Worktree is cleaned up when subagent finishes
- Custom `WorktreeCreate`/`WorktreeRemove` hooks support non-Git VCS
- Blast-radius control: risky refactor runs in worktree, not on main tree

## Why This Matters

Without isolation, subagents are just named prompts. With isolation, they become:

1. **Context multipliers**: 10 subagents each with 200K context = 2M effective context across the session
2. **Safety boundaries**: Read-only subagent physically cannot write files (not just "promised not to")
3. **Parallelism enablers**: Multiple subagents editing in parallel worktrees, merges handled after completion
4. **Blast-radius limiters**: Risky operations contained within worktree, discardable on failure

## What Subagents CANNOT Do
- Spawn their own subagents (one level only — prevents infinite recursion)
- Access parent conversation history (fresh context only)
- Access plugin subagent capabilities (hooks, MCP servers, permissionMode — security boundary)
- Survive parent session termination (temporary by design)

## Integration with P25 Subagent Router

Our current P25 (Subagent Specialization Router) dispatches by task type but lacks:
- Fresh context per subagent (currently shares parent context)
- Worktree filesystem isolation
- Sidechain transcripts (currently all output goes to parent)
- Per-subagent tool restrictions (currently full tool access)
- Custom subagent definitions in YAML (currently only hardcoded router logic)

**Proposed**: P25 evolves to P25b — full subagent isolation with worktree support. See harness-implementation-plan for phase specification.

## Security Model

Plugin subagents have additional restrictions: no `hooks`, `mcpServers`, or `permissionMode` in frontmatter. This prevents plugin-supplied subagents from inheriting privilege. For full subagent capability, define in `.claude/agents/` (user-controlled), not in plugin bundles.
