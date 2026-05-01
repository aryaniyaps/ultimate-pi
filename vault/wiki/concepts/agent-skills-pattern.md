---
type: concept
title: "Agent Skills Pattern (Progressive Disclosure)"
created: 2026-05-01
updated: 2026-05-01
status: developing
tags:
  - harness
  - skills
  - context-engineering
  - gemini-cli
related:
  - "[[harness-engineering-first-principles]]"
  - "[[gemini-cli-architecture]]"
sources:
  - "[[Source: Gemini CLI Changelogs]]"
  - "[[Source: LangChain - Anatomy of Agent Harness]]"
---

# Agent Skills Pattern: Progressive Disclosure

## What It Is

Agent Skills is a harness-level primitive for **progressive disclosure**: skills are loaded on-demand via an activation mechanism rather than all at context start. This prevents context rot — the observed degradation in model performance as the context window fills with irrelevant tool definitions and instructions.

## Why It Matters

Too many tools or MCP servers loaded into context on agent start degrades performance _before_ the agent can start working. Skills solve this by loading only when needed:

1. Agent starts with minimal context (core tools + system prompt)
2. Agent analyzes task, determines which skills are relevant
3. Agent calls `activate_skill` tool to load specific skill's instructions + tools
4. Skill's context injected into current conversation
5. Agent uses skill, then moves on (skill context may persist or be compacted)

## Gemini CLI Implementation (v0.23+)

- **v0.23 (Jan 2026)**: Experimental Agent Skills support via agentskills.io
- **v0.24**: Built-in agent skills, `/skills install/uninstall`, `/agents refresh`
- **v0.25**: `activate_skill` tool formalized, `pr-creator` skill, skills enabled by default
- **v0.26**: `skill-creator` meta-skill (skills that create skills)
- **v0.30**: SDK package enabling custom skills with dynamic system instructions
- **v0.39**: `/memory inbox` for reviewing and patching skills extracted during sessions

## Key Design Decisions

1. **Frontmatter metadata**: Each skill has structured metadata describing when to activate
2. **Activation tool**: Model decides when to call `activate_skill` based on task analysis
3. **Skill inbox**: Extracted skills don't auto-install — human reviews first via `/memory inbox`
4. **Skill-creator**: Meta-skill enables agent to create new skills from observed patterns

## Ultimate-PI Current State

We have `.pi/skills/` directory with 16+ skills, but they load all at context start (no progressive disclosure). This follows the "delivery mechanism for context engineering" pattern but without the activation mechanism that prevents context rot.

## Integration Path (P-F2)

1. Add frontmatter to each skill: `activation_triggers`, `required_capabilities`, `token_budget`
2. Add `activate_skill` tool to tool registry
3. Implement skill registry that loads skills on-demand
4. Add `/memory inbox` for reviewing AI-extracted patterns before they become permanent skills
5. Implement skill-creator meta-skill for autonomous skill generation from observed failures

## Relationship to Other Harness Primitives

- **Context Compression**: Skills reduce the _need_ for compression by keeping context lean
- **Subagents**: Skills can be loaded into subagents independently, each with relevant context
- **Policy Engine**: Skill activation can be gated by policy (e.g., "never activate browser skill on production")
- **Memory Systems**: Skills extracted from sessions feed into persistent memory (wiki in our case)
