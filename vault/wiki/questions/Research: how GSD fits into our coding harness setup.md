---
type: synthesis
title: "Research: how GSD fits into our coding harness setup"
created: 2026-05-05
updated: 2026-05-05
tags:
  - research
  - gsd
  - harness
  - integration
status: developing
related:
  - "[[gsd-get-shit-done]]"
  - "[[harness-implementation-plan]]"
  - "[[skill-first-architecture]]"
  - "[[spec-hardening]]"
  - "[[structured-planning]]"
  - "[[grounding-checkpoints]]"
  - "[[adversarial-verification]]"
  - "[[persistent-memory]]"
  - "[[agent-skills-pattern]]"
  - "[[drift-detection-unified]]"
  - "[[generator-evaluator-architecture]]"
sources:
  - "[[gsd-github-repo]]"
  - "[[gsd-codecentric-deep-dive]]"
  - "[[gsd-hn-discussion]]"
  - "[[Source: How to Apply GAN Architecture to Multi-Agent Code Generation]]"
---

# Research: how GSD fits into our coding harness setup

## Overview
GSD is a downstream application-building pipeline (discuss → plan → execute → verify → ship) running inside Claude Code. Our harness is an upstream behavior-control pipeline (spec-hardening → planning → drift detection → grounding → adversarial verification → observability → memory → orchestration → query). They address fundamentally different layers of the agentic coding stack: GSD builds software, our harness controls how agents build software. They are **complementary**, not competitive.

## Key Findings

### 1. GSD is downstream; our harness is upstream (Source: [[gsd-github-repo]], [[gsd-codecentric-deep-dive]])
GSD operates at the application layer — it receives a user's idea and produces working software. Our harness operates at the agent-control layer — it governs how agents reason, verify, and maintain state during any coding task. GSD could potentially run **inside** a harness-controlled pi session, benefiting from spec-hardening, drift detection, and adversarial verification around its own pipeline execution.

### 2. GSD uses Claude Code as its runtime; we use pi (Source: [[gsd-codecentric-deep-dive]])
GSD's entire architecture is markdown files interpreted by Claude Code's skills/agents/hooks system. No proprietary runtime. Our harness runs on pi (the coding agent platform GSD-2 is being ported to). The skill-first architecture transformation (May 2026) means both systems now share the same atomic unit: markdown skills loaded on demand.

### 3. GSD lacks adversarial verification — our L4 fills that gap (Source: [[gsd-hn-discussion]], [[Source: How to Apply GAN Architecture to Multi-Agent Code Generation]])
The freeCodeCamp analysis notes: "GSD relies on mechanical verification: lint, test, type-check... There is no agent reading another agent's code to assess whether it matches the spec's intent." This is exactly the gap our L4 adversarial verification addresses. A user running GSD inside our harness would get GSD's plan-checking PLUS our adversarial evaluator cross-verifying the output.

### 4. GSD's context engineering complements our L3 grounding checkpoints (Source: [[gsd-github-repo]])
GSD's core innovation — fresh 200K-context subagents, file-based state, XML-structured plans — aligns with our L3 approach but operates at a higher abstraction. GSD prevents context rot for application-building; our L3 prevents context rot for any agentic task. The techniques are compatible: GSD's "wave execution" parallels our subagent worktree isolation pattern.

### 5. Both systems share skill-first architecture (Source: [[skill-first-architecture]], [[gsd-github-repo]])
Since May 2026, our harness uses markdown skills as atomic units (3 code files + 12 skill files). GSD has always been markdown-first (59 skills + 33 subagents). Both use progressive disclosure of skills on demand. GSD's namespace routing (6 meta-skills routing to 59 concrete commands, saving ~2K tokens/turn) is a pattern worth adopting.

### 6. GSD's state files are a narrower version of our L6 persistent memory (Source: [[gsd-github-repo]], [[persistent-memory]])
GSD's `.planning/` directory (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md) is project-specific planning memory. Our wiki is a universal knowledge base covering harness design, coding patterns, architecture decisions, and research syntheses — feeding into every harness layer, not just project planning.

