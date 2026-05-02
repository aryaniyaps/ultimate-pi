---
type: concept
title: "Codebase-to-Context Ingestion"
created: 2026-04-30
updated: 2026-04-30
tags:
  - codebase-processing
  - llm-context
  - ingestion
status: developing
related:
  - "[[gitingest]]"

---# Codebase-to-Context Ingestion

## Definition

The process of converting an entire codebase (local directory or remote Git repository) into a structured plaintext format suitable for feeding into an LLM's context window.

## Why It Matters

AI coding agents operate on context. When an agent needs to understand an external dependency, library, or reference implementation, it must ingest that codebase efficiently. Individual file-by-file reading is slow and fragments understanding.

## Key Properties

- **Structured output**: Clear file boundaries, directory hierarchy preserved
- **Filterable**: Pattern-based include/exclude, file size limits
- **Deterministic**: Same input → same output, no LLM hallucination risk
- **Compressible**: Output can be further compressed by context runtimes like lean-ctx

## Tools

| Tool | Method | LLM Required | Reads Code |
|------|--------|-------------|------------|
| [[gitingest]] | Clone + structure | No | Yes |
| [[gitreverse]] | Metadata → LLM prompt | Yes | No |
| lean-ctx (built-in) | AST-based selective reading | No | Yes (selective) |

## Relationship to ultimate-pi Harness

The harness currently uses its built-in lean-ctx tool for file-by-file reading. Codebase-to-context ingestion complements this by enabling bulk ingestion of entire external repositories. This is useful when:

1. Researching how a library or tool works
2. Understanding a reference implementation
3. Ingesting documentation repos into wiki
4. Cross-referencing code patterns across projects
