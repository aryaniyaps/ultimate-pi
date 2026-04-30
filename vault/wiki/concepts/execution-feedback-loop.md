---
type: concept
title: "Execution Feedback Loop"
created: 2026-04-30
updated: 2026-04-30
tags:
  - agent-architecture
  - testing
  - feedback
related:
  - "[[agent-codebase-interface]]"
  - "[[verification-drift-detection]]"
status: developing
---

# Execution Feedback Loop

The agent equivalent of a human's debug-test-iterate cycle. Instead of visual step-through debugging, agents rely on structured execution feedback.

## Agent Execution Cycle

```
1. Propose change (edit file)
2. Execute test suite (or relevant subset)
3. Parse output (pass/fail + error messages + stack traces)
4. If fail: locate error source from stack trace / error message
5. Revise change
6. Repeat until green
```

## Key Differences from Human Debugging

| Human | Agent |
|-------|-------|
| Step-through debugger (pdb/gdb) | Test output + stack traces |
| Visual inspection of variable state | Structured error JSON |
| Intuition about likely failure points | Systematic retry with error context |
| Can set breakpoints anywhere | Must pre-plan verification checkpoints |
| Rubber duck debugging | Self-critique + adversarial verification |

## Requirements for Agent-Friendly Execution

1. **Fast test subset**: running full test suites is too slow per iteration
2. **Structured error output**: JSON or parseable format, not raw terminal output
3. **Stack trace with file:line**: enables automatic file lookup
4. **Diff-aware testing**: only run tests affected by the change
5. **Deterministic results**: flaky tests break the feedback loop
