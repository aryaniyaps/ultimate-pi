---
type: concept
status: developing
created: 2026-05-05
tags:
  - pi-agent
  - vscode
  - extension
  - ecosystem
related:
  - "[[pi-vscode-marketplace]]"
  - "[[pi-vscode-model-provider-marketplace]]"
  - "[[vscode-pi-community-extension]]"
  - "[[pi-coding-agent]]"
---

# Pi VS Code Extension Landscape

## Definition

Pi ecosystem now has three practical VS Code extension patterns:

1. **Official terminal bridge** (`pi0.pi-vscode`)
2. **Model provider bridge** (`tintinweb.vscode-pi-model-chat-provider`)
3. **Community full chat UI** (`cdervis.vscode-pi`)

## Pattern Differences

| Pattern | Primary UX | Best For | Tradeoff |
|---|---|---|---|
| Official terminal bridge | Pi terminal + IDE bridge tools | Native Pi workflow with VS Code context | Less integrated chat-first UI |
| Model provider bridge | Copilot Chat model picker | Reuse Pi models across LM API ecosystem | Less direct Pi session UX |
| Community full UI | Sidebar + chat UX | Rich local workflow and controls | Unofficial / prerelease risk |

## Key Insight

"Pi extension for VS Code" is not single product anymore. It is a small ecosystem with different architectural bets. Teams must choose by workflow shape: terminal-first, model-provider-first, or chat-sidebar-first.
