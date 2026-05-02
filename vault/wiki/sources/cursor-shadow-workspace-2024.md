---
type: source
status: ingested
source_type: engineering-blog
title: "Iterating with Shadow Workspaces"
author: "Arvid Lunnemark (Cursor/Anysphere)"
date_published: 2024-09-01
url: "https://cursor.com/blog/shadow-workspace"
confidence: high
tags: [cursor, shadow-workspace, lsp, pre-verification, agent-harness]
key_claims:
  - "Shadow workspace = hidden Electron window for AI code iteration with full LSP access"
  - "AI iterates invisibly until lints pass; user only sees valid code"
  - "Implemented as hidden window with gRPC IPC, auto-killed after 15min idle"
  - "Concurrency via interleaving: AIs paused/resumed like CPU processes"
  - "Future: kernel-level folder proxy (FUSE) for runnability + disk isolation"
  - "Rust-analyzer broken because it needs on-disk files; macOS FUSE blocked by Apple walled garden"
created: 2026-05-02
updated: 2026-05-02
---
# Iterating with Shadow Workspaces

Cursor's engineering blog post describing the **shadow workspace** — a hidden Electron window that lets AI agents iterate on code with full Language Server Protocol (LSP) access, independently of the user's coding experience.

## Design Criteria

1. **LSP-usability**: AIs see lints, go-to-definitions, full LSP interaction
2. **Runnability**: AIs run code and see output (future goal)
3. **Independence**: User's coding experience unaffected
4. **Privacy**: Code stays local
5. **Concurrency**: Multiple AIs work concurrently
6. **Universality**: Works for all languages and workspace setups
7. **Maintainability**: Minimal isolatable code
8. **Speed**: No minute-long delays, throughput for hundreds of AI branches

## Current Implementation

Hidden Electron window spawned with `show: false`. Edits sent via gRPC IPC between extension hosts. Shadow window runs full VS Code environment with LSP plugins. AI iterates on lints invisibly, then valid code presented to user.

Concurrency: interleaves AI edits like CPU processes — AI A runs, pauses, AI B runs, resume A. AIs don't notice time.

## Open Questions

1. Kernel-level folder proxy without kernel extension?
2. Windows equivalent of FUSE?
3. DriverKit for fake USB proxy folder?
4. Network-level isolation for microservice testing?
5. Cloud-based remote workspace with auto-inferred Docker?

## Relevance to Harness

The shadow workspace is the **pre-verification isolation** pattern. It proves that validating code before the user sees it is the single biggest UX differentiator in agentic coding. Our harness should implement an analogous "pre-commit validation sandbox" between L3 and L4.
