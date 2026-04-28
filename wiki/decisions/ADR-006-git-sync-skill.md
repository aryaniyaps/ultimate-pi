# ADR-006: git-sync skill

**Date:** 2026-04-28  
**Status:** Accepted

## Context

Need a repeatable skill to commit and push changes with:
- AI-generated conventional commit messages based on diff analysis
- pi-mono as co-author (name/email from `.pi/auto-commit.json`)
- Protected branch detection (no direct commits to main/master/release)

## Alternatives

1. **Manual git commands** — error-prone, forgets co-author
2. **Husky/lint-staged hook** — auto-commits on save, but no AI message generation
3. **Dedicated skill** — reproducible, reads config, AI messages, guard rails ✓

## Decision

Create `git-sync` skill under `.pi/skills/git-sync/` with:
- SKILL.md defining full workflow (8 steps)
- Helper shell script `git-sync-config.sh` to extract co-author from `auto-commit.json`
- Co-author line format: `Co-authored-by: pi-mono <261679550+pi-mono@users.noreply.github.com>`

## Consequences

- Every git-sync commit includes pi-mono co-author
- Protected branches force feature branch creation
- AI agent must analyze diff to generate message (no templates/placeholders)
- Skill is self-contained, config-driven via `auto-commit.json`