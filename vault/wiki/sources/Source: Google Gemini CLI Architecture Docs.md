---
type: source
status: ingested
source_type: official-documentation
author: Google
date_published: 2025-06-25
date_accessed: 2026-05-01
url: https://google-gemini.github.io/gemini-cli/docs/architecture.html
confidence: high
key_claims:
  - Gemini CLI is composed of CLI package (frontend) and Core package (backend)
  - Core receives requests, orchestrates Gemini API, manages tool execution
  - Tools are individual modules for filesystem, shell, web fetch, search
  - ReAct loop: user input → CLI → Core → Gemini API → tool execution → final response
  - Key design principles: modularity, extensibility, user experience
  - Read-only ops may not require user confirmation; write ops always do
created: 2026-05-02
updated: 2026-05-02
tags: [source]
---
# Gemini CLI Architecture (Official Docs)

## What It Is

The official architecture documentation for Google's Gemini CLI, an open-source AI agent (Apache 2.0) that brings Gemini models directly into the terminal.

## Core Components

1. **CLI package (`packages/cli`)**: User-facing — input processing, history management, display rendering, theme/UI customization, CLI configuration.

2. **Core package (`packages/core`)**: Backend — API client for Gemini API, prompt construction/management, tool registration/execution, state management, server-side configuration.

3. **Tools (`packages/core/src/tools/`)**: Individual modules extending Gemini model capabilities — filesystem operations, shell commands, web fetching, Google Search grounding, multi-file read, memory, MCP server bridge.

## Interaction Flow

1. User types prompt → CLI package
2. CLI sends to Core package
3. Core constructs prompt (history + tool definitions), sends to Gemini API
4. Gemini API returns response (direct answer OR tool request)
5. If tool: Core prepares execution, requests user approval for write/shell ops, executes, sends result back to API
6. Core sends final response back to CLI
7. CLI displays to user

## Design Principles

- **Modularity**: Separating frontend from backend enables independent development and alternative frontends
- **Extensibility**: Tool system designed for adding new capabilities
- **User Experience**: Rich interactive terminal experience via CLI package

## Relevance to Ultimate-PI

The two-package architecture (CLI/Core) maps to our L1-L4 (Core/Harness) vs L5-L8 (Observability/Memory/Orchestration) separation. Their tool registration + execution logic parallels our tool definitions. Their ReAct loop with approval gates parallels our planned pre-execution policy gates (P-F1).
