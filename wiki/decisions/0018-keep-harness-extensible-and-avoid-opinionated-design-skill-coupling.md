# 0018 - Keep harness extensible and avoid opinionated design-skill coupling

- Date: 2026-04-25
- Status: Accepted

## Context
Roadmap now includes compounding context-layer capabilities (planning memory, indexing, retrieval).
Need clear boundary on baseline harness scope.
User intent: keep extensibility high, avoid hardwiring opinionated design skills (example: impeccable.style) into core harness behavior.

## Alternatives
1. Integrate opinionated design skills into core harness defaults.
2. Ignore design skills entirely and limit extension points.
3. Keep extensible plugin-oriented architecture, but exclude opinionated design-skill coupling from baseline roadmap.

## Chosen option
Adopt option 3: prioritize extensible harness core and context-layer infrastructure; do not bake prescriptive design skills into default harness behavior.

## Rationale
- Preserves broad applicability across teams with different design philosophies.
- Reduces lock-in to one style doctrine.
- Keeps core focused on compounding infrastructure value.

## Consequences
- Design-style skills may exist as optional add-ons, not core defaults.
- Architecture should maintain stable extension interfaces for future skill integration.
