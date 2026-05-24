---
name: small-change-discipline
description: Keep coding-agent edits surgical and reversible. Use when implementing any code change, bug fix, refactor, or cleanup where scope control matters. Enforces inspect-before-edit, minimal diffs, existing style preservation, unrelated-issue isolation, and targeted verification.
---

# Small Change Discipline

Use this skill to keep implementation work narrow, understandable, and safe.

## Operating rules

1. Restate the requested behavior and the exact files/areas likely affected.
2. Inspect existing code before editing. Do not infer conventions from memory.
3. Change the fewest files and smallest code regions that satisfy the request.
4. Preserve existing naming, formatting, layering, and error-handling style unless the task requires changing them.
5. Do not mix feature work, refactoring, formatting, dependency updates, and cleanup in one change unless explicitly requested.
6. If you discover unrelated defects, report them separately instead of fixing them opportunistically.
7. Prefer targeted verification over broad slow checks unless risk requires broader coverage.

## Workflow

1. Identify the requested outcome and non-goals.
2. Locate the smallest existing extension point.
3. Make the minimal implementation change.
4. Add or update only tests/docs directly tied to the behavior.
5. Review the diff for accidental broadening.
6. Run the narrowest useful checks.

## Self-check

- Did I edit only files needed for the request?
- Did I preserve existing public contracts unless asked to change them?
- Did I avoid drive-by cleanup?
- Can each changed line be explained by the user request?
- Did verification match the risk of the change?
