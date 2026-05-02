---
type: source
status: ingested
source_type: blog
title: "How Claude Code Actually Works: A Systems-Level Deep Dive"
author: "KaraxAI"
date_published: 2026-03-19
url: "https://karaxai.com/posts/how-claude-code-works-systems-deep-dive/"
confidence: medium
tags: [claude-code, architecture, CLAUDE.md, agent-loop, skills, plugins, MCP, subagents, hooks]
key_claims:
  - "Claude Code has 82,000+ GitHub stars and handles millions of coding sessions"
  - "CLAUDE.md is injected into user messages in <system-reminder> tags, every turn — not in system prompt"
  - "96% compliance with 5 conditional rule files (30 lines each) vs 92% with single 150-line CLAUDE.md"
  - "Three memory systems: CLAUDE.md (reliable), auto-memory (200-line limit, lossy), session memory (lossy)"
  - "Auto-compaction at ~83.5% of 200K window, ~85% payload reduction"
  - "Skills use progressive disclosure: 100 tokens at startup, full body on-demand"
  - "Subagents get fresh 200K context, only summary returns, cannot spawn own subagents"
  - "Hooks achieve 100% compliance; CLAUDE.md rules achieve ~92%"
  - "Deliberately no embeddings: 'agentic search generally works better' — Boris Cherny"
  - "The model is the commodity; the agent is the product"
created: 2026-05-02
updated: 2026-05-02
---
# Claude Code Systems Deep-Dive (KaraxAI, 2026)

## Source Summary

Comprehensive technical walkthrough published March 2026. Covers the full stack: context assembly, agentic loop, MCP, plugins. Based on reverse-engineered internals from mitmproxy interception, npm tarball analysis, and systematic prompt extraction. Notable for providing specific compliance numbers and the direct quote from Claude Code's creator about rejecting embeddings.

## CLAUDE.md Loading Hierarchy

```
Global (~/.claude/CLAUDE.md) → Enterprise → Project → Local → Notebook (cursor rules)
```

All tiers are additive. When instructions conflict, more specific (local) wins. Conditional rules via YAML frontmatter (`match: "*.test.ts"`) since v1.0.16.

## Agentic Loop

Single-threaded. Model receives context → produces response → if tool calls, execute, append to history, call again → if `stop_reason === "end_turn"`, stop. Between iterations: permission enforcement (hooks → deny rules → allow rules → ask rules → permission mode), context monitoring (auto-compaction at ~83.5%), state re-injection (CLAUDE.md re-sent every turn), mid-task steering (async dual-buffer queue).

## Context Compression

At ~167K/200K tokens, auto-compaction triggers. Summary in `<summary>` tags. All prior messages dropped. ~85% reduction (167K → ~25K). Lossy: old file contents, tool outputs lost; new summary + last 5 messages + CLAUDE.md survive.

## Skills

Progressive disclosure: scans `.claude/skills/` and `~/.claude/skills/`, loads only `name` + `description` (~100 tokens each) into `<available_skills>` block. Full content loads on invocation via Skill tool. Skills can include supporting files, restrict tools, spawn subagents. Built-in skills (`/simplify`, `/review`, `/batch`, `/loop`, `/debug`) are prompt-based, not hardcoded.

## Plugins

Directory with `.claude-plugin/plugin.json` manifest. Bundles any combination of: skills, agents, hooks, MCP servers, commands, CLAUDE.md. Namespacing: `/my-plugin:hello`. Agent override: plugin can replace main agent's system prompt. 9,000+ plugins across registries. Official marketplace ships built-in.

## No Embeddings

> "Early versions used RAG + a local vector db, but we found pretty quickly that agentic search generally works better." — Boris Cherny, Claude Code creator

Search hierarchy: Glob (file path matching, near-zero token cost) → Grep (ripgrep, regex-powered) → Read (full file load, reserved for confirmed-relevant files). Explore subagent on Haiku for deep exploration.

## Hooks

Deterministic escape hatch. Shell commands fire on lifecycle events. Exit codes: 0 = allow, 2 = block (stderr fed to Claude), other = non-blocking error. CLAUDE.md ~92% compliance. Hooks 100% for matched conditions.

## Key Quotes

> "The model is the commodity; the agent is the product."

> "Agentic search generally works better." — Boris Cherny

> "CLAUDE.md content is injected into user messages, wrapped in <system-reminder> XML tags. Every turn. Not once at session start — every single API call re-sends it."
