---
type: source
status: ingested
source_type: conference-recap
author: Zack Proser, WorkOS
date_published: 2025-10-29
url: https://workos.com/blog/augment-code-context-is-the-new-compiler
confidence: high
key_claims:
  - "Augment's context engine uses vector search to understand how code actually behaves"
  - "Maps relationships and patterns across a project semantically, not by tokens or grep"
  - "Automatically enriches prompts with relevant context from existing code"
  - "Detected reusable Git library within codebase instead of shelling out to git"
  - "Good code is often no new code at all"
  - "Context engines act as institutional memory for large teams"
tags:
  - augment-code
  - context-engine
  - semantic-search
  - erc-2025
created: 2026-05-02
updated: 2026-05-02

---# Augment Code: Context Is the New Compiler (WorkOS ERC 2025)

## Summary

At the 2025 Enterprise Ready Conference, Chris Kelly from Augment Code demonstrated their CLI and argued that AI coding tools have been missing context — the hard-won understanding that separates senior engineering from code generation.

## Key Arguments

### Why AI Coding Feels Junior
- Seasoned engineers recall patterns, reference internal libraries, and respect constraints from years of debugging.
- AI assistants are good at syntax, weak at understanding intent.
- Asking AI to "just write it" asks it to act without grounding in the codebase reality.

### Augment's Answer: Context Engines
- Deeply indexes codebase semantically, not by tokens or grep.
- Uses vector search to understand how code actually behaves.
- When a feature is requested, the system automatically enriches the prompt with relevant context.
- Pulls in established patterns, libraries, and internal utilities — choosing reuse over reinvention.

### Live Demo: Git Branch Status Bar
- Simple task: customize status bar to include current Git branch.
- Other assistant: shelled out to git in a new process.
- Augment: detected a reusable Git library already in the company codebase and built on top of it.
- "Good code is often no new code at all."

### Beyond Code Generation
- Vectorized index acts as institutional memory for large teams.
- Surfaces prior art and avoids duplication.
- AI that learns organization idioms, team patterns, and project scars.

## Relevance to Implementation
The "prompt enhancer" concept is directly implementable: pre-process user queries by querying a semantic index of the codebase, then inject retrieved context into the prompt before sending to the LLM.
