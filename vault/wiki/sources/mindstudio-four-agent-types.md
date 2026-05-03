---
type: source
source_type: article
author: MindStudio
date_published: 2026-04
url: https://www.mindstudio.ai/blog/four-types-of-ai-agents-explained/
confidence: medium
tags:
  - agent-types
  - multi-agent
  - orchestration
  - architecture
key_claims:
  - "Four distinct agent types with different architectures: Coding Harnesses, Dark Factories, Auto Research, Orchestration"
  - "Mismatching agent type to task is a primary cause of AI system failure in production"
  - "Architecture matters more than model choice for multi-agent systems"
  - "Orchestration agents add overhead — start simple, add complexity only when needed"
---

# Four Types of AI Agents Explained

MindStudio blog — 2026. Classifies production AI agents into four architecturally distinct types.

## The Four Types

### 1. Coding Harnesses
Operate within bounded technical environments (codebases). Tight feedback loop with deterministic execution environment — write code, run tests, see results, revise. Tools: file system access, terminal execution, test runners, code search, version control. Examples: Claude Code, GitHub Copilot Workspace, Devin.

**Use when**: Task involves writing/editing/debugging code with testable success conditions.

**Avoid when**: Task requires cross-domain reasoning or multi-agent coordination.

### 2. Dark Factories
Fully automated, humanless pipelines processing work at scale. Ingest inputs → process through defined steps → produce outputs. Run unattended on schedules or events.

**Use when**: High volume, structurally similar inputs, scheduled/event-driven processing.

**Avoid when**: Tasks require dynamic judgment or high-variance inputs.

### 3. Auto Research Agents
Autonomous information gathering: decompose questions, search multiple sources, evaluate relevance, synthesize findings. Dynamic retrieval path — decides what to retrieve based on findings.

**Use when**: Answer requires multiple sources, retrieval path uncertain upfront, synthesis needed.

**Avoid when**: Information available in structured database, simple RAG would suffice.

### 4. Orchestration Agents
Coordinate other agents: decompose complex goals, assign subtasks to specialists, handle dependencies, assemble final output. Acts as project manager, not implementer.

**Use when**: Task requires multiple distinct capabilities or parallel workstreams.

**Avoid when**: Single agent can handle the task — orchestration adds overhead (more LLM calls, more latency, more failure points).

## Production Pattern: Combined Types

Real systems combine types under an orchestrator. Example competitive intelligence system:
1. Orchestrator receives brief
2. Dispatches auto research agent for web gathering
3. Dispatches dark factory for high-volume review processing
4. Dispatches coding harness for structured data analysis
5. Orchestrator synthesizes all outputs

## Relevance to Our Harness

- Our `wiki-autoresearch` skill is an auto research agent
- Our `Agent` tool (subagent spawning) maps to orchestration
- Our core coding loop is a coding harness
- The key insight: match architecture to task, don't over-architect
