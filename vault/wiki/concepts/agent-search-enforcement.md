---
type: concept
status: developing
created: 2026-04-30
updated: 2026-04-30
tags:
  - agentic-harness
  - tool-enforcement
  - semantic-search
  - mcp
related:
  - "[[ck-tool]]"
  - "[[mcp-tool-routing]]"
  - "[[agentic-harness-context-enforcement]]"
  - "[[Research: semantic code search tools]]"
---

# agent search enforcement

Strategies to force AI coding agents to use semantic code search tools (ck, vgrep) instead of raw `grep`, `cat`, and pipe commands.

## Problem

AI coding agents default to shell tools: `grep -r "pattern" .`, `cat file | grep foo`, `find . -name "*.py" | xargs grep bar`. These are:
- **Lexical-only**: Miss conceptual matches, require exact keyword knowledge
- **Noisy**: Return too many or too few results
- **Token-inefficient**: Raw grep output wastes context window on irrelevant matches
- **Non-indexed**: Every query scans the entire codebase (slow on large repos)

Semantic tools (ck --sem) solve these problems but agents don't use them by default because they're not native tools.

## Enforcement Strategies

### 1. System Prompt Rules (Weak)

Add to agent system prompt / CLAUDE.md:
```markdown
## Search Policy
- NEVER use raw `grep` for codebase exploration.
- ALWAYS use `ck --sem` or `ck --hybrid` for conceptual searches.
- `grep` is permitted ONLY for exact literal string matching (e.g., finding a specific error message).
- Before any grep, consider: "Can I express this as a ck query?"
```

**Effectiveness**: Low-Medium. Depends on model compliance. Claude 4 Opus follows rules well; smaller models may ignore. Costs zero infrastructure.

### 2. MCP Tool Registration (Medium)

Register ck as an MCP tool:
```bash
claude mcp add ck-search -s user -- ck --serve
```

The agent sees `ck_search`, `ck_get`, `ck_info`, `ck_reindex` as first-class tools alongside `bash` and `read`. If the prompt emphasizes preferring MCP tools, the agent may route code searches through ck.

**Effectiveness**: Medium. Agent still has `bash` available. Needs prompt reinforcement. Best when combined with Strategy 1.

### 3. Shell Wrapper Interception (Medium-Strong)

Create a wrapper script that intercepts grep and routes semantic-looking queries to ck:

```bash
#!/bin/bash
# ~/bin/grep (wrapper for agent's PATH)

# Route to ck if query looks conceptual (multi-word, no obvious regex)
if [[ "$*" =~ [[:space:]] ]] && [[ ! "$*" =~ [\^\$\.\*\[\]\\] ]]; then
  if command -v ck &>/dev/null; then
    exec ck --hybrid "$@" 2>/dev/null || exec /usr/bin/grep "$@"
  fi
fi
exec /usr/bin/grep "$@"
```

Place this in the agent's PATH before `/usr/bin`.

**Risks**:
- False positives: `grep "TODO: fix this"` gets intercepted but should be lexical
- Breaks scripts that parse grep output format
- Adding `--hybrid` changes output format (score fields, different line format)
- Hard to distinguish "the agent wants grep" from "the agent typed something that looks semantic"

**Mitigation**: Only wrap for known agent users, not system-wide. Use an explicit env var: `CK_ENFORCE=1 grep ...`

### 4. Harness-Level Tool Routing (Strong)

Modify the agent harness (e.g., lean-ctx bash tool) to inspect every bash command before execution:

```python
def pre_exec_hook(command: str) -> str:
    """Intercept grep/cat and suggest ck."""
    if re.match(r'^(grep|/usr/bin/grep|/bin/grep)\s', command):
        # Extract pattern and path
        match = re.match(r'^grep\s+(?:-[a-zA-Z]+\s+)*["\']?([^"\']+)["\']?\s+(.*)', command)
        if match:
            pattern, path = match.groups()
            # If pattern is multi-word (conceptual), route to ck
            if ' ' in pattern and not re.search(r'[\^\$\.\*\[\]\\]', pattern):
                return f'ck --hybrid "{pattern}" {path}'
    return command  # pass through unchanged
```

**Effectiveness**: Strong. Catches all grep invocations. Can log/report non-compliance. Requires modifying harness code.

### 5. Post-Hoc Validation (Weak)

A checker that scans agent action logs and flags grep usage. Reactive — doesn't prevent the bad behavior, only reports it.

```bash
# Check agent logs for grep usage
grep -c '"command": "grep' agent-session.log
```

## Recommended Approach

**Three-layer defense for the ultimate-pi harness:**

1. **Layer 1 (immediate)**: System prompt rules in AGENTS.md + install ck + register MCP
2. **Layer 2 (medium-term)**: Add pre-exec hook to lean-ctx bash tool that warns/logs grep usage and suggests ck
3. **Layer 3 (optional)**: Shell wrapper for known agent sessions with `CK_ENFORCE` env var

## Open Questions

- [ ] How does Claude Code's native `Grep` tool interact with custom MCP tools? Does it prefer its own?
- [ ] Can MCP tools be marked as "preferred" or given higher priority?
- [ ] What's the false-positive rate of shell interception on real-world agent queries?
