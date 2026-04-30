---
type: concept
title: "context-continuity"
created: 2026-04-30
updated: 2026-04-30
status: seed
tags: [#concept, #context-optimization, #session-management]
related:
  - "[[context-mode]]"
  - "[[lean-ctx]]"
---

# Context Continuity

> [!stub] This is a stub page.

The ability for AI coding agents to preserve session state across context compaction events. Both context-mode and lean-ctx implement this, but differently:

- **context-mode**: Captures 26 event types to SessionDB for cross-compaction continuity
- **lean-ctx**: Uses CCP (Cross-session Continuity Protocol) with scratchpad messaging for multi-agent session sharing

Without context continuity, each context window compaction resets the agent's working memory, losing accumulated understanding of the codebase.
