---
type: concept
title: "Inline Post-Edit Validation"
created: 2026-04-30
updated: 2026-04-30
tags:
  - agent-tools
  - quality
  - token-reduction
related:
  - "[[wozcode]]"
  - "[[grounding-checkpoints]]"
  - "[[adversarial-verification]]"
  - "[[research-wozcode-token-reduction]]"
  - "[[harness-implementation-plan]]"
status: developing
---

# Inline Post-Edit Validation

Inline post-edit validation runs **compilers and parsers** immediately after each code edit — before the model sees the result. Syntax errors are caught at the tool layer, not at the agent reasoning layer, eliminating unnecessary retry round-trips. Linting and formatting are deferred to Phase 16: a single deterministic final gate that runs after L4 adversarial verification passes. See [[harness-implementation-plan#phase-16-final-lint-format-gate|Phase 16]].

## How It Differs From Our Current Approach

| Aspect | Current Harness (L3+L4) | WOZCODE (Inline) | Our Design (Phase 12 + 16) |
|--------|------------------------|-------------------|---------------------------|
| **When syntax validation runs** | After all edits, before next phase | After each individual edit | After each individual edit (Phase 12) |
| **When linting runs** | N/A (not in pipeline) | Inline after each edit | Once, post-L4 verification (Phase 16) |
| **When formatting runs** | N/A (not in pipeline) | Inline after each edit | Once, post-L4, absolute last code-modifying step (Phase 16) |
| **Who sees errors** | Model sees errors, reformulates | Tool layer catches errors, auto-fixes or enriches | Syntax: tool layer. Lint/format: deterministic gate, no LLM |
| **Error context** | Raw compiler/linter output | Dialect-specific hints, location-precise diffs | Syntax: enriched diffs. Lint: structured violation report |
| **Auto-fix capability** | None | SQL dialect rewrites, common pattern fixes | Syntax: SQL dialect. Lint: eslint --fix, biome --fix, ruff --fix. Format: always auto-applied |
| **Token cost** | Error + re-edit = full round-trip | Caught pre-model = zero model tokens | Syntax inline: zero. Lint/format gate: zero (deterministic tools) |

## WOZCODE's Implementation (Source: [[wozcode]])

### Syntax Validation
After every edit, WOZCODE runs:
- **TypeScript compiler** (`tsc --noEmit`): catches type errors
- **JSON/YAML/HTML parsers**: catches structural errors
- **SQL linter**: catches syntax and semantic errors

If no errors → edit result returned to model. If errors → inline handling before model sees them.

### SQL Dialect Auto-Fix
WOZCODE rewrites common SQL mistakes before they reach the model:
- Backtick identifiers → dialect-appropriate quoting (double quotes for Postgres)
- Unquoted reserved word aliases → quoted
- `COUNT(DISTINCT a, b)` → expanded (not all dialects support multi-column distinct)
- `date_trunc("month", col)` → database-specific equivalents

### Better Error Context
When an error does reach the model, WOZCODE enriches it:
- Failed edits expand stubs with actual file content
- Real diff provided instead of "string not found"
- Dialect-specific hints included

## Integration Into Our Harness

### Phase 12: Inline Syntax Validation (L3)
Current: `grounding-check` validates spec compliance and state integrity.

Add: `post-edit-validate` hook that runs immediately after each `edit` tool invocation:
1. Run language-appropriate compiler/parser (NOT linter, NOT formatter)
2. If errors → attempt auto-fix (SQL dialect only; type errors surfaced)
3. If auto-fix fails → enrich error with context, return to model
4. If success → proceed to next edit

**Gate rule**: Inline validator MUST complete in <2 seconds. Full-project `tsc`, ESLint with plugins, and prettier are excluded — they belong in Phase 16.

### Phase 16: Final Lint + Format Gate (post-L4)
After L4 adversarial verification passes, a deterministic gate runs:
1. Lint with auto-fix (ESLint, biome, ruff, clippy)
2. Format with auto-apply (prettier, biome, rustfmt)
3. Verify format didn't introduce lint violations
4. Verdict: PASS / PASS_WITH_WARNINGS / FAIL

See [[harness-implementation-plan#phase-16-final-lint-format-gate|Phase 16]] for full specification.

### Layer 4: Adversarial Verification
Current: Critic agents attack after all edits are complete.

This remains unchanged — inline validation handles syntax errors; adversarial verification handles semantic/logic errors; final gate handles lint/format. The layers are complementary:
- **Inline (L3/Phase 12)**: "Does it compile/parse?" (fast, tool-level, syntax only)
- **Adversarial (L4)**: "Is it correct?" (slow, agent-level, semantic)
- **Final Gate (Phase 16)**: "Is it clean?" (fast, deterministic, lint + format)

### Supported Inline Validators (Phase 12 — Syntax Only)

| Language/Format | Validator | Auto-Fix Scope |
|-----------------|-----------|---------------|
| TypeScript/JavaScript | `tsc --noEmit` (single file) | None (type errors surfaced to model) |
| JSON | `JSON.parse` | Trailing commas, unquoted keys |
| YAML | `yaml.parse` | None (structural errors surfaced) |
| SQL | Dialect-specific parser | Backtick→quote, reserved words |
| Python | `py_compile` (single file) | None (syntax errors surfaced) |
| HTML | HTML parser | Unclosed tags |

### Final Gate Tooling (Phase 16 — Lint + Format)

These run ONCE after L4 verification passes. Never inline.

| Language | Linter (auto-fix) | Formatter |
|----------|-------------------|-----------|
| TypeScript/JavaScript | `eslint --fix` or `biome check --fix` | `prettier --write` or `biome format --write` |
| Python | `ruff check --fix` | `ruff format` |
| Rust | `clippy --fix` | `rustfmt` |
| JSON/YAML | `prettier --write` | `prettier --write` |
| SQL | `sqlfluff fix` | `sqlfluff format` |

## Token Savings Mechanism

Each avoided retry saves a full API round-trip. For a session with 20 edits and a 10% inline catch rate, that's 2 avoided round-trips × (~8000 tokens per round-trip) = ~16,000 tokens saved. On a 5-subtask plan (our baseline ~83,500 overhead + coding), this represents ~15-20% overhead reduction.
