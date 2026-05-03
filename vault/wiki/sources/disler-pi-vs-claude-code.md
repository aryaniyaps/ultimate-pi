---
type: source
source_type: github-repo
author: disler (IndyDevDan)
date_published: 2026-02-23
url: https://github.com/disler/pi-vs-claude-code
confidence: high
tags:
  - pi-agent
  - claude-code
  - agentic-coding
  - multi-agent
  - extensions
key_claims:
  - "Pi Coding Agent is the only real open-source competitor to Claude Code"
  - "Pi's extension system enables UI customization, agent orchestration, safety auditing, and cross-agent integrations"
  - "Extensions compose via multiple -e flags: subagent-widget, agent-team, agent-chain, damage-control, pi-pi"
  - "Pi supports every major AI model provider (OpenAI, Anthropic, Google, OpenRouter)"
  - "Agent teams dispatch work to specialists via teams.yaml; agent chains pipeline steps sequentially via agent-chain.yaml"
---

# disler/pi-vs-claude-code

GitHub repository by IndyDevDan (disler) — 928 stars, 244 forks. A collection of customized Pi Coding Agent instances demonstrating how to hedge against Claude Code in the agentic coding market.

## What It Provides

**15+ production extensions** covering the full agent lifecycle:

### Multi-Agent Orchestration (3 extensions)
- **subagent-widget**: `/sub <task>` spawns background Pi subagents with live-progress widgets
- **agent-team**: Dispatcher-only orchestrator — primary agent delegates to named specialists via `dispatch_agent` tool, shows grid dashboard
- **agent-chain**: Sequential pipeline orchestrator — chains agents where output feeds into next step (`$INPUT`, `$ORIGINAL` variables). Example: `plan-build-review` pipeline

### Safety & Control (2 extensions)
- **damage-control**: Real-time safety auditing — intercepts dangerous bash patterns via regex, enforces path-based access controls from `.pi/damage-control-rules.yaml`. Block levels: Zero Access, Read-Only, No-Delete, Dangerous Commands (some with `ask: true` confirmation)
- **purpose-gate**: Session intent declaration on startup, blocks prompts until answered

### UI & DX (7 extensions)
- **pure-focus**: Distraction-free mode (no footer/status)
- **minimal**: Compact footer with model name + 10-block context meter
- **tool-counter**: Rich two-line footer (model, context, tokens, cost + cwd/branch, per-tool tally)
- **tool-counter-widget**: Live-updating above-editor per-tool call counts
- **session-replay**: Scrollable timeline overlay of session history
- **theme-cycler**: Keyboard shortcuts to cycle custom themes
- **system-select**: `/system` command to switch between agent personas from `.pi/agents/`

### Meta & Cross-Agent (2 extensions)
- **cross-agent**: Scans `.claude/`, `.gemini/`, `.codex/` dirs for commands/skills/agents and registers them in Pi
- **pi-pi**: Meta-agent that builds Pi agents using parallel research experts (ext-expert, theme-expert, tui-expert)

## Key Architecture Insights

**Agent Teams** configured in `.pi/agents/teams.yaml`:
```yaml
frontend: [planner, builder, bowser]
backend: [architect, implementer, tester]
```
Individual agent personas live as `.md` files in `.pi/agents/`.

**Agent Chains** defined in `.pi/agents/agent-chain.yaml` as sequential steps with `$INPUT` injection.

**Damage Control Rules** in `.pi/damage-control-rules.yaml` with four path policies (Zero Access, Read-Only, No-Delete, Dangerous Commands).

**Stacking**: Extensions compose — `pi -e extensions/minimal.ts -e extensions/cross-agent.ts`.

## Relevance to Our Harness

The repo demonstrates that Pi's extension system can implement the full orchestration patterns (subagent delegation, team dispatch, sequential chaining) entirely in user-space TypeScript, without modifying the core agent. This means our harness can adopt these patterns as `.pi/skills/` extensions rather than core code changes.
