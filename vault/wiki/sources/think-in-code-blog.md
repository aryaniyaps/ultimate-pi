---
type: source
source_type: blog
title: "Think in Code"
author: B. Mert Köseoğlu
date_published: 2026
url: https://mksg.lu/blog/think-in-code
confidence: medium
key_claims:
  - "Think in Code is a mandatory paradigm across all 12 platform instruction files"
  - "One script replaces ten tool calls"
  - "47 files × Read() = 700 KB → 1 ctx_execute() = 3.6 KB (200× reduction)"
  - "Cloudflare uses similar 'Code Mode' for Workers API with 2,500+ endpoints"
  - "LLM writes TypeScript, code runs in sandbox, only console.log() output enters context"
---

# Think in Code (blog post)

Article by B. Mert Köseoğlu explaining the "Think in Code" paradigm implemented in context-mode v1.0.64.

## Core Idea

Stop treating LLMs as data processors. Treat them as **code generators**. When the agent needs to analyze/count/filter data, it writes a script, the script runs in sandbox, only stdout enters context. The CPU does the work for free. Tokens cost money.

## Injected Instruction

The instruction injected into every platform:

```
THINK IN CODE: When you need to analyze, count, filter, compare, or process
data, write code that does the work and console.log() only the answer. Don't
read raw data into context to process mentally. Program the analysis, don't
compute it in your reasoning. Write robust, pure JavaScript. No npm
dependencies. Only Node.js built-ins (fs, path, child_process). Always
try/catch. Node.js and Bun compatible.
```

## Case Study: Cloudflare Code Mode

Cloudflare's API has 2,500+ endpoints. Exposing each as MCP tool = 60,000+ tokens for definitions. Code Mode collapses to 2 tools and ~1,000 tokens. Built on Dynamic Workers (V8 isolates boot 100× faster than containers, 10–100× less memory). Battle-tested for 8+ years.

## Efficiency

N sequential tool calls → 1 code execution. Intermediate results flow through code variables, not the conversation. The LLM's context stays clean.
