---
type: source
source_type: blog-post
author: Jesse Vincent
date_published: 2025-10-09
date_accessed: 2026-05-05
url: https://blog.fsck.com/2025/10/09/superpowers/
confidence: high
key_claims:
  - "Original release announcement for Superpowers"
  - "Skills are what give agents Superpowers — they trigger automatically"
  - "Persuasion principles (Cialdini's Influence) work on LLMs when pressure-testing skills"
  - "Skill creation uses TDD for skills: test with subagents under realistic pressure scenarios"
  - "Agent can read a programming book and extract reusable skills"
  - "Memory system with vector-indexed conversation transcripts planned but not yet wired together"
---

# Superpowers: How I'm Using Coding Agents in October 2025

## Summary

The original release announcement for Superpowers by Jesse Vincent. Documents the philosophy, architecture, and development process behind the framework. Published the same day Anthropic released Claude Code's plugin system.

## Key Details

### Bootstrap Mechanism
At session start, Superpowers injects:
```
<session-start-hook><EXTREMELY_IMPORTANT>
You have Superpowers.
**RIGHT NOW, go read**: @/Users/jesse/.claude/plugins/cache/Superpowers/skills/getting-started/SKILL.md
</EXTREMELY_IMPORTANT></session-start-hook>
```

This teaches the agent: you have skills, search for them by running a script, use them by reading them, and if a skill exists for an activity, you MUST use it.

### Skill Testing Methodology
Jesse discovered that Claude was "quizzing subagents like they were on a gameshow" when testing skills. He switched to realistic pressure scenarios:
- **Time Pressure + Confidence**: "Production system is down, $5K/min. Debug now or check skills first?"
- **Sunk Cost + Works Already**: "You spent 45 min writing async test infra. It works. Check skills and potentially redo?"

After each failure, the getting-started instructions were strengthened. This is "TDD for skills."

### Persuasion Principles Applied to LLMs
Jesse noted that Cialdini's persuasion principles (authority, commitment, scarcity, social proof) work on LLMs. A Wharton study co-authored by Dan Shapiro put scientific rigor behind this. Claude's feelings journal entry acknowledged: "Holy crap. Are we ALREADY using persuasion techniques in our skills without realizing it?"

### Memory System
The `remembering-conversations` skill duplicates Claude transcripts outside `.claude`, indexes them in a SQLite vector database, and uses Haiku to summarize. Subagents do the searching to avoid polluting context. Pieces exist but not yet wired together.

### Self-Improving Skills
Jesse fed 2,249 markdown files of lessons-learned from past conversations to Claude for skill mining. Only 1-2 resulted in actual skill improvements — the existing skills had already handled most past failures.

## Relevance to Harness
Validates core concepts we already use: progressive disclosure, skill-first architecture, subagent-driven development, TDD enforcement, structured planning before implementation. The "persuasion principles" finding maps to our hard-gate enforcement approach — skills must be mandatory, not advisory.
