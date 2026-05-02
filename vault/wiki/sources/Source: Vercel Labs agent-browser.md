---
type: source
status: ingested
source_type: official-repo
title: "agent-browser — Browser Automation CLI for AI Agents by Vercel Labs"
author: "Vercel Labs"
date_published: 2026-04-16
url: "https://github.com/vercel-labs/agent-browser"
confidence: high
tags:
  - browser-automation
  - ai-agents
  - vercel-labs
  - rust
  - cdp
  - headless-browser
related:
  - "[[agent-browser-browser-automation]]"
  - "[[browser-subagent-visual-verification]]"
  - "[[harness-implementation-plan]]"
key_claims:
  - "31.4K GitHub stars, 1.9K forks, 568 commits, Apache 2.0 — Rust-native browser automation CLI for AI agents"
  - "Native Rust CLI + daemon — single binary, no Node.js required after install"
  - "npm install -g agent-browser for global install. Also Homebrew, Cargo."
  - "Snapshot + refs workflow optimized for LLMs: snapshot -i → click @e2 → fill @e3"
  - "React introspection: react tree, react inspect, react renders, react suspense"
  - "Web Vitals: LCP/CLS/TTFB/FCP/INP with React hydration phases"
  - "Annotated screenshots: --annotate overlays numbered labels matching @eN refs"
  - "Diff: structural snapshot diff + visual pixel diff between pages/states"
  - "Multi-provider: Chrome local, Browserless, Browserbase, Browser Use, Kernel, AgentCore, iOS"
  - "Security: domain allowlist, action policy, content boundaries, action confirmation"
  - "Skills system: agent-browser skills get core — 420-line usage guide, npx skills add"
  - "Dashboard: local web dashboard with live viewport, activity feed, AI chat"
  - "batch mode: multi-command single invocation; session persistence; auth vault"
  - "112 contributors, 81 releases, Rust 85% + TypeScript 12.4%"
created: 2026-05-02
updated: 2026-05-02
---

# agent-browser — Browser Automation CLI for AI Agents

**Repository**: https://github.com/vercel-labs/agent-browser
**Stars**: 31.4K | **Forks**: 1.9K | **Commits**: 568 | **License**: Apache 2.0
**Language**: Rust 85% + TypeScript 12.4% | **Status**: Active (v0.26.0, Apr 16, 2026)

## What It Is

agent-browser is a **Rust-native browser automation CLI purpose-built for AI agents**. Unlike traditional browser automation tools (Puppeteer, Playwright, Selenium) designed for human scripting, agent-browser provides an agent-first interface: snapshot-based element refs (`@e1`, `@e2`), JSON output mode, annotated screenshots, and structured diff commands.

**Core philosophy**: Give AI agents a CLI that speaks their language — refs, snapshots, JSON — not a scripting API.

## Architecture

```
AI Agent → agent-browser CLI → Rust Daemon → Chrome DevTools Protocol → Chrome
              ↑                        ↑
              skills/                   agent-browser.json (config)
              (SKILL.md discovery)      .agent-browser/ (sessions, auth)
```

- **Rust CLI**: Parses commands, communicates with daemon via IPC
- **Rust Daemon**: Pure Rust daemon using direct CDP. No Node.js required.
- **Client-daemon model**: Daemon auto-starts, persists between commands for speed
- **Multi-provider backend**: Local Chrome, Browserless, Browserbase, Browser Use, Kernel, AgentCore, iOS

## Key Properties

| Property | Description |
|----------|-------------|
| **Agent-native** | Snapshot with refs (`@e1`), JSON output, annotated screenshots with matching labels |
| **Rust-native** | Single binary, sub-second startup. 85% Rust, 12.4% TypeScript |
| **Full CLI** | 80+ commands: navigate, interact, snapshot, screenshot, diff, react, network, auth |
| **Skills system** | `agent-browser skills get core` — 420-line usage guide. `npx skills add vercel-labs/agent-browser` |
| **Security-first** | Domain allowlist, action policy, content boundaries, auth vault with AES-256-GCM encryption |
| **Multi-provider** | Local Chrome + 6 cloud providers (Browserless, Browserbase, Browser Use, Kernel, AgentCore, iOS) |
| **Dashboard** | Local web dashboard (port 4848) with live viewport, activity feed, AI chat |
| **Batch mode** | Multiple commands in single CLI invocation, JSON stdin mode |
| **Diff** | Structural snapshot diff + visual pixel diff between before/after states |
| **React introspection** | React component tree, fiber inspection, suspense boundaries, render profiling |
| **Web Vitals** | LCP/CLS/TTFB/FCP/INP with React hydration phase breakdown |

## Why agent-browser Replaces browser-harness for P30

| Aspect | browser-harness | agent-browser |
|--------|----------------|---------------|
| **Stars** | 9.4K | 31.4K (3.3× larger) |
| **Language** | Python (~592 lines core) | Rust (native binary, sub-second) |
| **AI agent workflow** | Raw CDP — agent writes helpers mid-execution | Snapshot + refs — purpose-built for LLMs |
| **Skill system** | None | Built-in: `skills get core`, `npx skills add` |
| **Diff/verify** | None | Structural + visual diff between states |
| **Annotated screenshots** | None | `--annotate` with numbered labels → `@eN` refs |
| **React/Vitals** | None | `react tree`, `react renders`, `vitals` |
| **Security** | None | Domain allowlist, action policy, boundaries, auth vault |
| **Cloud providers** | None | 6 providers (Browserless, Browserbase, BW, Kernel, AgentCore, iOS) |
| **Dashboard** | None | Live viewport + activity feed + AI chat |
| **Install** | `uv add browser-harness` (Python) | `npm install -g agent-browser` (single binary) |
| **Maturity** | 253 commits, 1 main contributor | 568 commits, 112 contributors, 81 releases |
| **License** | MIT | Apache 2.0 |

## Integration with ultimate-pi Harness (P30)

```
P25 Subagent Router → P30 Browser Subagent
    ↓
agent-browser CLI (Rust binary, sub-second startup)
    ↓
Chrome DevTools Protocol (Rust daemon)
    ↓
Chrome (headless or headed)
    ↓
Visual verification: agent-browser snapshot -i → click @e2 → screenshot --annotate
    ↓
Diff: agent-browser diff screenshot --baseline before.png
```

### Harness Config

```json
// .pi/harness/browser.json
{
  "engine": "agent-browser",
  "mode": "headless",
  "screenshot_dir": ".pi/harness/screenshots/",
  "viewport": {"width": 1280, "height": 720},
  "timeout_ms": 25000
}
```

### Key Commands for Harness P30

```bash
# Navigate and snapshot
agent-browser open <url> && agent-browser snapshot -i --json

# Interact via refs
agent-browser click @e2
agent-browser fill @e3 "text"

# Visual verification
agent-browser screenshot --annotate before.png
# ... code change ...
agent-browser reload
agent-browser screenshot --annotate after.png
agent-browser diff screenshot --baseline before.png -o diff.png

# Structural diff
agent-browser diff snapshot --baseline before-snapshot.txt
```

## What We Deliberately Do NOT Adopt

- **Dashboard UI**: CLI harness only. Dashboard is nice-to-have for debugging but not integrated.
- **AI Chat feature**: Uses Vercel AI Gateway. Our agent IS the chat. Not needed.
- **Cloud providers**: Local Chrome only for harness. Cloud providers add latency and cost. Available as opt-in.
- **iOS Simulator**: Out of scope for web-focused harness. Available as opt-in.
