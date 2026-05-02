---
type: source
source_type: blog
title: "Building a better repository map with tree-sitter"
author: "Aider (Paul Gauthier)"
date_published: 2023-10-22
url: "https://aider.chat/2023/10/22/repomap.html"
confidence: high
key_claims:
  - "Repo maps provide GPT with a concise view of the entire codebase: files + key symbols with signatures"
  - "tree-sitter parses source into AST to extract definitions and cross-references"
  - "Graph ranking algorithm selects most important portions that fit within token budget (default 1k tokens)"
  - "GPT can use the map to autonomously decide which files to inspect further"
  - "Sending whole files wastes context window; repo map is a compressed representation"
  - "Most important identifiers are those most referenced by other portions of code"
status: ingested
tags:
  - agent-context
  - tree-sitter
  - repo-map
  - context-window
created: 2023-10-22
updated: 2026-04-30

---# Building a better repository map with tree-sitter

Aider's approach to solving the "code context" problem for LLMs. When an LLM needs to make changes in a large codebase, it must understand how the target code relates to the rest of the codebase. Aider sends a concise repository map built via tree-sitter AST parsing.

## Core Technique

1. **tree-sitter parsing**: Extract all symbol definitions (classes, functions, methods, variables, types) from every source file
2. **Reference tracking**: Identify where each symbol is used across the codebase
3. **Graph ranking**: Build a dependency graph (files = nodes, dependencies = edges). Rank nodes by importance — most-referenced symbols are most important.
4. **Token budget**: Select the top-ranked nodes that fit within a configurable token budget (default 1k tokens)
5. **Dynamic adjustment**: Map expands when no files are in chat (need full context) and contracts when working on specific files

## Why This Works for Agents

- GPT sees call signatures and class structures across the entire repo
- Can autonomously decide which files to request for deeper inspection
- Compressed representation — doesn't waste context window on implementation details
- Tree-sitter is language-aware, producing structured, accurate symbol extraction
