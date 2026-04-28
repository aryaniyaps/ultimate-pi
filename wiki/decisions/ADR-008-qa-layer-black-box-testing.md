# ADR-008: Layer 4 — Automated QA with Spec-Only Test Generation (Black-Box Testing)

**Date:** 2026-04-28
**Status:** Accepted

## Context

The original 7-layer harness had no automated test generation or execution layer. Layer 4 (Critics) performed adversarial AI review of code but never wrote or ran test files. The `VerificationMethod` schema referenced `"automated_test"` but nothing produced or executed those tests.

This is a critical gap:

1. **AI critics can review code structure but cannot verify runtime behavior.** A logic error that looks correct in code review will pass the critic layer.
2. **No test artifacts are produced.** The pipeline generates code but leaves no executable verification for future regressions.
3. **Success criteria in the spec are explicitly marked `testable`** — but nobody writes those tests.
4. **Trust without verification.** Critics trust the implementation. Tests must trust only the spec.

The key insight: **the test writer must see ONLY the spec, not the implementation.** If the test writer sees the code, it will write tests that pass by knowing the implementation details ("gaming the system") rather than tests that verify the spec's behavioral contract. This is the same principle as black-box testing in traditional engineering.

## Decision

Add a new Layer 4 — Automated QA between Layer 3 (Execution) and Layer 5 (Critics, formerly Layer 4). The harness becomes 8 layers.

### Core principle: Spec-only test generation

The test writer AI receives:
- ✅ `HardenedSpec` — success criteria, anti-criteria, definition of done, scope boundary
- ✅ `ExecutionPlan` — task boundaries, testable verification methods per task
- ✅ Public API surface (type signatures, exported interfaces) — what to call, not how it works
- ❌ Implementation code — **never** sent to the test writer

This enforces black-box testing: tests validate the WHAT (spec behavior), not the HOW (implementation details).

### Test types

| Type | Source | Scope |
|------|--------|-------|
| **Unit** | Success criteria for a single PlanNode | Individual functions/methods against spec contracts |
| **Integration** | Cross-node success criteria | How tasks compose, using spec-defined interfaces |
| **E2E** | Definition of done + scope boundary | Full user-facing scenarios from spec |

### Pipeline position

```
Layer 3: Execute code changes (implementation)
Layer 4: Generate + run tests (spec-only visibility)  ← NEW
Layer 5: Adversarial critic review (sees code AND tests)
Layer 6: Observability enforcement
```

Tests are written after code exists (Layer 3 produces it) but before critics review (Layer 5). Critics then ALSO review test quality — did the spec-only constraint produce adequate coverage?

### Gate behavior

- **All tests green** → `subtask_tested` → Layer 5 (Critics)
- **Any test red** → rework loop back to Layer 3 (re-execute subtask)
- **Test generation failure** → `subtask_test_failed` → flag for human review

### Why this position

1. **After execution:** Tests need something to run against. Code must exist.
2. **Before critics:** Critics should review BOTH implementation and test quality. A test suite that passes trivially because it tests nothing is a critic failure.
3. **Spec-only constraint:** Tests written before seeing code would be ideal, but we need code to run tests against. The constraint is enforced by information hiding — the test writer prompt never includes implementation code, only the spec and public API signatures.

## New schemas

```typescript
// --- Layer 4: Automated QA (Black-Box) ---
export type TestCategory = "unit" | "integration" | "e2e";

export type TestCase = {
  id: string;
  category: TestCategory;
  description: string;
  spec_criterion_id: string;      // Links to SuccessCriterion.id or AntiCriterion.id
  test_code: string;               // Generated test code
  test_file_path: string;          // Where the test file is written
  expected_behavior: string;        // From spec, not implementation
};

export type TestSuite = {
  id: string;
  task_id: string;
  spec_id: string;
  cases: TestCase[];
  coverage_target: number;         // Percentage of spec criteria with tests
  generated_from: "spec_only";     // Always spec_only, never implementation
};

export type TestRunResult = {
  test_id: string;
  passed: boolean;
  actual_output: string;           // Captured from test runner
  expected_output: string;          // From spec
  failure_details?: string;
};

export type QAResult = {
  suite_id: string;
  task_id: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestRunResult[];
  coverage: number;                // % of spec criteria tested
  verdict: "pass" | "fail" | "partial";
  rework_required: boolean;        // true if any test failed
};
```

## Config addition

```typescript
qa: {
  test_runner: "vitest";           // Test runner command
  coverage_target: number;          // Minimum % of spec criteria with tests
  max_rework_rounds: number;       // Max test-failure → rework cycles
  test_types: TestCategory[];      // Which test types to generate
  spec_only: true;                 // IMMUTABLE — always true, prevents implementation leakage
};
```

`spec_only` is **immutable** — it cannot be set to `false`. This is a hard constraint, not a tuning parameter.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| No QA layer — rely on critics only | Critics can't verify runtime behavior. No test artifacts for regression. The `automated_test` verification method was hollow. |
| QA layer with implementation visibility | Test writer would game the system by matching tests to implementation details. False confidence from always-green tests that don't catch real bugs. |
| QA layer before execution (TDD) | Need runnable code to execute tests. Would require a "stub generation" step that adds complexity with no benefit — spec-only tests already enforce the behavioral contract. |
| QA layer after critics | Tests should gate critic review. If code fails basic spec tests, it shouldn't waste critic tokens. |
| Manual test writing only | Doesn't scale. Human dependency bottleneck. AI can write spec-driven tests faster. |

## Consequences

- **8-layer harness** — all layer numbers from 4 onward shift up by one
- **Spec-only is a hard architectural constraint** — the test writer prompt construction MUST NOT include implementation code. This is enforced at the code level, not just by convention.
- **Test artifacts are first-class pipeline outputs** — test files are committed alongside production code
- **Critics gain an additional review target** — they review test quality (completeness, edge coverage, no trivial passes)
- **Token budget increases** by ~3,500 per subtask for test generation + execution
- **Rework loop extends** — test failure feeds back to Layer 3 execution, not just critic failure
- **Build order adds a new phase** between Execution and Critics