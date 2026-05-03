---
type: source
source_type: newsletter
title: "SwirlAI — Agent Skills Progressive Disclosure"
author: "Aurimas Griciūnas"
date_published: 2026-03-11
url: "https://www.newsletter.swirlai.com/p/agent-skills-progressive-disclosure"
confidence: high
key_claims:
  - "Agent Skills use three-tier progressive disclosure: Discovery (~80 tokens/skill), Activation (~2,000 tokens median), Execution (unlimited supporting files)"
  - "Anthropic released Agent Skills open standard Dec 18, 2025. Within weeks, OpenAI, Google, GitHub, Cursor adopted it."
  - "Skills marketplaces like SkillsMP index over 400,000 skills across platforms."
  - "Progressive disclosure is a SYSTEM DESIGN PATTERN, not just a coding agent feature."
  - "Context windows are finite and lossy — models miss information in the middle of long contexts ('lost in the middle')"
  - "Best practice: fewer than 20 tools available to an agent, accuracy degrades past 10"
  - "Skill description quality directly determines routing accuracy — Claude selects skills through pure LLM reasoning"
tags: [source, skills, progressive-disclosure, agent-architecture]
related:
  - "[[agent-skills-pattern]]"
  - "[[progressive-disclosure-agents]]"
  - "[[skill-first-architecture]]"
---

# SwirlAI — Agent Skills: Progressive Disclosure as a System Design Pattern

## Summary

Comprehensive analysis by Aurimas Griciūnas (SwirlAI Newsletter, 35K+ subscribers) on why Agent Skills became an industry standard within weeks. Published March 11, 2026 — three months after Anthropic's open standard release.

## Key Contributions

### Three-Tier Progressive Disclosure Architecture

The `SKILL.md` file organizes information into three layers. The platform implements the loading logic.

**Layer 1: Discovery** (~80 tokens/skill median). At startup, the platform reads only `name` and `description` from YAML frontmatter. All 17 of Anthropic's official skills together cost ~1,700 tokens at discovery — an agent can be aware of dozens of skills for less context than a single activated skill.

**Layer 2: Activation** (~2,000 tokens median). When the platform determines a skill is relevant, it loads the full `SKILL.md` markdown body. Body sizes range from ~275 tokens (internal-comms) to ~8,000 tokens (skill-creator).

**Layer 3: Execution** (unlimited). Supporting files (scripts, reference docs, templates, configs) loaded on demand. Scripts execute without their code entering context — only output consumes tokens.

### Industry Adoption Speed

- **Dec 18, 2025**: Anthropic releases open standard
- **Within weeks**: OpenAI (Codex CLI, ChatGPT), Google (Gemini CLI), GitHub Copilot, Cursor all adopt
- **By Mar 2026**: SkillsMP indexes 400,000+ skills

> "Every one of these platforms faces the same two problems: how to give agents broad knowledge without destroying context quality, and how to let users configure agent behavior without requiring engineering expertise. The skills format solves both."

### Non-Coding Applications

OpenClaw (175K GitHub stars in <2 weeks) demonstrates the pattern works beyond coding agents: calendar management, email drafting, smart home control, meal planning, cross-platform coordination. Community registry ClawHub hosts 13,000+ skills, most non-technical.

### Context Engineering

> "Best practice recommends fewer than 20 tools available to an agent at once, with accuracy degrading past 10. The same principle applies to instructions."

Context windows are finite and lossy. The "lost in the middle" phenomenon: models reliably miss information placed in the middle of long contexts.

## What We Adopt

- Three-tier progressive disclosure as the architectural model for harness skills
- Skills as the atomic unit of harness behavior (not code modules)
- Description quality as the routing mechanism (not keyword matching)
- The insight that markdown skills make agent behavior configurable by non-engineers

## What We Note

- The ecosystem moved fast because the problem (context bloat + configuration accessibility) is universal
- Skills compose with hooks — skills can define deterministic behavior in frontmatter
- Marketplaces are forming — our harness skills could be published to SkillsMP
