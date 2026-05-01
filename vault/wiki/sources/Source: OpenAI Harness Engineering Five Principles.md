---
type: source
source_type: engineering-blog
author: Tony Lee
date_published: 2026-02-12
date_accessed: 2026-05-01
url: https://tonylee.im/en/blog/openai-harness-engineering-five-principles-codex/
confidence: high
key_claims:
  - OpenAI Codex team built 1M-line product using only agents, zero human-written code
  - Took 1/10th the time vs manual (internal estimate, uncontrolled conditions)
  - Five principles: visibility, capability-gap thinking, mechanical enforcement, agent eyes, map-not-manual
  - Custom concurrency helpers instead of external libraries (API stability favors agents)
  - Custom linters + structural tests enforce layered architecture; linters themselves written by Codex
  - Chrome DevTools Protocol gives agent DOM snapshots, screenshots, navigation
  - "A map, not a manual": ARCHITECTURE.md as bird's-eye view, not exhaustive documentation
---

# OpenAI Harness Engineering: Five Principles

## What It Is

Summary of OpenAI's internal harness engineering practices from their Codex team, which built a 1M-line product using only AI agents (zero human-written code). Based on OpenAI's official post (openai.com/index/harness-engineering, Feb 11, 2026) but that page is 403-walled — this summary from Tony Lee's analysis provides the five principles.

## The Five Principles

### 1. What the Agent Can't See Doesn't Exist

All decisions pushed into repository as markdown, schemas, and ExecPlans (PLANS.md). ExecPlan = self-contained design doc written so a beginner could implement end-to-end. Codex worked continuously for 7+ hours on single prompts — only possible with complete, stable context.

### 2. Ask What Capability Is Missing, Not Why the Agent Is Failing

When velocity was slow, team asked "what capability is missing?" instead of "why is the agent failing?" Reframed work from prompting harder to instrumenting environment better. Built custom concurrency helpers rather than external libraries — API stability + training data representation favor "boring technology."

### 3. Mechanical Enforcement Over Documentation

Enforced invariant rules mechanically (linters, structural tests) rather than prescribing implementation in text. Architecture locked into layered domain structure: Providers → Service → Runtime → UI. Dependency directions verified by linters. Custom linters written by Codex itself.

### 4. Give the Agent Eyes

Connected Chrome DevTools Protocol to agent runtime. Pre/post-task snapshot comparison + runtime event observation = agent fixes in loop until clean. Single Codex runs sustained 6+ hours on one task. Temporary observability stack per git worktree: Victoria Logs + Victoria Metrics. Prompts like "make the service start in under 800ms" become executable.

### 5. A Map, Not a Manual

ARCHITECTURE.md as bird's-eye view of project structure, including only what rarely changes. Architectural invariants expressed as "something does not exist here" — counterintuitive but effective. Stating boundaries explicitly constrains all downstream implementation.

## Unresolved Questions

- Can agent-built system maintain architectural consistency over years? Unknown.
- How must harness change as models improve? Unknown.
- 1M-line number represents single internal project under controlled conditions. Extrapolation requires caution.

## Relevance to Ultimate-PI

Principle 1 maps to L3 Grounding (everything in repo). Principle 2 maps to our tool-first approach (ck, Gitingest, pi-lean-ctx). Principle 3 maps to L2.5 Drift Monitor + Phase 16 Lint Gate — but we need *mechanical* enforcement (linters), not just drift detection. Principle 4 maps to L5 Observability but we lack browser/visual verification. Principle 5 maps to our wiki/overview.md + index.md but we could formalize ARCHITECTURE.md pattern.
