# 0001 - Establish project wiki and decision record format

- Date: 2026-04-25
- Status: Accepted

## Context
Execution model requires project wiki and documented design decisions.
No wiki existed in repository.

## Alternatives
1. Keep decisions in ad-hoc commit messages.
2. Store decisions in a single PLAN.md section.
3. Create dedicated wiki/ with ADR-style files.

## Chosen option
Create wiki/ with numbered decision files in wiki/decisions/.

## Rationale
- Gives stable place for all implementation decisions.
- Scales better than one growing plan file.
- Easy to reference before each code change.

## Consequences
- Every implementation change must cite relevant decision docs.
- Small overhead: keep decision log updated.
