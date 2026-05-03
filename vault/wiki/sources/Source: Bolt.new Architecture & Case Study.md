---
type: source
source_type: case_study
title: "Bolt.new Architecture & Case Study"
author: "DeepWiki, Evil Martians (Victoria Melnikova, Travis Turner)"
date_published: 2024-12-02
url:
  - "https://deepwiki.com/stackblitz/bolt.new/1.2-architecture"
  - "https://evilmartians.com/chronicles/bolt-new-from-stackblitz-how-they-surfed-the-ai-wave-with-no-wipeouts"
  - "https://github.com/stackblitz/bolt.new"
confidence: high
key_claims:
  - "WebContainers give AI complete control over filesystem, node server, package manager, terminal, browser console"
  - "Claude 3.5 Sonnet was the enabling technology — zero-shot code gen without RAG infrastructure"
  - "0 to $4M ARR in 4 weeks — usage doubling daily"
  - "AI-generated code is immediately executable and editable in-browser"
  - "Bolt.new is open source, built on Remix + React + WebContainers"
  - "Rails powers the backend (users, permissions, billing)"
tags:
  - bolt
  - webcontainers
  - claude
  - remix
  - stackblitz
created: 2026-05-03
updated: 2026-05-03
status: ingested

---# Bolt.new Architecture & Case Study

Bolt.new is an AI-powered full-stack web development platform by StackBlitz that runs entirely in the browser. Users prompt, AI builds, code executes instantly in WebContainers.

## Architecture (DeepWiki)

### Core Components

**Frontend**: Remix framework + React. UI libraries: Radix UI, Framer Motion, UnoCSS. CodeMirror editor + XTerm.js terminal + app preview.

**WebContainer System**: In-browser Node.js runtime. Filesystem, package manager, terminal, browser console — all in browser sandbox via WebAssembly.

**AI Integration**: Anthropic Claude API. AI agent interprets prompts → controls dev environment → generates code → installs dependencies → runs dev server → deploys.

**Deployment**: Cloudflare Pages. One-click production deploy.

### Interaction Flow
```
User → Submit prompt → AI Agent → Generate code → Create files
     → Install deps → Run dev server → Display preview
     → Request changes → Modify code → Update preview
     → Request deploy → Deploy → Share URL
```

## Evil Martians Case Study

### The Breakthrough
StackBlitz had WebContainers since 2021. The missing piece was a model capable of zero-shot code generation without RAG infrastructure. Claude 3.5 Sonnet changed everything: "There's an order of magnitude difference in the LLM's required infrastructure to make it functional versus zero shot."

### Key Product Decisions
- Code executes instantly — no waiting for cloud VMs
- AI-generated code is **malleable** — editable in-browser
- Streaming interface shows real-time results
- Complex environments spin up in milliseconds
- One-click deploy to Netlify

### Results
- 0→$4M ARR in 4 weeks
- 99% reduction in development costs for users
- Tens of thousands of new customers, usage doubling daily
- Supabase signups surged after bolt.new integration

### Lessons for AI Coding Harness
1. **Environment control is the moat.** If the agent can't run code, it can't verify its own output. Bolt's WebContainers + OpenAI Codex's Chrome DevTools integration + Anthropic's Playwright MCP all converge on this.
2. **Model capability matters more than prompt engineering** for certain thresholds. Before Claude 3.5 Sonnet, the same WebContainer technology wasn't enough. Find the model that makes your harness viable.
3. **Keep generated code editable by users.** Don't lock users into a black-box AI output. This reduces trust barriers and enables human-in-the-loop refinement.
4. **Rails backend for non-AI concerns** — users, permissions, billing. Don't reinvent infrastructure; use proven tech for everything outside the AI path.
