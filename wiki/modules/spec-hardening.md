---
type: module
title: Spec Hardening
status: developing
created: 2026-04-28
updated: 2026-04-28
tags: [harness, spec, layer-1, quality]
layer: "1"
sources:
  - "[[harness-implementation-plan]]"
related:
  - "[[agentic-harness]]"
  - "[[structured-planning]]"
  - "[[adversarial-verification]]"
---

# Spec Hardening

Layer 1 of the [[agentic-harness]]. Blocks execution until every underspecified component is resolved. Ambiguity is a bug — if you can't write a test for it, it's not specified.

## Flow

1. User request → `SpecHardener.harden()` → **HardenedSpec**
2. Count blocking ambiguities → if > 0, loop back to user (max 3 retries)
3. Store in `.pi/harness/specs/<id>.json`
4. Emit `spec_hardened` → Layer 2

## HardenedSpec Data Contract

| Field | Purpose |
|-------|---------|
| `intent_summary` | What the user actually wants |
| `success_criteria` | Each must be testable |
| `anti_criteria` | What the solution MUST NOT do |
| `ambiguity_flags` | Blocking or warning severity |
| `definition_of_done` | Single boolean expression |
| `scope_boundary` | Explicit in/out of scope |
| `constraints` | Technical or domain constraints |

## Extension Interface

| Type | Name |
|------|------|
| Tool | `harden-spec` |
| Tool | `resolve-ambiguity` |
| Tool | `approve-spec` (human override) |
| Command | `/harness-spec-status` |

## Config

```json
{ "spec_hardening": { "max_ambiguity_retries": 3, "auto_resolve_warning": true } }
```

## Files

- `lib/harness-spec.ts` — SpecHardener class, AI prompt construction
- `extensions/harness-spec.ts` — Extension: intercepts requests, runs hardening gate