---
type: concept
title: Agentic Harness Context Enforcement
created: 2026-04-30
updated: 2026-04-30
tags:
  - agentic-harness
  - context-optimization
  - enforcement
status: developing
related:
  - "[[think-in-code]]"
  - "[[context-mode]]"
  - "[[lean-ctx]]"
sources:
  - "[[Research: context-mode vs lean-ctx]]"

---# Agentic Harness Context Enforcement

How to enforce context-efficient behavior ("think in code") in an agentic harness — the orchestration layer that manages AI coding agents.

## Problem

AI agents are profligate with context. They call `Read()` on 47 files when 1 script would suffice. They produce verbose pleasantries. They forget what they already read. The harness must enforce discipline because the agent won't do it voluntarily.

## Enforcement Layers

### Layer 1: System Prompt / Instructions (cheapest, least reliable)
- Inject "Think in Code" rules into AGENTS.md or system prompt
- Works with any agent without custom tools
- Relies on agent compliance — can be ignored under pressure
- Examples: context-mode injects rules into 14 platform configs

### Layer 2: PreToolUse Interception (medium cost, high reliability)
- Intercept tool calls before execution
- Route large reads to sandbox execution instead
- Block dangerous commands (curl, wget, rm -rf)
- Requires MCP or hook support in the harness
- Example: context-mode PreToolUse hook

### Layer 3: PostToolUse Compression (medium cost, medium reliability)
- After tool output enters context, compress it
- Strip noise, keep signal
- Store raw data in searchable index (FTS5)
- Example: lean-ctx shell hook patterns

### Layer 4: Tool Replacement (highest cost, highest reliability)
- Replace native `Read()`, `Bash()`, `WebFetch()` with optimized versions
- AST-based file reading (signatures only)
- Shell output compression (pattern-matched)
- Cached re-reads
- Example: lean-ctx's 46 MCP tools

### Layer 5: Governance & Monitoring (supplemental)
- Profiles define what each agent can do
- Budgets limit token/cost/shell usage
- SLOs trigger throttling
- Anomaly detection for runaway consumption
- Analytics dashboard for human oversight
- Example: lean-ctx governance features

### Layer 6: TypeScript Execution Layer (emerging, high potential)
- Replace ALL individual tool calls with a single "write TypeScript" tool
- Agent writes TS code that orchestrates tools via typed API
- Code executes in sandboxed runtime (Node.js VM, Deno, or Worker isolate)
- Tool calls dispatch via typed RPC to harness for permission gating
- Intermediate results stay in sandbox — only final output enters LLM context
- 3-4x context reduction vs flat tool calling
- ~20% higher multi-tool success rate (CodeAct, ICML 2024)
- Validated by: Apple CodeAct, Cloudflare Code Mode, Executor (1.3K stars)
- See [[ts-execution-layer]] and [[harness-implementation-plan]] (P43)

## Recommendation for ultimate-pi Harness

**Current state**: lean-ctx installed as MCP server + shell hook.

**Gap**: No "Think in Code" enforcement. The harness relies on AGENTS.md rules (Layer 1 only).

**Recommended additions**:

1. **Add Think in Code to system prompt** (zero cost, immediate). Update AGENTS.md with the mandatory rule from context-mode's playbook.

2. **Verify lean-ctx `ctx_execute` works** — lean-ctx has execution capabilities. Test if agent can write and run analysis scripts through lean-ctx tools.

3. **Consider context-mode as complement** — the two tools solve different halves: context-mode excels at sandbox enforcement + Think in Code paradigm; lean-ctx excels at compression + governance. They could coexist if the MCP namespace doesn't conflict.

4. **Add output compression rules** — context-mode's output compression (strip filler, fragments OK, short synonyms) can be added to AGENTS.md regardless of tool choice.

5. **Monitor context usage** — lean-ctx's `gain` dashboard and `wrapped` reports provide visibility. Use them to measure effectiveness of any new enforcement.

6. **Plan TypeScript Execution Layer (P43)** — the logical extension of Think-in-Code. Instead of enforcing code-over-data for analysis tasks, replace the entire flat tool list with a typed TypeScript API + sandboxed runtime. Agent writes TS code; sandbox executes; only results enter context. 3-4x context reduction, ~20% higher success rate. See [[ts-execution-layer]] and [[harness-implementation-plan]].
