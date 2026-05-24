---
name: test-strategy
description: Choose the right test level for a code change. Use when adding features, fixing bugs, refactoring, changing contracts, or improving coverage. Guides unit, integration, contract, characterization, regression, property, and end-to-end test selection without assuming a specific tool or runtime.
---

# Test Strategy

Use this skill to add useful tests rather than merely more tests.

## Choose test type by risk

- Unit test: pure logic, calculations, policies, branching, invariants.
- Integration test: storage, filesystem, network, process, or platform/runtime boundary.
- Contract test: public API, command, event, plugin, module facade, or service boundary.
- Characterization test: existing unclear behavior before legacy changes.
- Regression test: bug fix that must not reappear.
- End-to-end test: critical user journey or cross-boundary behavior not covered otherwise.
- Property or generative test: broad input space with stable invariants.

## Workflow

1. Identify the behavior that must be proven.
2. Pick the lowest test level that gives confidence.
3. Test public behavior and invariants, not incidental implementation details.
4. Include edge cases: empty, missing, invalid, boundary, duplicate, reordered, and failure paths where relevant.
5. Ensure tests fail for the bug/change before relying on them.
6. Keep tests deterministic and readable.

## Avoid

- Snapshot/golden tests that hide important intent.
- Mock-heavy tests that only verify implementation choreography.
- Broad end-to-end tests for simple pure logic.
