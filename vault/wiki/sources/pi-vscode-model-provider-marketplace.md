---
type: source
source_type: marketplace-listing
title: "Pi Coding Agent - Language Model Provider"
author: "tintinweb"
date_published: 2026-02-12
date_accessed: 2026-05-05
url: "https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-pi-model-chat-provider"
confidence: high
tags:
  - pi-agent
  - vscode
  - copilot-chat
  - language-model-provider
  - extension
key_claims:
  - "Extension exposes Pi models to VS Code's Language Model API (vscode.lm.*)"
  - "350 installs as of 2026-05-05 scrape"
  - "Lets users pick Pi models directly in GitHub Copilot Chat model picker"
  - "Pi runs as separate process with RPC communication and internal tool execution"
---

# Pi Language Model Provider Extension (tintinweb)

## Summary

This extension integrates Pi with VS Code's Language Model Provider API (`vscode.lm.*`). Instead of opening a dedicated Pi terminal UI, it makes Pi models appear in the model picker so Copilot Chat and other LM-enabled extensions can call Pi-backed models.

## Key Details

- Install count: 350
- Marketplace status: Preview
- Published: 2026-02-12
- Publisher: tintinweb
- Main integration target: GitHub Copilot Chat + any `vscode.lm.*` consumer

## Why This Matters for Topic

This is one concrete interpretation of "extension for pi coding agent" in VS Code: Pi as a model provider, not just a terminal companion. It expands where Pi can be used inside VS Code extension ecosystem.
