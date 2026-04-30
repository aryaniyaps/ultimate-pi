---
type: concept
title: "Fuzzy Edit Matching"
created: 2026-04-30
updated: 2026-04-30
tags:
  - agent-tools
  - token-reduction
  - diff-algorithms
related:
  - "[[wozcode]]"
  - "[[research-wozcode-token-reduction]]"
  - "[[harness-implementation-plan]]"
status: developing
---

# Fuzzy Edit Matching

Fuzzy edit matching is a tool-level enhancement that makes code edits tolerant of minor formatting differences between what the model outputs and what exists on disk. Instead of failing on exact string mismatch, the edit tool applies a similarity-tolerant diff that lands near-misses without a retry round-trip.

## Problem

Standard edit tools (Claude Code's `edit`, our harness's `edit`) require exact `oldText` match. When the model generates an edit with:

- Whitespace drift (tabs vs spaces, trailing whitespace)
- Indentation differences (2-space vs 4-space blocks)
- Visually-identical characters (curly quotes `"` vs straight quotes `"`, em-dash `—` vs `--`)
- Line-ending variance (`\n` vs `\r\n`)

...the edit fails. The model receives the error, reformulates, and retries. Each retry is a full API round-trip costing input + output tokens.

## Solution

Fuzzy edit matching applies these normalization passes before attempting the match:

1. **Whitespace normalization**: Collapse variable whitespace, strip trailing spaces
2. **Character normalization**: Map curly quotes → straight, em-dashes → double-hyphens
3. **Indentation-aware matching**: Match by content ignoring leading whitespace differences
4. **Line-ending normalization**: Treat `\r\n` and `\n` as equivalent

If the normalized `oldText` matches a unique region in the normalized file, the edit proceeds with the original (non-normalized) `newText` applied at the matched position.

## Token Savings

WOZCODE claims this eliminates a significant fraction of retry round-trips (Source: [[wozcode]]). Each avoided retry saves:
- Input tokens: re-sending file content + error message + conversation history
- Output tokens: reformulated edit attempt

For a typical session, edit retries can account for 5-15% of total token spend.

## Failure Modes

- **Ambiguous match**: Normalized oldText matches multiple locations → must fall back to exact match
- **Over-normalization**: Aggressive normalization changes semantics (e.g., normalizing quotes inside string literals)
- **Silent wrong edits**: Fuzzy match lands on wrong location with similar content → bug introduced silently
- **Confidence in large files**: Single-line matches in large files may be ambiguous

## Relationship to WOZCODE Quality Loop

Fuzzy edit matching is one component of WOZCODE's three-lever quality loop:

1. **Fuzzy matching** → lands near-misses (prevents retries)
2. **Post-edit validation** → catches actual errors (prevents cascading failures)
3. **Better error context** → when an error reaches the model, it gets actionable details (reduces retry count)

## Implementation Path for Our Harness

1. Add normalization layer to the `edit` tool in `lib/harness-executor.ts`
2. Configurable normalization: `fuzzy_edit: { normalize_whitespace: true, normalize_quotes: true }`
3. Ambiguity detection: if multiple matches, log warning and fall back to exact
4. Integration point: L3 [[grounding-checkpoints]], intercept edit failures and re-attempt with fuzzy matching before surfacing to model
5. Track fuzzy-match rate vs exact-match rate as observability metric (L5 [[automated-observability]])
