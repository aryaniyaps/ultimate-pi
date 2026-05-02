---
type: source
source_type: engineering-blog
title: "Build with Google Antigravity, our new agentic development platform"
author: "Google Antigravity Team"
date_published: 2025-11-20
url: "https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/"
confidence: high
status: ingested
created: 2026-05-01
updated: 2026-05-01
tags:
  - antigravity
  - google
  - agentic-coding
  - harness-design
key_claims:
  - "Antigravity combines AI-powered IDE with agent-first Manager Surface"
  - "Agents autonomously plan, execute, and verify complex tasks across editor, terminal, and browser"
  - "Artifacts (task lists, implementation plans, screenshots, browser recordings) replace raw tool call logs"
  - "Agents learn from past work via knowledge base"
  - "Free public preview with Gemini 3 Pro, Claude Sonnet 4.5, and GPT-OSS support"
  - "Cross-platform: macOS, Windows, Linux"

---# Build with Google Antigravity (Official Announcement)

Google's official announcement blog post for Antigravity, published November 20, 2025.

## Summary

Antigravity is an **agentic development platform** that introduces two distinct interfaces:

- **Editor View**: Traditional AI-powered IDE with tab completions and inline commands
- **Manager Surface**: Dedicated interface to spawn, orchestrate, and observe multiple agents working asynchronously

The platform is built around four design tenets: trust, autonomy, feedback, and self-improvement.

## Key Details

- **Artifacts**: Tangible deliverables replacing raw tool call logs. Developers comment directly on artifacts (Google Docs-style) and agents incorporate feedback without stopping execution.
- **Learning**: Core primitive. Agents save useful context and code snippets to knowledge base for future tasks.
- **Pricing**: Free public preview for individuals with generous rate limits on Gemini 3 Pro.
- **Models**: Gemini 3 Pro, Anthropic Claude Sonnet 4.5, OpenAI GPT-OSS.

## Relevance to Harness

This is the primary source for understanding Antigravity's architecture. The Artifact system, Manager View, and learning knowledge base are the three innovations most relevant to our harness design.