### 7. GSD's limitations validate our harness approach (Source: [[gsd-hn-discussion]])
Community feedback reveals GSD's weakness at scale: "agents leave orphans in large codebases," "verification uses simple lexical tools," "difficult to pivot mid-phase." These are exactly the failure modes our L1 (spec hardening prevents ambiguity), L2.5 (drift detection catches orphans), L3 (grounding checkpoints enforce correctness), and L4 (adversarial verification catches missed requirements) are designed to prevent.

## Key Entities
- [[gsd-get-shit-done]]: 60K-star meta-prompting/spec-driven development system for Claude Code
- TÂCHES (@glittercowboy): GSD's creator, solo developer philosophy

## Key Concepts
- **Meta-prompting:** Using markdown files as structured prompts that orchestrate LLM behavior — both GSD and our skill-first harness use this
- **Spec-driven development:** Writing detailed requirements before implementation — overlaps with our L1 spec hardening
- **Context engineering:** Managing token budgets through fresh subagent contexts, file-based state, and XML structures — overlaps with our L3 grounding checkpoints
- **Wave execution:** Grouping tasks by dependency for parallel/sequential execution — parallels our subagent worktree isolation

## Contradictions
- HN user `divx0` says GSD agents produce orphans at scale; GSD's README claims quality gates prevent scope reduction. The README claim applies to greenfield projects; the HN observation applies to large existing codebases. Both can be true: GSD works well within its design envelope (small-medium greenfield) but degrades outside it.
- GSD's README calls itself "lightweight" while community calls it "overengineered." Resolution: lightweight compared to BMAD's 12 agents and enterprise workflows; heavy compared to native Claude Code plan mode.

## Integration Opportunities

### Immediate (adopt patterns)
1. **Namespace routing:** GSD's 6 meta-skills reducing 86→6 eager-listed commands saves ~2K tokens/turn. We should adopt this for our growing skill collection.
2. **Deterministic CLI helper:** GSD's `gsd-tools.cjs` pattern — "deterministic logic belongs in code, not prompts." Our pi extensions already follow this; formalize as a harness principle.
3. **Wave execution tracking:** GSD's dependency-aware parallel execution with SUMMARY.md per task. Adopt the tracking pattern for our subagent dispatches.

### Medium-term (layer GSD under harness)
4. **Run GSD inside a harness-controlled pi session:** The harness pre-processes user intent (L1-L3), then dispatches GSD to handle the application-building pipeline (discuss→plan→execute), with the harness monitoring for drift (L2.5) and running adversarial verification (L4) on GSD's output.
5. **Harness-as-GSD-plugin:** Package our drift detection and adversarial verification as skills that GSD's orchestrators can invoke during plan-check and verification phases.

### Long-term (architectural convergence)
6. **Unified skill marketplace:** Both systems use markdown skills. A shared skill format would let users mix GSD's application-building skills with our harness-control skills in one pipeline.

## Open Questions
- Can GSD's wave execution work with our worktree-isolated subagents, or do the isolation models conflict?
- Would running GSD inside our harness add unacceptable latency for the "fast iteration" use case GSD's quick-mode serves?
- GSD-2 (being built on pi.dev) may converge naturally with our harness. Should we wait for GSD-2 before attempting integration?
- The HN discussion reveals a persistent debate: natural language specs vs. executable tests. Which direction should our L1 spec-hardening favor?

## Sources
- [[gsd-github-repo]]: TÂCHES, Dec 2025–May 2026, 60.1K stars
- [[gsd-codecentric-deep-dive]]: Felix Abele, Mar 2026
- [[gsd-hn-discussion]]: HN Community, Mar 2026, 473 points
- [[Source: How to Apply GAN Architecture to Multi-Agent Code Generation]]: Christopher Galliart, freeCodeCamp, Mar 2026
