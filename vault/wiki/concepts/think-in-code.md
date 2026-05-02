---
type: concept
title: Think in Code
created: 2026-04-30
updated: 2026-04-30
tags:
  - context-optimization
  - agentic-harness
  - paradigm
status: developing
related:
  - "[[context-mode]]"
  - "[[agentic-harness-context-enforcement]]"
sources:
  - "[[think-in-code-blog]]"
  - "[[context-mode-website]]"

---# Think in Code

A paradigm for AI coding agents where the agent writes code to process data instead of reading raw data into the context window for mental processing.

## Definition

> When you need to analyze, count, filter, compare, or process data, write code that does the work and output only the answer. Don't read raw data into context to process mentally.

## Origin

Introduced by B. Mert Köseoğlu in context-mode v1.0.64 (2026). Mandatory across all 14 platform instruction files.

## Mechanism

1. Agent encounters a task requiring data analysis (count files, filter errors, parse JSON, compare configs)
2. Instead of calling `Read()` on each file, agent writes a JavaScript/TypeScript script
3. Script runs in sandbox via `ctx_execute()` MCP tool (Node.js built-ins only, no npm)
4. Only `console.log()` output enters the conversation
5. Results are 200× smaller in context

## Enforcing in Agentic Harness

To enforce "Think in Code" in any agentic harness:

### Method 1: System Prompt Injection
Add the rule to the agent's AGENTS.md or equivalent instruction file:
```markdown
## Think in Code (MANDATORY)
When you need to analyze, count, filter, compare, or process data,
write code (JavaScript/Python) that does the work. Output only the
answer. Do NOT read raw data into context for mental processing.
Use built-ins only. No package installs. Always try/catch.
```

### Method 2: PreToolUse Hook
Intercept `Read()`, `Bash()`, `WebFetch()` calls and check if the call looks like data analysis. Redirect to a sandbox execution tool.

### Method 3: PostToolUse Compression
When large output enters context, automatically summarize/gist it and store raw data in a searchable index (FTS5 or similar). Mark the raw data as reference-only.

### Method 4: MCP Execution Tool
Provide an `execute()` MCP tool that runs code in a sandbox. The agent learns to prefer this over raw reads because it's faster and cheaper.

## Efficiency Gains (claimed)

| Before | After | Reduction |
|--------|-------|-----------|
| 47 files × Read() = 700 KB | 1 ctx_execute() = 3.6 KB | 200× |
| 20 tool calls = 600 KB | Same work, 20 KB | 30× |
| Cloudflare 2,500+ endpoints | 2 tools, ~1,000 tokens | 60× |

## Related Patterns

- **Cloudflare Code Mode**: Same concept for Workers API. LLM writes TypeScript, runs in V8 isolate (Dynamic Workers).
- **Code Interpreter**: Similar to ChatGPT's code interpreter but for local agent tool calls.
- **Output Compression**: context-mode's companion technique — strip filler words from agent responses (65-75% output reduction).
