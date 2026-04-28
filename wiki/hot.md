---
type: meta
title: "Hot Cache"
updated: 2026-04-28T00:00:00
---

# Recent Context

## Last Updated
2026-04-28. Full ingest of GitHub wiki source (13 pages from `.raw/ultimate-pi.wiki/`).

## Key Recent Facts
- Ingested all 8 harness layer concept pages + harness implementation plan
- Created [[adr-008]] (Black-Box QA) and [[adr-009]] (claude-obsidian Mode B) as decision pages
- Updated [[harness]] module page with cross-links to all 8 layer pages
- The harness pipeline is **always-on** — layers cannot be disabled, only tuned
- QA tests are generated from spec ONLY (ADR-008) — prevents gaming
- Memory layer uses claude-obsidian skills (ADR-009) instead of Vectra — eliminates ~87MB deps

## Recent Changes
- Created: [[spec-hardening]], [[structured-planning]], [[grounding-checkpoints]], [[adversarial-verification]], [[automated-observability]], [[persistent-memory]], [[schema-orchestration]], [[wiki-query-interface]], [[harness-implementation-plan]], [[adr-008]], [[adr-009]]
- Updated: [[harness]], [[index]]

## Active Threads
- Harness implementation: build phases 0-9 defined, awaiting coding start