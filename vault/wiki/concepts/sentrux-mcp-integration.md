---
type: concept
title: "sentrux MCP Integration"
created: 2026-05-03
tags:
  - sentrux
  - mcp
  - ai-agents
related:
  - "[[sentrux]]"
  - "[[Quality Signal (sentrux)]]"
sources:
  - "[[sentrux-github-repo]]"
---

# sentrux MCP Integration

sentrux runs as a Model Context Protocol (MCP) server, giving AI coding agents real-time access to architectural health data.

## Setup
- **Claude Code:** `/plugin marketplace add sentrux/sentrux` then `/plugin install sentrux`
- **Other clients (Cursor, Windsurf, OpenCode):** Add to MCP config: `{"command": "sentrux", "args": ["--mcp"]}`

## Agent Workflow
```
scan("/project")       → quality_signal: 7342, files: 139, bottleneck: "modularity"
session_start()        → Baseline saved
... agent writes code ...
session_end()          → pass: false, before: 7342, after: 6891
```

## Available Tools (9 total)
`scan`, `health`, `session_start`, `session_end`, `rescan`, `check_rules`, `evolution`, `dsm`, `test_gaps`

## Key Design
The feedback loop closes automatically: sentrux provides the sensor (structural health), rules provide the spec (what "good" looks like), and the AI agent is the actuator (makes changes). No human intervention needed for routine quality checks.
