---
type: concept
title: "Structured Compaction Pipeline"
aliases: ["compaction pipeline", "five-layer compaction"]
created: 2026-05-01
tags: [concept, harness-design, context-management, compaction, claude-code]
status: developing
related:
  - "[[harness-implementation-plan]]"
  - "[[drift-detection-unified]]"
  - "[[agentic-harness]]"
  - "[[context-anxiety]]"
sources:
  - "[[claude-code-architecture-vila-lab-2026]]"
  - "[[claude-code-architecture-qubytes-2026]]"
  - "[[claude-code-architecture-karaxai-2026]]"
---

# Structured Compaction Pipeline

Claude Code's approach to context management: a five-layer compaction pipeline that uses a forked subagent to produce structured summaries tuned for software engineering tasks. Unlike simple truncation or lossy summarization, this is "structured extraction followed by selective reconstruction."

## How It Works

1. Context window fills to ~83.5% of capacity (e.g., ~167K / 200K tokens)
2. A forked subagent is spawned whose sole job is to produce a structured summary
3. The subagent receives a ~6,500 token compaction prompt tuned for SE tasks
4. The summary selectively preserves: file paths, code snippets, error histories, active skills, plan state, tool deltas
5. All prior messages are dropped. The summary is wrapped in `<summary>` tags and injected
6. CLAUDE.md, tool definitions, and skills reload from disk automatically
7. ~85% payload reduction (167K → ~25K tokens)

## What Survives Compaction

- File paths that were read or modified
- Code snippets (trimmed, not full files)
- Error messages and stack traces
- Active skills and their state
- Task plan state (TodoWrite)
- Tool deltas (what changed, not what was the same)
- CLAUDE.md (re-read from disk after compaction)
- Last 5 file attachments

## What Does Not Survive

- Full file contents (re-read on demand)
- Intermediate tool outputs
- Earlier conversation turns (summarized)
- Transient observations
- Claude's internal reasoning chains

## Compaction Instructions

Users embed preservation instructions directly in CLAUDE.md. The compactor reads CLAUDE.md like any other context and honors these instructions:

```markdown
# Summary instructions
When summarizing this conversation, always preserve:
- The current task objective and acceptance criteria
- File paths that have been read or modified
- Test results and error messages
- Decisions made and the reasoning behind them
```

## Relationship to Current Drift Monitor

Our P3-P7 (Runtime Drift Monitor) detects stuck patterns and prunes context reactively. The compaction pipeline is proactive — it manages context before problems arise. They are complementary:

- **Drift Monitor**: Detects failure spirals, injects corrections, forces restart (reactive)
- **Compaction Pipeline**: Summarizes and reconstructs context at capacity thresholds (proactive)

## Integration Opportunities

- Replace P4 (Context pruning + correction injection) with structured compaction
- Extend P3 (Rule-based stuck-pattern detection) as a complement to compaction
- Add PreCompact/PostCompact hooks for archival and custom summarization
- Use forked subagent pattern (already in P25 subagent router, but not for compaction)
- Compaction instructions stored in wiki pages (L6), not CLAUDE.md files
