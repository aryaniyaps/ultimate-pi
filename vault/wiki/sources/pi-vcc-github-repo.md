---
type: source
source_type: github-repo
title: "sting8k/pi-vcc"
author: "Do Anh (sting8k)"
date_published: 2026-04-24
date_accessed: 2026-05-05
url: "https://github.com/sting8k/pi-vcc"
confidence: high
tags:
  - pi-agent
  - vcc
  - compaction
  - memory
  - extension
key_claims:
  - "pi-vcc is algorithmic conversation compactor for Pi, inspired by VCC"
  - "No LLM calls for compaction; deterministic output"
  - "35-99% token reduction on real sessions (99.8% peak on 2.2M char session)"
  - "vcc_recall supports searchable lineage history after compaction"
  - "Config option overrideDefaultCompaction routes /compact and auto-compaction through pi-vcc"
  - "Latest release v0.3.12 (2026-04-25), 75 stars, 606 weekly / 3,299 monthly installs on pi.dev package index"
  - "Tested on 794+ real HuggingFace sessions"
  - "v0.3.8 added long-turn collapsing (keeps 8 most recent tool calls)"
  - "At least 2 community forks exist (ceblan/pi-vcc, mvdirty/pi-vcc)"
  - "Only fully deterministic compaction extension in Pi ecosystem"
---

# pi-vcc Repository

## Summary

pi-vcc is a Pi package/extension for deterministic conversation compaction and recall. It replaces or complements default compaction with algorithmic extraction into 5 semantic sections, then adds recall tooling over session JSONL history. It is the only fully deterministic compaction option in the Pi extension ecosystem.

## Key Details

- **Repo**: `sting8k/pi-vcc` (75 stars, 6 forks + 2 community forks)
- **Latest release**: v0.3.12 (2026-04-25)
- **npm**: @sting8k/pi-vcc (3,299 monthly / 606 weekly installs shown on pi.dev package index)
- **Install**: `pi install npm:@sting8k/pi-vcc`
- **Hook**: `session_before_compact`
- **Config**: `~/.pi/agent/pi-vcc-config.json` (auto-created on first run)
- **Override**: `overrideDefaultCompaction: true` to replace default `/compact` path

## Performance Benchmarks

- Session A: 997,162 → 7,959 chars (99.2% reduction, 64ms)
- Session D: 2,258,477 → 4,439 chars (99.8% reduction, 30ms)
- Tested on 794+ real HuggingFace sessions
- Compaction latency: 30-470ms, zero API calls

## v0.3.8 Key Changes (April 19, 2026)

- `/compact` and auto-compact now run Pi core by default; `overrideDefaultCompaction: true` opts into pi-vcc
- Long turns collapse older tool calls into `* (N earlier entries omitted)`, keeping 8 most recent — designed for explore/discover loops
- `[Commits]` section no longer dropped after first compaction
- Recall note no longer stacks on every compaction

## 5 Semantic Sections

1. Session goal
2. Files and changes
3. Commits
4. Outstanding context
5. User preferences

## Competitive Position

pi-vcc is the only fully deterministic (no-LLM) compaction extension in Pi's ecosystem. Three other extensions exist (pi-model-aware-compaction, pi-custom-compaction, pi-agentic-compaction) but all use LLM calls. See [[pi-compaction-extensions-ecosystem]].
