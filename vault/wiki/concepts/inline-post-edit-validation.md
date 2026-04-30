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
status: developing
---

# Inline Post-Edit Validation

Inline post-edit validation runs compilers, linters, and parsers immediately after each code edit — before the model sees the result. Errors are caught at the tool layer, not at the agent reasoning layer, eliminating unnecessary retry round-trips.

## How It Differs From Our Current Approach

| Aspect | Current Harness (L3+L4) | WOZCODE (Inline) |
|--------|------------------------|-------------------|
| **When validation runs** | After all edits, before next phase | After each individual edit |
| **Who sees errors** | Model sees errors, reformulates | Tool layer catches errors, auto-fixes or enriches |
| **Error context** | Raw compiler/linter output | Dialect-specific hints, location-precise diffs |
| **Auto-fix capability** | None | SQL dialect rewrites, common pattern fixes |
| **Token cost** | Error + re-edit = full round-trip | Caught pre-model = zero model tokens |

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

### Layer 3: Grounding Checkpoints
Current: `grounding-check` validates spec compliance and state integrity.

Add: `post-edit-validate` hook that runs immediately after each `edit` tool invocation:
1. Run language-appropriate linter/compiler
2. If errors → attempt auto-fix (configurable)
3. If auto-fix fails → enrich error with context, return to model
4. If success → proceed to next edit

### Layer 4: Adversarial Verification
Current: Critic agents attack after all edits are complete.

This remains unchanged — inline validation handles syntax errors; adversarial verification handles semantic/logic errors. The layers are complementary:
- **Inline (L3)**: "Does it compile/parse?" (fast, tool-level)
- **Adversarial (L4)**: "Is it correct?" (slow, agent-level)

### Supported Validators

| Language/Format | Validator | Auto-Fix Scope |
|-----------------|-----------|---------------|
| TypeScript/JavaScript | `tsc --noEmit`, ESLint | None initially (type errors too complex) |
| JSON | `JSON.parse` | Trailing commas, unquoted keys |
| YAML | `yaml.parse` | Indentation fixes |
| SQL | Dialect-specific linter | Backtick→quote, reserved words |
| Python | `py_compile`, `ruff` | Import ordering, unused imports |
| HTML | HTML parser | Unclosed tags |

## Token Savings Mechanism

Each avoided retry saves a full API round-trip. For a session with 20 edits and a 10% inline catch rate, that's 2 avoided round-trips × (~8000 tokens per round-trip) = ~16,000 tokens saved. On a 5-subtask plan (our baseline ~83,500 overhead + coding), this represents ~15-20% overhead reduction.
