---
type: concept
title: "Browser Subagent for Visual Verification"
status: developing
created: 2026-05-01
updated: 2026-05-01
tags:
  - antigravity
  - browser-automation
  - visual-verification
  - tools
aliases: ["headless browser agent", "visual verification subagent"]
related:
  - "[[agentic-harness]]"
  - "[[harness-implementation-plan]]"
  - "[[grounding-checkpoints]]"
sources:
  - "[[cursor-vs-antigravity-2026]]"
  - "[[google-antigravity-official-blog]]"
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
- **Syntax-level** (P11 inline validation, Phase 16 lint/format)
- **Semantic-level** (L4 adversarial critic)
- **Observability-level** (L5 metrics)

None of this can verify that a UI change actually produced the correct visual result.

## Proposed Integration: Phase P30

Add a **Browser Subagent** to the tool registry:
- `lib/harness-browser.ts` — Puppeteer/Playwright-based headless browser driver
- `extensions/harness-browser.ts` — Extension hook: after UI-related edits, optionally trigger visual verification
- Configurable: `.pi/harness/browser.json` — enable/disable, screenshot directories, viewport configs

The browser subagent operates as a specialized subagent (P25 router dispatches UI tasks to it). It reports results as artifacts (P31).
