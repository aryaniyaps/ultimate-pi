---
type: concept
title: "Progressive Disclosure for Agents"
created: 2026-04-30
updated: 2026-04-30
tags:
  - agent-architecture
  - context-window
  - codebase-exploration
related:
  - "[[agent-codebase-interface]]"
  - "[[repo-map-ranking]]"
  - "[[aider-repomap-tree-sitter]]"
status: developing
---

# Progressive Disclosure for Agents

A strategy for presenting codebase information to agents in layers of increasing detail, matching the agent's navigation pattern.

## Why It Matters

Humans use progressive disclosure naturally: they scan file names, open a file, skim headers, drill into functions. Agents need this structured explicitly because they can't "skim" — every byte they read consumes context window and costs tokens.

## Layers

### L0: Project Map (always available, minimal tokens)
- Directory structure
- Key entry points (main files, config files)
- Build system and dependencies
- ~200-500 tokens

### L1: Symbol Map (on-demand, medium tokens)
- All top-level symbols (classes, functions, types) with signatures
- Cross-reference counts per symbol
- File-to-symbol mapping
- ~1K-4K tokens (ranked subset for large repos)

### L2: File Context (on request)
- Full file contents for specific files
- Selected by agent based on L0/L1 information

### L3: Deep Context (on explicit request)
- Call graphs for specific functions
- Data flow diagrams
- Test coverage maps

## Implementation

The agent should:
1. Always receive L0 (free, cached)
2. Query L1 for relevant symbols based on the task
3. Request L2 for specific files identified from L1
4. Request L3 only when stuck or verifying complex interactions
