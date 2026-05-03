---
type: concept
title: "agent-browser — Rust-Native Browser Automation for AI Agents"
status: developing
created: 2026-05-02
updated: 2026-05-02
tags:
  - browser-automation
  - ai-agents
  - vercel-labs
  - rust
  - cdp
  - headless-browser
aliases: ["agent-browser", "Vercel Labs agent-browser"]
related:
  - "[[browser-subagent-visual-verification]]"
  - "[[harness-implementation-plan]]"
  - "[[Source: Vercel Labs agent-browser]]"
sources:
  - "[[Source: Vercel Labs agent-browser]]"
---

# agent-browser — Rust-Native Browser Automation for AI Agents

Vercel Labs agent-browser (31.4K GitHub stars, Apache 2.0, v0.26.0) is the leading open-source browser automation CLI built specifically for AI agents. Rust-native single binary, 112 contributors, 81 releases, 568 commits.

**Supersedes**: [[browser-harness-agent]] (9.4K stars, MIT, Python) — replaced May 2026 for P30. agent-browser has 3.3× more stars, richer AI agent integration, and Rust-native performance.

## Core Design

Unlike Puppeteer/Playwright (human scripting APIs) and browser-harness (raw CDP with self-healing), agent-browser provides an **agent-native interface**: snapshot-based element refs (`@e1`, `@e2`), JSON output, annotated screenshots, structured diff, and a built-in skills system. The AI agent thinks in terms of refs from snapshots — not CSS selectors, not CDP method calls.

## Key Innovations for AI Agents

### 1. Snapshot + Refs Workflow
```
agent-browser snapshot -i --json
→ Returns: {"refs": {"e1": {"role":"button","name":"Submit"}, "e2": {"role":"textbox","name":"Email"}}}
agent-browser click @e1          # deterministic, no DOM re-query
agent-browser fill @e2 "text"    # refs survive page changes until re-snapshot
```

### 2. Annotated Screenshots
```
agent-browser screenshot --annotate
→ Screenshot with numbered labels [1], [2], [3] matching @e1, @e2, @e3 refs
→ Multimodal models can reason about visual layout + refs simultaneously
```

### 3. Structured Diff
```
agent-browser diff screenshot --baseline before.png -o diff.png
agent-browser diff snapshot --baseline before-snapshot.txt
→ Structural + visual diff for verifying UI changes
```

### 4. React Introspection
```
agent-browser open --enable react-devtools <url>
agent-browser react tree           # full component tree
agent-browser react suspense       # suspense boundaries + classifier
agent-browser vitals               # LCP/CLS/TTFB/FCP/INP + React hydration
```

### 5. Batch Mode
```
agent-browser batch "open url" "snapshot -i" "click @e1" "screenshot"
→ Multiple commands in single CLI invocation, reduces process startup overhead
```

### 6. Built-in Skills
```
agent-browser skills get core      # 420-line usage guide for agents
npx skills add vercel-labs/agent-browser  # install skill stub
```

## Architecture

- **Rust CLI** + **Rust Daemon**: Single binary. Daemon auto-starts, persists between commands
- **Client-daemon**: Fast subsequent commands (no browser restart)
- **Direct CDP**: Like browser-harness — raw DevTools Protocol, no Puppeteer wrappers
- **Multi-provider**: Local Chrome + 6 cloud providers (Browserless, Browserbase, Browser Use, Kernel, AgentCore, iOS)

## Integration with P30

P30 Browser Subagent dispatches via P25 router for UI tasks. Harness invokes `agent-browser` CLI as a subprocess (or via batch mode for multi-step workflows). Config at `.pi/harness/browser.json`.

**What we use**:
- Snapshot + refs for element interaction
- Annotated screenshots for visual verification
- Diff for before/after comparison
- Batch mode for multi-step agent workflows
- `--json` for structured output parsing

**What we skip**:
- Dashboard (CLI harness only)
- AI Chat (our agent IS the chat)
- Cloud providers (local Chrome only; opt-in for serverless)
- iOS Simulator (web-focused; opt-in)
