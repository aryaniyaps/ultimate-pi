---
type: source
status: ingested
source_type: official-repo
title: "browser-harness — Self-Healing CDP Harness by browser-use"
author: "browser-use"
date_published: 2026-04-17
url: "https://github.com/browser-use/browser-harness"
confidence: high
tags:
  - browser-automation
  - cdp
  - headless-browser
  - browser-harness
  - self-healing
related:
  - "[[Research: Google Antigravity Harness Integration]]"
  - "[[browser-subagent-visual-verification]]"
  - "[[browser-harness-agent]]"
key_claims:
  - "9.4K GitHub stars, 855 forks, 253 commits, MIT license — thin CDP harness for LLM browser control"
  - "~592 lines of Python core — connects LLM directly to Chrome via one WebSocket, nothing between"
  - "Self-healing: agent writes missing helper functions mid-task during execution"
  - "TypeScript version available: browser-harness-js (428 stars, Bun-native, 652 typed CDP wrappers)"
  - "No pre-baked helpers — raw CDP protocol. Agent calls session.Domain.method() directly"
  - "One WebSocket to Chrome, zero abstraction layers. The protocol IS the API"
  - "agent-workspace: agent-editable helper code + domain-skills/ for reusable per-site playbooks"
created: 2026-05-02
updated: 2026-05-02

---

# browser-harness — Self-Healing CDP Harness

**Repository**: https://github.com/browser-use/browser-harness
**Stars**: 9.4K | **Forks**: 855 | **Commits**: 253 | **License**: MIT
**Language**: Python 100% | **Status**: Active (commits today — May 2, 2026)

## What It Is

browser-harness is a **minimal, self-healing CDP harness** that connects LLMs directly to Chrome via the Chrome DevTools Protocol. Unlike Puppeteer/Playwright (which wrap CDP with high-level helper APIs), browser-harness gives the LLM **direct CDP access** — the agent writes what's missing during execution.

**Core philosophy**: "One WebSocket to Chrome, nothing between. The agent writes what's missing during execution. The harness improves itself every run."

## Architecture

```
LLM Agent → browser-harness → Chrome DevTools Protocol (CDP) → Chrome
              ↑
              agent-workspace/agent_helpers.py (agent edits this!)
              agent-workspace/domain-skills/ (reusable per-site playbooks)
```

## Key Properties

| Property | Description |
|----------|-------------|
| **Minimal** | ~592 lines of Python core. No Puppeteer, no Playwright, no Selenium. |
| **Self-healing** | Agent encounters missing helper → agent writes it mid-task → harness works next time. |
| **CDP-native** | Direct `session.Page.navigate()`, `session.Input.dispatchMouseEvent()` — no wrappers. |
| **Thin** | One WebSocket to Chrome. Nothing between the LLM and the browser. |
| **Agent-editable** | `agent-workspace/agent_helpers.py` is designed for the agent to edit during execution. |
| **Domain skills** | `agent-workspace/domain-skills/` — reusable playbooks per site (GitHub, LinkedIn, Amazon…). |

## TypeScript Version: browser-harness-js

**Repository**: https://github.com/browser-use/browser-harness-js
**Stars**: 428 | **License**: MIT | **Language**: TypeScript 99.4%

- 56 CDP domains, 652 typed wrappers — auto-generated from protocol JSON
- `npx skills add https://github.com/browser-use/browser-harness-js`
- Bun-native REPL server. CLI forwards snippets to running session.
- **No helpers at all** — "The protocol IS the API. If Chrome can do it, you can call it."
- Pure CDP recipes in `interaction-skills/`

## Why browser-harness Replaces Puppeteer for P30

| Aspect | Puppeteer | browser-harness |
|--------|-----------|-----------------|
| **Abstraction level** | High-level helpers (page.click, page.type) | Raw CDP (session.Input.dispatchMouseEvent) |
| **LLM-native** | Designed for human scripting | Designed for LLMs to write CDP calls directly |
| **Self-healing** | No — fix scripts manually | Yes — agent writes missing helpers mid-execution |
| **Weight** | Heavy npm package + Chromium download | ~592 lines of Python or ~650 typed CDP wrappers in TS |
| **Freedom** | Limited to pre-built helper API | Complete CDP freedom — all 56+ domains accessible |
| **Version drift** | Puppeteer must update for new Chrome features | Auto-generated from CDP protocol JSON — always current |
| **Deployment** | `npm install puppeteer` | `uv init && uv add browser-harness` (Python) or `npx skills add` (JS) |

## Integration with ultimate-pi Harness (P30)

```
P25 Subagent Router → P30 Browser Subagent
    ↓
browser-harness (thin CDP harness)
    ↓
Chrome DevTools Protocol (one WebSocket)
    ↓
Chrome (headless or headed)
    ↓
Visual verification: screenshots via CDP Page.captureScreenshot
    ↓
Self-healing: agent writes missing interaction helpers in agent_helpers.py
```

### TypeScript Stack Preference

For our TypeScript harness, **browser-harness-js** is the natural fit:
- TypeScript-native (99.4% TS)
- 652 typed CDP methods auto-generated from protocol JSON
- Installed via `npx skills add` — no Python dependency
- Bun REPL server for persistent sessions across agent turns

For maximum capability (domain skills, mature agent-workspace), **browser-harness** (Python) provides more features. Hybrid approach: use browser-harness-js for the core CDP bridge, borrow the domain-skills pattern from browser-harness.

### Config

```json
// .pi/harness/browser.json
{
  "engine": "browser-harness",
  "variant": "browser-harness-js",
  "mode": "headless",
  "cdp_url": "http://localhost:9222",
  "screenshot_dir": ".pi/harness/screenshots/",
  "agent_workspace": ".pi/harness/browser-workspace/"
}
```
