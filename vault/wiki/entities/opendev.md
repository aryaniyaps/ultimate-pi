---
type: entity
entity_type: project
url: https://github.com/opendev-to/opendev
tags:
  - coding-agent
  - open-source
  - terminal
  - context-engineering
related:
  - "[[Entity: Pi Coding Agent (pi-mono)]]"
  - "[[sources/opendev-arxiv-2603.05344v1]]"
---

# OpenDev

Open-source, command-line AI coding agent by Nghi D. Q. Bui. First comprehensive technical report for a terminal-native interactive coding agent (arXiv:2603.05344v1, March 2026).

## Architecture

Four-layer system:
1. **Entry & UI**: CLI, TUI (Textual), Web UI (FastAPI + WebSockets)
2. **Agent**: MainAgent (single class, parameterized), Planner subagent, 8 specialized subagent types
3. **Tool & Context**: 35 built-in tools across 12 handler categories, MCP integration, staged compaction
4. **Persistence**: Session storage (JSON + JSONL), operation log/undo, configuration hierarchy, provider cache

## Key Features

- **Compound AI system**: 5 model roles (action, thinking, critique, vision, compact)
- **Extended ReAct loop**: Thinking phase → Action phase → Decision with doom-loop detection
- **Adaptive Context Compaction**: 5 graduated stages (70%→80%→85%→90%→99%)
- **Defense-in-depth safety**: 5 independent layers
- **Dual-memory architecture**: Episodic + Working memory
- **Event-driven reminders**: 24 templates, 8 event detectors
- **9-pass fuzzy edit matching**: Absorbs LLM formatting imprecision
- **LSP integration**: Semantic code analysis for 30+ languages
- **Shadow git snapshots**: Per-step undo without interfering with user's git

## Relevance

OpenDev's architecture paper is the most comprehensive reference for building terminal coding agents. Its context engineering, safety, and orchestration patterns are directly applicable to our harness. The paper's "Lessons Learned" section (Section 3) provides transferable engineering principles validated through production use.
