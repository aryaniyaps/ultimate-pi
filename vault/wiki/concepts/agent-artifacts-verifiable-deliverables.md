---
type: concept
title: "Agent Artifacts (Trust via Verifiable Deliverables)"
status: developing
created: 2026-05-01
updated: 2026-05-01
tags:
  - antigravity
  - verification
  - trust
  - harness-design
aliases: ["Artifact system", "verifiable artifacts"]
related:
  - "[[adversarial-verification]]"
  - "[[automated-observability]]"
  - "[[harness-implementation-plan]]"
  - "[[antigravity-agent-first-architecture]]"
sources:
  - "[[google-antigravity-official-blog]]"
  - "[[cursor-vs-antigravity-2026]]"

---# Agent Artifacts: Trust via Verifiable Deliverables

Google Antigravity's Artifact system replaces raw tool-call logs with human-readable, verifiable deliverables that agents generate as they work.

## What Are Artifacts?

Structured, verifiable outputs agents produce during execution:
- Task lists and implementation plans
- Screenshots and browser recordings
- Walkthrough documents
- Test result summaries
- Architecture diagrams

Artifacts represent work at a **task level**, not an API-call level. They are designed to be audited by humans, not parsed by machines.

## How Artifacts Build Trust

```
Raw tool logs: "execute_command: npm install" → "exit 0" → "write_file: src/auth.ts" → ...
Artifact: "Authentication migration plan" → "Screenshot: login page working" → "Test results: 23/23 pass"
```

The second format is reviewable in seconds. The first requires scrolling through hundreds of lines.

## Feedback on Artifacts

- Developers comment on artifacts (Google Docs-style commenting)
- Agents incorporate feedback **without stopping execution**
- Feedback is asynchronous: you comment, the agent picks it up at the next checkpoint
- No need to restart tasks for mid-course corrections

## Comparison with Our Harness

| Dimension | Our Harness (L4 + L5) | Antigravity Artifacts |
|-----------|----------------------|----------------------|
| Verification type | Adversarial critic agents | Human-reviewable deliverables |
| Feedback loop | Multi-round debate (selective) | Async comments on artifacts |
| Trust mechanism | Critic proves work wrong | Agent proves work right |
| Cost | LLM tokens (critic rounds) | Human attention (review artifacts) |

## Gap Analysis

Our L4 adversarial verification asks: "Is this correct?" (critic finds flaws).
Antigravity's Artifacts ask: "Here's proof this is correct" (agent demonstrates success).

These are **complementary**. The critic catches what the agent missed. The artifact proves what the agent got right. Both should exist in the harness.

## Proposed Integration: Phase P31

Add an **Artifact Generation Layer** after L4 verification. Agents generate screenshots, browser recordings, and test result summaries as verifiable proof of work. These artifacts feed into L5 observability and serve as the human-reviewable interface.
