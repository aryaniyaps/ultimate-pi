---
type: concept
status: developing
created: 2026-05-02
updated: 2026-05-03
tags: [concept, context, harness]
related:
  - "[[Context Engine (AI Coding)]]"
  - "[[agentic-harness-context-enforcement]]"
  - "[[context-anxiety]]"
  - "[[Context-Aware System Reminders]]"
  - "[[progressive-disclosure-agents]]"
  - "[[structured-compaction]]"
sources:
  - "[[Source: OpenDev — Building AI Coding Agents for the Terminal]]"
  - "[[Source: OpenAI Harness Engineering — 0 Lines of Human Code]]"
  - "[[anthropic2026-harness-design]]"
---

# Context Engineering

The practice of designing and optimizing the context that an AI agent receives — what information, how structured, and when provided. Context quality > model intelligence (validated by Augment SWE-bench Pro results: same model, 6-point improvement with better context).

## First Principles

### Context Is a Budget, Not a Buffer
Every capability added to the system prompt, every tool result returned to the agent, competes for the same finite token budget. In practice, tool outputs (file contents, command results, search hits) consume **70-80% of context** in a typical session. Richer outputs improve per-turn accuracy but shorten session life. (Source: OpenDev)

### Progressive Disclosure
Give agents **maps, not encyclopedias**. OpenAI's finding: a giant AGENTS.md file crowds out the task, rots instantly, and can't be mechanically verified. Instead: short AGENTS.md (~100 lines) as table of contents pointing to a structured `docs/` directory. (Source: OpenAI Harness Engineering)

### Adaptive Compaction, Not Emergency Compaction
Graduated reduction stages (70%→99% thresholds) outperform binary emergency compaction. Cheaper strategies (masking, pruning) often reclaim enough space to avoid expensive LLM summarization. Mark tool outputs as "active → faded → archived" progressively. (Source: OpenDev)

### System Reminders at Decision Points
Instructions in the system prompt lose influence as conversations grow. After 30+ tool calls, agents silently stop following them. Inject short, targeted reminders at the exact point of decision using `role: user` messages. Cap frequency to prevent noise. (Source: OpenDev, [[Context-Aware System Reminders]])

### Calibrate from API-Reported Token Counts
Providers inject invisible content (safety preambles, tool schemas, internal formatting). Local token estimates systematically underestimate actual usage. Always treat the API's reported `prompt_tokens` as ground truth. (Source: OpenDev)

### Dual-Memory for Thinking Contexts
When providing context to a thinking/reasoning model: separate compressed long-range context (episodic summary) from detailed short-range context (recent messages verbatim). Regenerate episodic summary from full history periodically, not incrementally — iterative summarization accumulates drift. (Source: OpenDev)

### Offload Large Outputs to Filesystem
When a tool produces output exceeding a threshold, write full content to scratch file, return short preview + file reference. Transforms a context-consumption problem into a retrieval problem — retrieval costs one tool call, context consumption is paid on every subsequent LLM call. (Source: OpenDev)

### Context Resets vs Compaction
Anthropic found that some models exhibit "context anxiety" — wrapping up prematurely when approaching context limit. Compaction alone insufficient for Sonnet 4.5. Context resets (clear window, new agent with structured handoff) required. Opus 4.6 largely eliminated this — model capability determines which strategy works. (Source: Anthropic Harness Design)

## Relevance to Our Harness
- Our AGENTS.md may be too monolithic — consider restructuring as index + progressive disclosure
- We lack graduated compaction — current approach is binary emergency
- We lack system reminders — instructions fade over long sessions
- We lack dual-memory for planning phases
- Token calibration should use API-reported counts, not local estimates
