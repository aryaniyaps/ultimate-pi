---
type: concept
title: "Multi-Agent AI Coding Architecture"
created: 2026-05-03
updated: 2026-05-03
status: developing
tags:
  - multi-agent
  - architecture
  - agentic-coding
  - harness
related:
  - "[[subagent-orchestration]]"
  - "[[generator-evaluator-architecture]]"
  - "[[agentic-harness]]"
  - "[[Source: Lovable Architecture & Clone Analysis]]"
  - "[[anthropic2026-harness-design]]"
sources:
  - "[[Source: Lovable Architecture & Clone Analysis]]"
  - "[[anthropic2026-harness-design]]"
  - "[[Source: OpenAI Harness Engineering — 0 Lines of Human Code]]"
  - "[[Source: OpenDev — Building AI Coding Agents for the Terminal]]"

---# Multi-Agent AI Coding Architecture

The decomposition of software engineering tasks across specialized agents, each with a defined role, input/output contract, and tool surface. This is the **universal pattern** across all successful AI coding platforms.

## Three Common Decompositions

### Lovable/Clone Pattern: Planner → Architect → Coder
```
User prompt → Planner (structured Plan) → Architect (TaskPlan) → Coder (files on disk)
```
- Each agent receives Pydantic-validated inputs
- LangGraph orchestrates with conditional edges
- Coder uses ReAct pattern with file system tools

### Anthropic Pattern: Planner → Generator → Evaluator
```
User prompt → Planner (product spec) → Generator (implements) ⇄ Evaluator (grades)
```
- Generator and Evaluator negotiate "sprint contracts" before coding
- Evaluator uses Playwright to actually click through the app
- Hard thresholds on grading criteria — fall below any, sprint fails

### OpenAI Pattern: Agent-to-Agent Review Loops
```
Codex generates → Codex reviews locally → Additional agent review (cloud) → Human/agent feedback → Iterate
```
- "Ralph Wiggum Loop": agent reviews its own changes, requests additional reviews, responds to feedback, iterates until all agent reviewers satisfied
- Humans may review PRs but aren't required to
- Pushed "almost all review effort towards being handled agent-to-agent"

## First-Principles Architecture

### 1. Separate Planning from Execution
Do not let the same agent plan and code in one step. The Planner should have read-only tools only — structurally prevented from writing code. This forces deliberation before action and prevents premature implementation.

### 2. Structured Handoffs Between Agents
Every handoff must be a validated data contract, not free text. Pydantic schemas, typed dicts, or structured files. The downstream agent processes objects, not unstructured descriptions.

### 3. Independent Evaluator with Hard Criteria
The agent that builds cannot be trusted to evaluate. Separate evaluator with explicit, gradable criteria. Each criterion has a hard threshold — not negotiable. "Claude is a poor QA agent out of the box" — evaluator requires explicit tuning to be skeptical.

### 4. Sprint Contracts (Agree on "Done" Before Work)
Before coding starts, the implementer and evaluator negotiate what success looks like. This prevents scope creep and provides concrete verification targets. Communication via files, not chat.

### 5. Tool Surface = Agent Capability Boundary
Each agent's available tools define its actual capability — not its prompt, not its role description. Remove write tools from planners. Remove subagent-spawning from subagents. Make capabilities structural, not aspirational.

## Relevance to Our Harness
- L2 (Planning) should be a separate agent with read-only tools
- L3 (Execution) should work from L2's structured output
- L4 (Verification) needs hard criteria with thresholds, not narrative feedback
- Sprint contracts between L2 and L4 before L3 begins
