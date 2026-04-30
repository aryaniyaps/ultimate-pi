---
type: module
title: "Think-in-Code Enforcement (L3)"
status: developing
created: 2026-04-30
updated: 2026-04-30
tags: [harness, think-in-code, context-optimization, layer-3, enforcement]
layer: "3"
sources:
  - "[[think-in-code-blog]]"
  - "[[context-mode-website]]"
  - "[[Research: context-mode vs lean-ctx]]"
related:
  - "[[think-in-code]]"
  - "[[agentic-harness-context-enforcement]]"
  - "[[grounding-checkpoints]]"
  - "[[harness-implementation-plan]]"
  - "[[lean-ctx]]"
---

# Think-in-Code Enforcement (L3 Tool Layer)

A mandatory paradigm enforced at the L3 tool layer of the harness. Agents MUST write code to process data instead of reading raw data into the context window for mental processing. This is not a suggestion — it is enforced through system prompt injection, tool interception, and post-tool compression.

## First Principles

1. **Reading raw data into context is wasteful**: An agent reading 47 files to count errors consumes 700KB of context. A script doing the same analysis outputs 3.6KB. Reduction: 200×.
2. **Agents are bad at mental computation**: Counting, filtering, comparing, parsing — these are CPU tasks. Agents should delegate to CPU.
3. **Context is the scarcest resource**: Every token of raw data is a token not used for reasoning. The context budget must be protected.
4. **The agent won't do this voluntarily**: Under pressure (context filling, task complexity), agents revert to read-everything patterns. Enforcement is mandatory.

## Enforcement Architecture

Three-layer enforcement, from cheapest/least-reliable to most expensive/most-reliable:

### Layer 1: System Prompt Injection (zero cost)

AGENTS.md rule:
```markdown
## Think in Code (MANDATORY)
When you need to analyze, count, filter, compare, or process data,
write code (JavaScript/Python) that does the work. Output only the
answer. Do NOT read raw data into context for mental processing.
Use built-ins only. No package installs. Always try/catch.
Use ctx_execute() for sandboxed execution.
```

Cost: 0 tokens beyond the rule text. Reliability: depends on agent compliance.

### Layer 2: PreToolUse Interception (medium cost)

Intercept `Read()`, `Bash()`, `WebFetch()` calls at L3 executor hooks. Detect data-analysis patterns:
- Sequential reads of 3+ files without edits between them
- grep/find on large result sets (>100 lines)
- WebFetch of large API responses (>5KB)

Route to `ctx_execute()` sandbox via pi-lean-ctx's execution capabilities instead.

Cost: ~0-50 tokens per intercepted call (check logic). Reliability: high — prevents wasteful calls before they happen.

### Layer 3: PostToolUse Compression (medium cost)

When large output enters context despite interception, lean-ctx's 90+ shell pattern matchers auto-compress:
- Strip filler/boilerplate
- Keep only signal (errors, results, key data)
- Store raw output in searchable index (FTS5 equivalent)

Cost: 0 tokens (lean-ctx shell hook pattern matching). Reliability: medium — compresses what got through, doesn't prevent.

---

## Execution Sandbox: ctx_execute()

pi-lean-ctx provides `ctx_execute()` — a sandboxed code execution tool:

- **What runs**: JavaScript/TypeScript (Node.js built-ins only, no npm)
- **What returns**: Only `console.log()` output enters the conversation
- **Sandbox**: Isolated subprocess, no filesystem access outside working directory
- **Timeout**: Configurable (default: 30s)

### Example: Before vs After

**Before** (without Think in Code):
```
Agent: Read(file1) → Read(file2) → ... → Read(file47)
       → mentally count errors → report
Context: 700KB consumed. 47 tool calls. 20+ turns.
```

**After** (with Think in Code enforced):
```
Agent: ctx_execute(`
  const fs = require('fs');
  const files = fs.readdirSync('./logs');
  let errors = 0;
  for (const f of files) {
    const content = fs.readFileSync(`./logs/${f}`, 'utf8');
    errors += (content.match(/ERROR/g) || []).length;
  }
  console.log(JSON.stringify({total_errors: errors, files_scanned: files.length}));
`)
→ Output: {"total_errors": 127, "files_scanned": 47}
Context: 3.6KB consumed. 1 tool call. 1 turn.
```

---

## What Gets Routed to Think-in-Code

| Pattern | Detection | Redirect |
|---------|-----------|----------|
| Sequential file reads (3+) without edits | L2 interception | `ctx_execute()` batch script |
| grep/find with >100 results | L2 interception | `ctx_execute()` with filtered output |
| WebFetch with >5KB response | L2 interception | `ctx_execute()` with `JSON.parse()` |
| "Count how many...", "Find all..." | L1 system prompt | Agent self-routes |
| "Compare X and Y..." | L1 system prompt | Agent self-routes |
| "Summarize the errors..." | L3 compression | lean-ctx auto-compresses |

---

## Efficiency Gains

| Scenario | Before | After | Reduction |
|----------|--------|-------|-----------|
| Multi-file data analysis | 47 Read() calls = 700KB | 1 ctx_execute() = 3.6KB | 200× |
| Error log scanning | 20 tool calls = 600KB | 1 execute = 20KB | 30× |
| API response parsing | 5 WebFetch + Read = 500KB | 1 execute = 1KB | 500× |
| Config comparison across files | 10 Read() = 200KB | 1 execute = 5KB | 40× |

---

## Integration with L3 Grounding Checkpoints

Think-in-Code enforcement runs as a pre-execution hook within L3:

```
L3 Grounding Checkpoint:
  1. Pre-execution: spec grounding check
  2. Pre-execution: Think-in-Code enforcement check (is the agent about to do data analysis via raw reads?)
  3. Execute subtask
  4. Post-execution: spec grounding check
  5. Post-execution: context usage audit (did we exceed budget?)
```

If an agent tries to bypass Think-in-Code (reads 47 files sequentially), L3 drift monitor (L2.5) detects "excessive searching" and triggers a soft nudge.

---

## Files

- `lib/harness-think-in-code.ts` — Enforcement logic, pattern detection, `ctx_execute()` routing
- Update `lib/harness-executor.ts` — Add Think-in-Code hook to pre-execution phase
- Update AGENTS.md — Add mandatory Think in Code rule
