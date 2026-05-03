---
type: source
source_type: blog
title: "OpenAI Harness Engineering — 0 Lines of Human Code"
author: "Ryan Lopopolo, OpenAI Engineering"
date_published: 2026-02-11
url: "https://openai.com/index/harness-engineering/"
confidence: high
key_claims:
  - "Built a product with 0 lines of manually-written code over 5 months"
  - "~1M lines of code, ~1,500 PRs, 3-7 engineers steering Codex agents"
  - "Average throughput: 3.5 PRs per engineer per day, increasing as team scaled"
  - "Context is a scarce resource — use AGENTS.md as table of contents, not encyclopedia"
  - "Enforce architecture mechanically via custom linters, not via prompts"
  - "Codex can run single tasks for 6+ hours autonomously"
  - "Dedicated doc-gardening agents scan for stale documentation"
  - "Prefer 'boring' technology — easier for agents to model"
tags:
  - openai
  - codex
  - harness-engineering
  - context-engineering
  - agentic-coding
created: 2026-05-03
updated: 2026-05-03
status: ingested

---# OpenAI Harness Engineering — 0 Lines of Human Code

OpenAI Engineering, February 2026. Ryan Lopopolo on building a product with Codex where humans never directly contributed any code.

## Core Philosophy

**"Humans steer. Agents execute."** The team's primary job became designing environments, specifying intent, and building feedback loops that allow Codex agents to do reliable work.

## Key Architectural Decisions

### 1. Progressive Disclosure (Maps, Not Encyclopedias)

The "one big AGENTS.md" approach failed:
- Context scarcity: giant file crowds out the task
- Too much guidance becomes non-guidance
- Rots instantly — agents can't tell what's stale
- Hard to verify mechanically

Solution: **AGENTS.md as table of contents** (~100 lines), pointing to structured `docs/` directory:
```
docs/
├── design-docs/     (index, core beliefs)
├── exec-plans/      (active, completed, tech-debt)
├── product-specs/   (index, feature specs)
├── references/      (design system, tool docs)
├── DESIGN.md, FRONTEND.md, PLANS.md, QUALITY_SCORE.md
```

### 2. Mechanical Architecture Enforcement

Layered domain architecture with strictly validated dependency directions:
```
Types → Config → Repo → Service → Runtime → UI
```
- Cross-cutting concerns enter only through explicit Providers interface
- Enforced via custom linters and structural tests
- Error messages injected as remediation instructions into agent context
- "With agents, constraints become multipliers: once encoded, they apply everywhere at once"

### 3. Agent Legibility as System of Record

"From the agent's point of view, anything it can't access in-context while running effectively doesn't exist." Knowledge from Slack, Google Docs, or people's heads is invisible. All knowledge must be encoded into the repository as markdown.

### 4. Environment Control

Codex drives apps via Chrome DevTools Protocol: snapshots DOM, navigates, validates UI behavior. Ephemeral observability stack per worktree: logs (LogQL), metrics (PromQL), traces. Single Codex runs work on one task for 6+ hours.

### 5. Garbage Collection for AI Slop

Initial approach: humans spent Fridays (20% of week) cleaning "AI slop." Didn't scale. Solution: encode "golden principles" mechanically, run recurring background Codex tasks scanning for deviations, open targeted refactoring PRs. "Technical debt is like a high-interest loan — pay it down continuously in small increments."

### 6. Minimal Blocking Merge Gates

PRs are short-lived. Test flakes addressed with follow-up runs. "Corrections are cheap, waiting is expensive." In high-throughput agent systems, this is often the right tradeoff.

## Full Autonomy Achieved

Codex can now end-to-end drive a new feature from one prompt:
1. Validate codebase state
2. Reproduce reported bug
3. Record video demonstrating failure
4. Implement fix
5. Validate fix by driving application
6. Record video demonstrating resolution
7. Open PR
8. Respond to agent and human feedback
9. Detect and remediate build failures
10. Escalate to human only when judgment required
11. Merge the change

## Open Questions (from OpenAI)
- How does architectural coherence evolve over years in a fully agent-generated system?
- Where does human judgment add the most leverage?
- How does the system evolve as models improve?
