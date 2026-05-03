---
type: source
source_type: official-docs
title: "Claude API — Agent Skills Overview"
author: "Anthropic"
date_published: 2026
url: "https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview"
confidence: high
key_claims:
  - "Skills are reusable, filesystem-based resources that provide Claude with domain-specific expertise"
  - "Three levels of loading: Metadata (always, ~100 tokens), Instructions (when triggered, <5k tokens), Resources (as needed, effectively unlimited)"
  - "No practical limit on bundled content — files don't consume context until accessed"
  - "Skills run in a code execution environment where Claude has filesystem access, bash commands, and code execution"
  - "Script execution: code never enters context — only output consumes tokens"
  - "Custom Skills: create as directories with SKILL.md files"
tags: [source, skills, claude, anthropic, progressive-disclosure]
related:
  - "[[agent-skills-pattern]]"
  - "[[progressive-disclosure-agents]]"
  - "[[skill-first-architecture]]"
---

# Claude API — Agent Skills Overview

## Summary

Official Anthropic documentation for the Agent Skills system. Covers architecture, loading model, security considerations, and cross-surface availability (Claude API, Claude Code, claude.ai).

## Key Contributions

### Filesystem-Based Architecture

Skills exist as directories on a virtual machine. Claude interacts with them using bash commands — reading SKILL.md, running scripts, accessing reference files. This filesystem-based architecture enables progressive disclosure: Claude loads information in stages.

### Three Content Types, Three Loading Levels

| Level | Content | When Loaded | Token Cost |
|-------|---------|-------------|------------|
| Level 1 | Metadata (YAML frontmatter: name + description) | Always (at startup) | ~100 tokens per skill |
| Level 2 | Instructions (SKILL.md body) | When skill is triggered | Under 5,000 tokens |
| Level 3+ | Resources (additional .md, scripts, templates) | As needed | Effectively unlimited |

### On-Demand File Access

Claude reads only files needed for each specific task. A skill can include dozens of reference files — if a task only needs the sales schema, Claude loads just that one file. The rest consume zero tokens.

### Efficient Script Execution

When Claude runs `validate_form.py`, the script's code never loads into context. Only the script's output consumes tokens. This makes scripts far more efficient than generating equivalent code on the fly.

### No Practical Limit on Bundled Content

Because files don't consume context until accessed, skills can include comprehensive API documentation, large datasets, extensive examples, or any reference materials. Zero context penalty for unused bundled content.

### Security Model

Skills should only come from trusted sources. A malicious skill can direct Claude to invoke tools or execute code in harmful ways. Recommendations: audit thoroughly, treat like installing software, be especially careful in production systems.

## What We Adopt

- Filesystem-based skill architecture as the model for harness skills
- Three-tier loading model for progressive disclosure
- Scripts-as-executables pattern (code never enters context)
- No practical limit on bundled reference material — enables comprehensive attack pattern catalogs, plan templates, etc.

## What We Note

- Cross-surface availability: Skills don't sync across Claude API, Claude Code, and claude.ai — each surface requires separate management
- Runtime constraints vary: Claude API has no network access and no runtime package installation; Claude Code has full network access
- Our harness skills are pi-specific but follow the open standard — portable to any platform that supports SKILL.md
