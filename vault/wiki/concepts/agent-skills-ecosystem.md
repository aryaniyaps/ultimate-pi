---
type: concept
status: developing
created: 2026-05-05
tags:
  - agent-skills
  - ecosystem
  - open-standard
  - progressive-disclosure
related:
  - "[[superpowers-methodology]]"
  - "[[agent-skills-pattern]]"
  - "[[skill-first-architecture]]"
  - "[[policy-engine-pattern]]"
---

# Agent Skills Ecosystem

## Definition

The Agent Skills ecosystem is the open-standard marketplace and format for packaging reusable AI agent expertise as SKILL.md files. Originally developed by Anthropic, released as an open standard in October 2025, and adopted by all major agent platforms within weeks. As of May 2026: 490K+ skills across multiple marketplaces.

## The SKILL.md Open Standard

Every skill is a directory containing a `SKILL.md` file with:
- **YAML frontmatter**: `name` (lowercase-hyphenated, ≤64 chars), `description` (≤1024 chars — the trigger), optional `allowed-tools`, `metadata`, `license`
- **Markdown instructions**: What the agent should do when the skill activates

Progressive disclosure architecture:
1. **Discovery** (always loaded): Name + description only (~100 tokens per skill)
2. **Activation** (on-demand): Full SKILL.md body loaded when task matches description
3. **Execution** (on-demand): Scripts, reference files, templates loaded as needed

## Marketplaces

| Marketplace | Skills | Key Differentiator |
|-------------|--------|-------------------|
| **Skills.sh** (Vercel) | 83K+ | Curated quality, CLI-native install, Snyk security scanning, leaderboard |
| **SkillsMP** | 400K+ | Volume leader, GitHub crawl, AI-powered semantic search |
| **ClawHub** (OpenClaw) | ~10K+ | Open platform, hit by ClawHavoc malware campaign |

## Installation

Universal: `npx skills add owner/repo`

Per-agent paths:
- Claude Code: `.claude/skills/` (project) or `~/.claude/skills/` (personal)
- Codex CLI: `.agents/skills/` or `.codex/skills/`
- Cursor: `.cursor/skills/`
- Gemini CLI: `.gemini/skills/`
- GitHub Copilot: `.github/skills/`
- Windsurf: `.windsurf/skills/`

## Two Skill Types

1. **Capability Uplift** — Gives agent abilities it doesn't have. Before the skill, agent can't do the task. Examples: Firecrawl (web scraping), Document Skills (PDF/DOCX creation), Webapp Testing (Playwright).

2. **Encoded Preference** — Agent already knows how, but the skill encodes your team's specific way. Examples: Code review checklists, commit message formats, API conventions.

## Security Risks

Snyk's ToxicSkills study (Feb 2026) scanned 3,984 skills:
- 36.8% had at least one security flaw
- 13.4% contained critical-level issues
- 76 skills were confirmed malicious payloads
- 91% of malicious skills combined prompt injection with traditional malware

The ClawHavoc campaign (Jan-Feb 2026): 341 malicious skills on ClawHub distributing Atomic macOS Stealer.

## Ecosystem Trajectory
Zero to 490K skills in six months (Oct 2025 – Mar 2026). All major platforms adopted within weeks. The format's simplicity (anyone who can write Markdown can create a skill) drove adoption. Network effects accelerating: more skills → more agent users → more skill authors.

## Relevance to Harness
Our `.pi/skills/` system uses the same progressive disclosure pattern. The Agent Skills ecosystem validates that markdown-based skills are the right primitive — and that cross-agent portability is the winning strategy. We should consider SKILL.md compatibility for maximum reuse of the 490K+ ecosystem.
