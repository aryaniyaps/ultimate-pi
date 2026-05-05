---
type: source
source_type: github-repo
author: Jesse Vincent (obra) / Prime Radiant
date_published: 2025-10-09
date_accessed: 2026-05-05
url: https://github.com/obra/superpowers
confidence: high
key_claims:
  - "Complete software development methodology for coding agents via composable SKILL.md skills"
  - "179K+ GitHub stars, 15.9K forks, 440 commits, v5.1.0 (May 2026)"
  - "Works across Claude Code, Codex CLI, Cursor, Gemini CLI, OpenCode, GitHub Copilot"
  - "Mandatory workflows enforced via hard gates, not suggestions"
  - "Subagent-driven development with fresh context per task and two-stage review"
  - "TDD Iron Law: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST"
---

# Superpowers — GitHub Repository

## Summary

Superpowers (`obra/superpowers`) is the most-adopted agentic skills framework for AI coding agents. Created by Jesse Vincent (creator of Request Tracker, former Perl 6 manager, K-9 Mail creator), it packages engineering discipline as composable SKILL.md files that agents load on-demand via progressive disclosure. As of May 2026: 179K stars, 440 commits, MIT license, v5.1.0 (latest release May 4, 2026).

## Architecture

Superpowers uses the SKILL.md open standard (Agent Skills specification). Each skill is a directory with a `SKILL.md` file containing YAML frontmatter (`name`, `description`) and markdown instructions. Skills trigger automatically based on description matching — the agent checks for relevant skills before any task.

The framework is platform-agnostic: skills are plain markdown files that work across Claude Code, Codex CLI, Cursor, Gemini CLI, OpenCode, GitHub Copilot CLI, and Factory Droid.

## Core Workflow

1. **brainstorming** — Activates before writing code. Socratic design refinement, explores alternatives, presents design in sections for approval. Saves design document.
2. **using-git-worktrees** — Activates after design approval. Creates isolated workspace on new branch, runs project setup, verifies clean test baseline.
3. **writing-plans** — Activates with approved design. Breaks work into 2-5 minute tasks with exact file paths, complete code, verification steps. Written for an implementer with "zero context and questionable taste."
4. **subagent-driven-development** or **executing-plans** — Dispatches fresh subagent per task with two-stage review (spec compliance, then code quality). Agents can work autonomously for hours without deviating.
5. **test-driven-development** — Enforces RED-GREEN-REFACTOR. Iron Law: "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST. Write code before the test? Delete it. Start over."
6. **requesting-code-review** — Activates between tasks. Reviews against plan, reports issues by severity. Critical issues block progress.
7. **finishing-a-development-branch** — Activates when tasks complete. Verifies tests, presents merge/PR options, cleans up worktree.

## Skills Library

**Testing**: test-driven-development (includes anti-patterns reference)
**Debugging**: systematic-debugging (4-phase root cause), verification-before-completion
**Collaboration**: brainstorming, writing-plans, executing-plans, dispatching-parallel-agents, requesting-code-review, receiving-code-review, using-git-worktrees, finishing-a-development-branch, subagent-driven-development
**Meta**: writing-skills, using-superpowers

## Philosophy

- Test-Driven Development — Write tests first, always
- Systematic over ad-hoc — Process over guessing
- Complexity reduction — Simplicity as primary goal
- Evidence over claims — Verify before declaring success

## Key Insight

AI agents respond to structure. You cannot lecture them about best practices and expect compliance. But you can give them explicit step-by-step workflows and hard gates blocking progress until conditions are met. Treat the agent like a powerful but undisciplined junior engineer — give it process guardrails that turn juniors into seniors.
