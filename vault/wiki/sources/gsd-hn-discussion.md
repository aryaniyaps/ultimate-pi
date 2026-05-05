---
type: source
source_type: discussion-thread
title: "Hacker News: Get Shit Done — meta-prompting, context engineering and spec-driven dev system"
author: "HN Community (submitted by stefankuehnel)"
date_published: 2026-03-18
date_accessed: 2026-05-05
url: "https://news.ycombinator.com/item?id=47417804"
confidence: high
tags:
  - gsd
  - community-feedback
  - tool-comparison
  - token-usage
key_claims:
  - "473 points, 254 comments on HN — high engagement"
  - "Consensus: GSD is good for greenfield/small projects, degrades on large existing codebases"
  - "Multiple users report burning through Claude Max weekly limits in 1-2 days"
  - "Plan mode (native Claude Code) often sufficient; GSD overkill for simple tasks"
  - "Spec-driven tools debated: natural language specs are ambiguous vs. executable tests are precise"
  - "Community comparison: GSD vs Superpowers — both overengineered; Superpowers better for brainstorming, GSD better for state tracking"
  - "Key insight from user DIVx0: GSD agents start leaving orphans in large codebases; verification stages use simple lexical tools, not AST-aware analysis"
  - "User paddy_m described ideal system: plan → adversarial review → test implementation → adversarial PR review, with web UI and git reset on failure"
  - "Several users built custom harnesses after finding GSD too slow or opaque"
  - "GSD-2 standalone version being built on pi.dev"
---

# GSD Hacker News Discussion (473 points, March 2026)

## Community Consensus

### Positive
- Works well for greenfield projects and solo developers
- State tracking across sessions is genuinely useful
- Helps non-technical users build functional apps
- The discuss → plan → execute → verify pipeline produces better results than raw prompting

### Negative
- **Token burner:** Multiple users hit Claude Max weekly limits within 1-2 days
- **Too slow:** "hours instead of minutes" compared to native plan mode
- **Degrades on large codebases:** Agents leave orphaned code; verification uses lexical tools, not AST-aware analysis
- **Over-engineered:** Many users stripped it back to 30% or built their own simpler versions
- **Black box:** Hard to understand what's happening inside the pipeline
- **Waterfall feel:** Difficult to adjust phases/plans mid-execution when bugs or requirement changes arise

### Key Comparisons
| Tool | Strength | Weakness |
|------|----------|----------|
| GSD | State tracking, session memory | Token-heavy, slow |
| Superpowers | Brainstorming, exploration | Overzealous, writes code into plans |
| BMAD | Deep elicitation, adversarial review | Steep learning curve, heavy artifacts |
| OpenSpec | Delta specs, parallel work | Opinionated directory structure |
| Native Plan Mode | Fast, simple | No cross-session memory |

### Notable Quotes
- "These frameworks are great for fire-and-forget tasks, especially when there is some research involved but they burn 10x more tokens"
- "The spec-driven approach is underrated. Treating the spec as a living artifact the AI can reference across sessions"
- "I prefer move fast and start over if anything goes off track"
- "Spec-Driven Development is a curious term — it suggests it is in the tradition of TDD but goes in the opposite direction"
