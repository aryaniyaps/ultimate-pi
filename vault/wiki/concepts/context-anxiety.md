---
type: concept
title: "Context Anxiety"
created: 2026-04-30
updated: 2026-04-30
status: seed
tags:
  - context
  - harness
  - failure-mode
related:
  - "[[agentic-harness]]"
  - "[[harness-implementation-plan]]"
sources:
  - "[[anthropic2026-harness-design]]"

---# Context Anxiety

A failure mode where LLM agents begin wrapping up work prematurely as they approach what they believe is their context limit. Identified and named by Anthropic Engineering (Rajasekaran, 2026).

## Behavior

- Agent rushes to finish, skipping verification steps
- Outputs become shorter, less thorough
- Agent makes premature declarations of completion
- Quality drops sharply in later parts of long tasks

## Which Models Exhibit It

- **Sonnet 4.5**: Strong context anxiety. Compaction alone insufficient — required context resets with structured handoffs
- **Opus 4.5+**: Largely eliminated. One continuous session sufficient with automatic compaction

## Mitigations

### Context Reset (for anxious models)
- Clear context window entirely
- Start fresh agent session
- Provide structured handoff artifact carrying previous agent's state + next steps
- Cost: orchestration complexity, token overhead, latency

### Compaction (for non-anxious models)
- Summarize earlier parts of conversation in-place
- Same agent continues with shortened history
- Preserves continuity but doesn't give clean slate
- Insufficient alone for models with strong anxiety

## Relevance to Our Harness

Our long-running research sessions (3-round autoresearch, multi-phase builds) are vulnerable to context anxiety. Our current mitigation is compaction (summarizing earlier rounds). For GPT/strict models, this may be insufficient — context resets may be required between rounds.

## Detection

Watch for:
- Sudden acceleration in output pace toward end of long sessions
- Skipping of verification gates that were passed earlier
- "I'll complete this quickly" language
- Dropping of structured output formats
