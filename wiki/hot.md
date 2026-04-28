---
type: meta
title: "Hot Cache"
updated: 2026-04-28T20:50:00
---

# Recent Context

## Last Updated
2026-04-28. Harness-wiki integration contract established.

## Key Recent Facts
- ADR-010: Every harness layer MUST read wiki before acting, write wiki after every state transition
- 11 Obsidian skills mapped to pipeline stages: wiki-query (read), save/wiki-ingest (write), wiki-lint (periodic), wiki-fold (periodic), obsidian-markdown (format), obsidian-bases (dashboards), canvas (visual), autoresearch (research), compress (token savings), defuddle (pre-process)
- 7 staleness elimination rules: status propagation, decision referencing, cross-ref integrity, contradiction resolution, hot cache freshness, lint schedule, index sync
- L7 schema orchestration is the enforcement chokepoint: blocks any layer that skips wiki reads
- Token budget impact: ~20-35% increase, from ~17,500 to ~20,500-23,500 per subtask
- Failure mode: if wiki-query returns no relevant ADR, layer halts until missing ADR is created

## Recent Changes
- Created: [[adr-010]], [[harness-wiki-skill-mapping]], [[harness-wiki-pipeline]]
- Updated: [[index]] (added 3 new entries)
- Created dirs: wiki/sources/, wiki/entities/, wiki/concepts/, wiki/questions/, wiki/folds/, wiki/canvases/

## Active Threads
- Harness implementation: build phases 0-9 defined, wiki integration contract ready for coding
- Next: implement extension hooks in extensions/harness-*.ts with wiki-query pre-action and save post-action
