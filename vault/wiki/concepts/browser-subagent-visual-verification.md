---
type: concept
title: "Browser Subagent for Visual Verification"
status: developing
created: 2026-05-01
updated: 2026-05-02
tags:
  - antigravity
  - browser-automation
  - visual-verification
  - tools
  - agent-browser
aliases: ["headless browser agent", "visual verification subagent"]
related:
  - "[[agentic-harness]]"
  - "[[harness-implementation-plan]]"
  - "[[grounding-checkpoints]]"
  - "[[agent-browser-browser-automation]]"
sources:
  - "[[cursor-vs-antigravity-2026]]"
  - "[[google-antigravity-official-blog]]"
  - "[[Source: Vercel Labs agent-browser]]"
---

# Browser Subagent for Visual Verification

Antigravity's most distinctive technical capability: an agent subprocess that drives a headless Chromium browser to visually verify UI changes.

## How It Works

1. Agent makes a code change (e.g., CSS fix)
2. Agent spins up local dev server
3. Browser subagent opens headless Chrome
4. Subagent navigates to the affected page
5. Takes before/after screenshots
6. Uses vision-optimized models to analyze pixel differences
7. Verifies the fix worked visually
8. Reports results with screenshot evidence

## Why This Is Revolutionary

Traditional coding agents are **blind**. They reason about code as text but cannot see what it produces. A CSS change that "looks right" to the model may look completely wrong in the browser. The browser subagent closes this loop.

## Use Cases

- **CSS/UI fixes**: Agent sees if padding/margins/layout actually work
- **Visual regression testing**: Before/after screenshots as verifiable artifacts
- **Cross-device verification**: Test at different viewport sizes
- **Form interaction testing**: Click buttons, fill forms, verify behavior
- **Login flow testing**: Automate auth flows end-to-end

## Gap in Our Harness

Our harness has **no browser control capability**. All verification is:
- **Syntax-level** (P11 inline validation, P20 lint/format)
- **Semantic-level** (L4 adversarial critic)
- **Observability-level** (L5 metrics)

None of this can verify that a UI change actually produced the correct visual result.

## Proposed Integration: Phase P30

Add a **Browser Subagent** to the tool registry:
- `lib/harness-browser.ts` — agent-browser driving headless Chrome via Rust daemon
- `extensions/harness-browser.ts` — Extension hook: after UI-related edits, optionally trigger visual verification
- Configurable: `.pi/harness/browser.json` — enable/disable, screenshot directories, viewport configs

The browser subagent operates as a specialized subagent (P25 router dispatches UI tasks to it). It reports results as artifacts (P31).

> [!update] May 2026: Replaced browser-harness (9.4K stars, Python) with **Vercel Labs agent-browser** (31.4K stars, Apache 2.0, Rust-native). agent-browser provides richer AI agent integration: snapshot + refs workflow, annotated screenshots, structured diff, React introspection, Web Vitals, batch mode, and built-in skills system. See [[agent-browser-browser-automation]] and [[Source: Vercel Labs agent-browser]].

### Why agent-browser over browser-harness

| Feature | browser-harness | agent-browser |
|---------|----------------|---------------|
| **Ecosystem** | 9.4K stars, Python | 31.4K stars, Rust-native binary |
| **Agent workflow** | Raw CDP — agent writes helpers | Snapshot + @eN refs — purpose-built |
| **Visual diff** | None | `diff screenshot --baseline before.png` |
| **Annotated screenshots** | None | `--annotate` with numbered labels |
| **Skills system** | None | `skills get core`, `npx skills add` |
| **Batch mode** | None | Multi-command single invocation |
| **Install** | `uv add browser-harness` (Python dep) | `npm install -g agent-browser` (single binary) |
