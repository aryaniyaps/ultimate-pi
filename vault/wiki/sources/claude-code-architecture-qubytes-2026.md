---
type: source
status: ingested
source_type: blog
title: "Inside Claude Code: The Architecture That Makes AI Actually Do the Work"
author: "Vijendra (The Neural Blueprint / Qubytes)"
date_published: 2026-04-30
url: "https://qubytes.substack.com/p/claude-code-architecture-explained"
confidence: medium
tags: [claude-code, architecture, agent-loop, compaction, hooks, subagents]
key_claims:
  - "Claude Code is a while-loop surrounded by serious infrastructure"
  - "Five critical subsystems: Agent Loop, Permission System, Tools & Execution Environment, State & Persistence, Compaction Pipeline"
  - "Compaction pipeline is the most underappreciated component — five layers, forked subagent, structured summary"
  - "Hooks are the enterprise integration surface"
  - "Subagents enable horizontal scaling of reasoning"
  - "Safety as a subsystem, not an afterthought"
created: 2026-05-02
updated: 2026-05-02
---
# Claude Code Architecture (Qubytes, 2026)

## Source Summary

Technical deep-dive by Vijendra (The Neural Blueprint) analyzing Claude Code as a layered architecture. Published April 30, 2026 — same day as Cursor's harness evolution blog. Synthesized from the leaked source code and official documentation.

## Five Subsystems

### 1. Agent Loop
The heart. Orchestrates everything: assembles context window, dispatches requests, routes tool-use responses, commits state. Feedback controller, not a pipeline. Non-deterministic iterations driven by task complexity.

### 2. Permission System
First-class architectural concern. Sits between agent loop and tool execution. ML-based auto classifier with 7 permission modes. Diamond-shaped decision node: deny sends feedback to loop, accept lets execution proceed.

### 3. Tools & Execution Environment
Built-in tools (file read/write, bash, grep, glob) + MCP extensions. All tool execution runs through Shell Sandbox. Remote execution backends (local/cloud/remote).

### 4. State & Persistence
Append-oriented session transcript. Not just logging — substrate for resume, fork, rewind. CLAUDE.md + memory inject persistent project context. Sidechain transcripts for subagent interactions, preventing context pollution.

### 5. Compaction Pipeline
Five layers: forked subagent produces ~6,500 token structured summary. Preserves: last 5 file attachments, active skills, plan state, tool deltas. "Structured extraction followed by selective reconstruction — not summarization."

## Key Quotes

> "The core agent loop — assemble context, call the model, receive a tool request, execute it, repeat — is conceptually simple. The real engineering genius lives in everything around that loop."

> "Context is a managed resource, not an infinite buffer."

> "If you can't answer: How does your permission system work? What's your compaction strategy? Can I hook into the lifecycle? How does subagent delegation handle context isolation? — you're not looking at a production-ready agentic system."
