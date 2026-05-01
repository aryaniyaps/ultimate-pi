---
type: source
source_type: analysis
title: "Cursor: How Forking VS Code Built a $29B Company"
author: "MMNTM Research"
date_published: 2025-12-15
url: "https://www.mmntm.net/articles/cursor-deep-dive"
confidence: medium
tags: [cursor, vs-code-fork, vertical-agents, architecture, business]
key_claims:
  - "Forking VS Code = root access to developer workflow. Plugins cannot replicate this"
  - "Extension API constraints: limited UI, process isolation, context blindness"
  - "Shadow Workspace, native diffs, terminal interception, cursor teleportation all require fork"
  - "Model agnosticism as competitive moat vs Copilot's OpenAI lock-in"
  - "Vertical agent thesis: interface and intelligence cannot be decoupled"
  - "The fork tax: constant upstream VS Code merges required"
---

# Cursor: How Forking VS Code Built a $29B Company

MMNTM Research analysis (Dec 2025) of Cursor's architectural strategy and business model.

## The Extension Trap

VS Code Extension API constraints:
- Limited UI control (no inline diff rendering)
- Process isolation (Extension Host separate from Renderer/Main)
- Context blindness (can't cheaply access full editor state)

Copilot operates within these constraints. Cursor bypasses them by forking VS Code entirely.

## The Fork = Root Access

Forking under MIT license gave Anysphere access to C++ and TypeScript internals. Enables:
- Shadow Workspace (hidden parallel editor instances)
- Native diff rendering (inline color-coded overlays)
- Terminal interception (read output, inject commands)
- Tab teleportation (predict and animate cursor position)

Tax: monthly VS Code upstream merges. Dedicated team for "keeping the lights on."

## Vertical Agent Thesis

"The interface and the intelligence cannot be decoupled." Winners aren't building best models — they're building best environments for models. Harvey (legal), Abridge (clinical), Cursor (coding). Pattern repeats across domains.

## Relevance to Harness

Meta-lesson: architectural control matters more than model access. Our .pi/ harness architecture is our "fork" — we intercept tool calls, enforce pipeline stages, and control the agent's environment. The question is whether we have enough control points to match what Cursor achieves with editor-level access. We do: tool interception hooks give us equivalent leverage in a CLI/agent context.
