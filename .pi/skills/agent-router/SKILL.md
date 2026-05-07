---
name: agent-router
description: >
  Dynamic agent discovery, matching, and delegation. Discovers all available agents
  at runtime, reads their frontmatter to understand capabilities, matches tasks to
  the right specialist, and routes via the Agent tool. Use when the user needs
  delegation, asks which agent can help, wants parallel dispatch, or says
  "delegate this", "find an agent for", "route to", "dispatch", "which agent".
allowed-tools: Read Glob Find Bash
---

# agent-router: Dynamic Agent Discovery & Routing

You don't memorize agent lists. You discover them live, read their capabilities,
and route tasks to the right specialists.

## Why Dynamic Discovery

Agent definitions live in two locations (project and global). They change over
time. New agents get added. Default agents get overridden. A static list in
SYSTEM.md rots. Dynamic discovery tells you what's actually available right now.

## Discovery

### Step 1 — List All Available Agents

```bash
find .pi/agents -name '*.md' -type f 2>/dev/null
find ~/.pi/agent/agents -name '*.md' -type f 2>/dev/null
```

Project agents (`.pi/agents/`) override identically-named global ones. Default
agents (`Explore`, `Plan`, `general-purpose`) are always available even without
files here.

### Step 2 — Parse Agent Frontmatter

For each candidate agent, read the file and extract:

| Field | Extract this |
|-------|-------------|
| `description` | What the agent does, when to use it |
| `tools` | Available built-in tools |
| `thinking` | Reasoning depth: `off`, `low`, `medium`, `high`, `xhigh` |
| `max_turns` | Turn limit (0 = unlimited) |
| `model` | Model override if specified |
| `isolation` | `worktree` if isolated git execution |

> [!info] Subdirectory agents
> Agents in `.pi/agents/<team>/<name>.md` are referenced as `<team>/<name>`.
> Example: `pi-pi/agent-expert` lives at `.pi/agents/pi-pi/agent-expert.md`.

### Step 3 — Cache Discovery Results

After discovery, summarize available agents for the current session. No need
to re-read frontmatter for already-profiled agents.

## Matching Tasks to Agents

### Direct Match — Keyword Triggers

| User says | Look for agent with |
|-----------|-------------------|
| Explicit agent name | Match directly |
| "build a skill" / "create skill" | Skill-related keywords in description |
| "create an agent" | Agent-related keywords in description |
| "Pi extension" / "Pi theme" | Pi component domain keywords |
| "rethink" / "first principles" | Prioritization keywords |
| "build knowledge graph" | Graphify keywords |
| "query the graph" | Graphify queries |

### Fuzzy Match — Semantic Fit

When no direct keyword match:

1. Read the task description carefully.
2. Compare against each agent's `description` field.
3. Pick the agent whose description most closely matches the task domain.
4. If uncertain, read the agent's full prompt body for more context.
5. If nothing fits, use `general-purpose`.

### Orchestrator Pattern

Some agents are meta-agents that coordinate teams. When an orchestrator agent
exists for a domain (e.g., `pi-pi/pi-orchestrator`), route domain tasks to
the orchestrator — not individual experts. The orchestrator knows how to
dispatch its team members in parallel.

To identify orchestrators: look for agents whose descriptions mention
"coordinates", "dispatches", "orchestrates", "meta-agent", or whose tools
include `Agent`.

## Routing

### Dispatch

Use the `Agent` tool:

```typescript
Agent({
  subagent_type: "<team>/<name>",
  prompt: "<specific, scoped task description>",
  run_in_background: true,  // for parallel dispatch
  inherit_context: false,   // fresh context by default
})
```

### Parallel Dispatch

When a task touches multiple domains:
1. Identify all relevant agents.
2. Dispatch all of them with `run_in_background: true`.
3. Collect results with `get_subagent_result`.
4. Synthesize findings.

### Sequential Pipelines

When one agent's output feeds another:
1. Dispatch first agent (foreground or background).
2. Collect result.
3. Feed result into second agent's prompt.
4. Continue until pipeline completes.

### Collecting Results

```typescript
get_subagent_result({ agent_id: "<id>", wait: true })
```

Summarize agent findings for the user. Don't dump raw output — extract
key decisions, actionable outputs, and surprises.

## Delegation Rules

1. **Agents are for multi-turn, tool-using workflows.** For single-step template
   expansion (static prompt + argument substitution), use a prompt template instead.
2. **One job per agent.** If the task needs "and" in the description, split into
   separate dispatches.
3. **Match tools + thinking to task difficulty.** A file-lookup task doesn't need
   `bash` + `medium` thinking. A novel architecture decision needs `high`.
4. **Parallelize by default.** When multiple domains are relevant, dispatch all
   agents simultaneously. Serial dispatch wastes wall-clock time.
5. **Experts research, orchestrators build.** Don't ask a domain expert to write
   files if an orchestrator exists for that domain.
6. **Always read frontmatter before dispatching.** Don't assume an agent's
   capabilities from its name alone.
7. **If no agent fits, fall back to `general-purpose`.** Then consider whether
   a new agent should be created for the missing capability.

## Discovery Example

```bash
# Find all agents
$ find .pi/agents -name '*.md' -type f

# Sample output:
# .pi/agents/pi-pi/pi-orchestrator.md
# .pi/agents/pi-pi/agent-expert.md
# .pi/agents/pi-pi/skill-expert.md
# .pi/agents/rethink.md

# Then read each to understand capabilities
# Then match user task to the right agent(s)
```

## Guardrails

- Do not hardcode agent lists. Always discover dynamically.
- Do not dispatch an agent you haven't read the frontmatter for.
- Do not use an agent when a prompt template suffices.
- If discovery returns nothing, use default agents (`Explore`, `Plan`, `general-purpose`).
- Report routing decisions: which agent(s) dispatched, why, what to expect.
