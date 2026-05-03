---
type: concept
title: "sentrux Rules Engine"
created: 2026-05-03
tags:
  - sentrux
  - architecture-governance
  - ci
related:
  - "[[sentrux]]"
  - "[[sentrux MCP Integration]]"
sources:
  - "[[sentrux-docs-rules-engine]]"
---

# sentrux Rules Engine

A TOML-based constraint system that defines and enforces architectural rules. Configured via `.sentrux/rules.toml` at the project root.

## Capabilities
- **Global constraints:** max cycles, max coupling grade, max cyclomatic complexity, god file detection
- **Layer definitions:** ordered dependency hierarchy (lower order = more foundational)
- **Boundary rules:** block specific dependency paths with human-readable reasons

## Execution Modes
1. **CLI:** `sentrux check .` — exit 0 (pass) or 1 (fail), CI-friendly
2. **MCP:** Agent calls `check_rules()` — gets structured violation list, can self-correct before human sees

## Example
```toml
[constraints]
max_cycles = 0
max_coupling = "B"
max_cc = 25
no_god_files = true

[[layers]]
name = "core"
paths = ["src/core/*"]
order = 0

[[boundaries]]
from = "src/app/*"
to = "src/core/internal/*"
reason = "App must not depend on core internals"
```

## Integration
Works in CI (GitHub Actions), as pre-merge gate, and as MCP tool for AI agents. Agents receive structured violation data and can fix before committing.
