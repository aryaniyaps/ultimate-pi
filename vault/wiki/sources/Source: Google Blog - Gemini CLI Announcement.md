---
type: source
status: ingested
source_type: official-announcement
author: Taylor Mullen, Ryan J. Salva (Google)
date_published: 2025-06-25
date_accessed: 2026-05-01
url: https://blog.google/innovation-and-ai/technology/developers-tools/introducing-gemini-cli-open-source-ai-agent/
confidence: high
key_claims:
  - Gemini CLI: open-source AI agent (Apache 2.0) bringing Gemini to terminal
  - Free tier: 60 req/min, 1,000 req/day with personal Google account (industry's largest allowance)
  - Access to Gemini 2.5 Pro with 1M token context window
  - Built-in tools: Google Search grounding, MCP support, bundled extensions, customizable prompts
  - Non-interactive mode for script automation
  - Shares technology with Gemini Code Assist (VS Code + terminal)
  - Open source: global community contribution expected
created: 2026-05-02
updated: 2026-05-02
tags: [source]
---
# Google Official Blog: Gemini CLI Announcement

## What It Is

Official launch announcement for Gemini CLI, published June 25, 2025 on Google's blog (The Keyword). Authored by Taylor Mullen (Senior Staff Software Engineer, creator of Gemini CLI) and Ryan J. Salva (Senior Director, Product Management).

## Key Announcements

### Free Tier (Unprecedented)
- 60 model requests per minute
- 1,000 model requests per day
- Access to Gemini 2.5 Pro with 1M token context window
- Requires only personal Google account
- Marketed as "industry's largest allowance"

### Core Capabilities
- Code understanding, file manipulation, command execution, dynamic troubleshooting
- Ground prompts with Google Search for real-time web context
- Extend via MCP (Model Context Protocol) or bundled extensions
- Customize prompts and instructions for specific workflows
- Automate tasks via non-interactive script invocation

### Open Source
- Apache 2.0 license
- Full source on GitHub: github.com/google-gemini/gemini-cli
- Community contribution expected (bugs, features, security, code)
- Emerging standards: MCP, system prompts (GEMINI.md), settings

### Gemini Code Assist Integration
- Shares technology with Code Assist (VS Code)
- Agent mode in Code Assist: multi-step planning, auto-recovery from failures
- Available on all plans (free, Standard, Enterprise)

## Relevance to Ultimate-PI

The free tier economics (60 req/min, 1,000 req/day) make Gemini CLI viable as a *model provider* within our multi-model harness. The 1M token window + Google Search grounding directly complement our L3 Grounding layer. The open-source model (Apache 2.0) means we can study and adapt their harness patterns without license concerns.
