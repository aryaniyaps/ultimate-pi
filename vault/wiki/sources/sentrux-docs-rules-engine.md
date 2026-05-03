---
type: source
source_type: documentation
title: "sentrux Docs — Rules Engine"
author: sentrux
date_fetched: 2026-05-03
url: https://sentrux.dev/docs/rules-engine/
confidence: high
key_claims:
  - "Rules engine defines architectural constraints in .sentrux/rules.toml"
  - "Enforces in CI, before merges, or via MCP"
tags:
  - sentrux
  - architecture-governance
  - ci
---

# sentrux Docs: Rules Engine

## Configuration File
`.sentrux/rules.toml` at project root.

## Constraint Types

### Global Constraints
```toml
[constraints]
max_cycles = 0
max_coupling = "B"
max_cc = 25
no_god_files = true
```

### Layer Definitions
```toml
[[layers]]
name = "core"
paths = ["src/core/*"]
order = 0
```
Higher layers can depend on lower, not vice versa.

### Boundary Rules
```toml
[[boundaries]]
from = "src/app/*"
to = "src/core/internal/*"
reason = "App must not depend on core internals"
```

## Running Checks
```bash
sentrux check .     # exit 0 = pass, 1 = fail
```
CI integration: add `sentrux check .` to GitHub Actions.

## MCP Integration
Agent calls `check_rules()` → { pass: bool, violations: [...] }. Agent sees violations and fixes before human notices.
