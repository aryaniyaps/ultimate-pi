---
type: concept
title: "browser-harness — Self-Healing CDP Harness"
status: developing
created: 2026-05-02
updated: 2026-05-02
tags:
  - browser-automation
  - cdp
  - headless-browser
  - browser-harness
aliases: ["browser-harness", "CDP harness"]
related:
  - "[[browser-subagent-visual-verification]]"
  - "[[harness-implementation-plan]]"
  - "[[Source: browser-harness CDP Harness]]"
sources:
  - "[[Source: browser-harness CDP Harness]]"

---# browser-harness — Self-Healing CDP Harness

Cutting-edge SOTA thin CDP harness by browser-use (9.4K GitHub stars, MIT, Python). Connects LLMs directly to Chrome via one WebSocket — nothing between. Self-healing: the agent writes missing helper functions mid-execution.

## Core Idea

No Puppeteer. No Playwright. No pre-baked helpers. Just raw Chrome DevTools Protocol over a WebSocket. The agent calls `session.Page.navigate()`, `session.Input.dispatchMouseEvent()` — exactly what CDP provides, nothing hidden.

When the agent encounters a missing interaction pattern, it writes the helper itself in `agent-workspace/agent_helpers.py`. The harness improves itself every run.

## Architecture

- **browser-harness** (Python, 9.4K stars): ~592 lines of core. Agent-editable workspace + domain skills.
- **browser-harness-js** (TypeScript, 428 stars): 652 typed CDP methods. Bun-native REPL. `npx skills add` install.

## Key Properties

- **Minimal**: ~592 lines of Python. One WebSocket to Chrome.
- **Self-healing**: Agent writes missing helpers mid-task.
- **CDP-native**: 56+ domains, 652+ methods — no wrappers, no abstraction.
- **Agent-editable**: `agent_helpers.py` and `domain-skills/` designed for agent modification.
- **No version drift**: Auto-generated from Chrome protocol JSON.
