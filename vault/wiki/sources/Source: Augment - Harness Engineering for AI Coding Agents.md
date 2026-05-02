---
type: source
status: ingested
source_type: engineering-blog
author: Molisha Shah (Augment Code)
date_published: 2026-04-16
date_accessed: 2026-05-01
url: https://www.augmentcode.com/guides/harness-engineering-ai-coding-agents
confidence: medium
key_claims:
  - Harness engineering shifts engineers from writing code to designing systems that govern how agents write code
  - Three harness layers: Constraints (feedforward), Feedback Loops (corrective), Quality Gates (enforcement)
  - PEV Loop (Plan-Execute-Verify) as structured harness pattern with gates at every phase transition
  - Rules files are one layer of harness, not complete solution — must combine with deterministic enforcement
  - Key metrics: Task Resolution Rate, Code Churn Rate, Verification Tax, Defect Escape Rate
  - DORA report: higher AI adoption correlates with increased throughput AND instability
created: 2026-05-02
updated: 2026-05-02
tags: [source]
---
# Augment: Harness Engineering for AI Coding Agents

## What It Is

Practical guide to harness engineering from Augment Code, published April 16, 2026. Focuses on constraint design, PEV loops, and measurement.

## Origin of "Harness Engineering"

| Term | Attribution | Date |
|------|-------------|------|
| Harness engineering | Mitchell Hashimoto (per secondary reports) | Early Feb 2026 |
| Formal definition | OpenAI / Ryan Lopopolo | Feb 11, 2026 |
| Agent = Model + Harness | LangChain | Feb-Mar 2026 |
| Context engineering | Andrej Karpathy | Dec 19, 2025 |
| Agentic engineering | Andrej Karpathy | Feb 2026 |

## Three Harness Layers

1. **Constraint Harnesses (Feedforward)**: Reduce solution space before generation. Rules files, architectural lint configs, type systems. OpenAI enforces "taste invariants" as hard CI failures.

2. **Feedback Loops (Corrective)**: Structured error signals back to agent. Critical detail: lint message *becomes* a prompt. "Use `logger.info({event: 'name'})` instead of `console.log`" vs "violation detected." Disable inline-disable rules to prevent agents suppressing violations.

3. **Quality Gates (Enforcement)**: Prevent non-compliant code from merging. Standard CI insufficient — agents introduce problems conventional checks miss.

## PEV Loop (Plan-Execute-Verify)

Architectural pattern with gates at every transition:
- **Pre-execution gates**: Is this a known tool? Valid arguments? Requires user approval? Inside workspace?
- **Plan alignment gate**: Did agent use existing auth middleware or create new one? Architectural questions invisible to test runners.
- **Verification timing**: Pre-execution + runtime + post-execution + plan alignment

## Measurement

Key metrics: Task Resolution Rate, Code Churn Rate, Verification Tax (time-to-approval minus time-to-first-commit), Harness Constraint Effect (success rate constrained vs unconstrained), Defect Escape Rate.

## Relevance to Ultimate-PI

PEV Loop maps directly to our L2 (Plan) → L3 (Execute/Ground) → L4 (Verify). Our L2.5 Drift Monitor + Phase 16 Lint Gate are quality gates. Gap: we lack pre-execution gates (known tool check, argument validation) — this is P-F1 in integration plan. The "lint message as prompt" concept validates our approach to making drift detection messages actionable rather than just flagging.
