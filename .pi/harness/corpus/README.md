# Harness corpus ingest (Phase 2 stub)

Raw documents for graphify and harness context live in repo `./raw/` per AGENTS.md.

## Ingest workflow (when PDFs/sources available)

1. Place sources under `raw/harness/` or project `raw/`.
2. Run `graphify update .` (AST-only, no API cost).
3. Use **harness-context** skill with **context-mode** only to compile task-specific context maps.

## Phase 2 scope

No automated PDF pipeline in-repo until sources are committed. This directory documents the contract only.

Browser/sandbox automation remains **deferred** per ADR 0004 until manual harness-run evidence exists.
