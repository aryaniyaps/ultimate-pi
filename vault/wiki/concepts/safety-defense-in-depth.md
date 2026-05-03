---
type: concept
tags:
  - safety
  - security
  - architecture
  - agent-governance
related:
  - "[[Agent Harness Architecture]]"
  - "[[sources/opendev-arxiv-2603.05344v1]]"
  - "[[sources/disler-pi-vs-claude-code]]"
---

# Safety Defense-in-Depth

A multi-layer safety architecture where each layer independently prevents a class of harm. No single bypass compromises the system. The key principle: make unsafe operations structurally impossible rather than relying on runtime permission checks that the agent can probe or argue against.

## Five Safety Layers

### Layer 1: Prompt-Level Guardrails
System prompt encodes security policy, action safety rules, git workflow requirements, error recovery patterns. The first line of defense — guides model reasoning toward safe behavior.

### Layer 2: Schema-Level Tool Restrictions
Tools absent from the agent's schema cannot be invoked, argued about, or probed. This is more robust than runtime checks:
- **Plan mode**: Only read-only tools in schema. Write tools don't exist from the model's perspective.
- **Subagent filtering**: Each subagent receives only tools relevant to its role.
- **MCP discovery gating**: External tools appear only after explicit search + selection.

### Layer 3: Runtime Approval System
Three autonomy levels:
- **Manual**: Every tool call requires explicit approval
- **Semi-Auto**: Read-only commands auto-approved; writes prompt for confirmation
- **Auto**: All operations approved for trusted workflows

Rule types evaluated in priority order:
- **Danger**: Regex match with auto-deny (cannot be overridden). Default rules: `rm -rf /`, `rm -rf *`, `chmod 777`
- **Pattern**: Regex match against command string
- **Command**: Exact match
- **Prefix**: Prefix match (e.g., `git` matches `git push`)

### Layer 4: Tool-Level Validation
Per-tool safety checks executed during tool handling:
- **DANGEROUS_PATTERNS blocklist**: `rm -rf`, `sudo`, fork bombs, `curl|bash` pipes, `dd` to devices
- **Stale-read detection**: Rejects edits if file was modified since last read
- **Output truncation**: Caps at 30,000 chars with head-tail strategy
- **Timeouts**: 60s idle timeout, 600s absolute timeout

### Layer 5: Lifecycle Hooks
External scripts register for lifecycle events (PreToolUse, PostToolUse, SessionStart, Stop). Hooks can:
- **Block** (exit code 2): Prevent tool execution entirely
- **Mutate**: Modify tool arguments before execution (e.g., inject `--dry-run`)
- **Observe**: Async logging/auditing after execution

## Key Safety Patterns

### Schema Gating > Permission Checks
Removing tools from the agent's schema eliminates the entire class of attack — the model cannot reason about capabilities it doesn't know exist. Runtime permission checks let the agent argue for exceptions.

### Approval Persistence
Approval rules persist to disk across sessions. Without persistence, users re-approve same operations every session, leading to approval fatigue and blanket auto-approval.

### Doom-Loop Detection
MD5 fingerprint of `(tool_name, tool_args)` tracked in sliding window of 20 calls. Same fingerprint appearing 3+ times triggers warning → approval pause escalation.

### Resource Bounding
Every resource that grows with session length must have a cap: iteration limits, nudge budgets, undo history (50 ops), concurrent tool calls (5 max).

## Pi's Damage Control Extension

disler's `damage-control` extension maps to Layers 3-4:
- **Dangerous Commands**: Regex patterns with `ask: true` or strict block
- **Zero Access Paths**: `.env`, `~/.ssh/`, `*.pem`
- **Read-Only Paths**: `package-lock.json`, `/etc/`
- **No-Delete Paths**: `.git/`, `Dockerfile`, `README.md`

## Relevance to Our Harness

Current state: No safety defense-in-depth. We need:
- Schema-level filtering for subagents (already have `allowed-tools` concept)
- Runtime approval system for dangerous commands
- DANGEROUS_PATTERNS blocklist
- Stale-read detection for file edits
- Doom-loop detection for repeated tool calls
