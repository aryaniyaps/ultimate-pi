---
type: index
title: Consensus Records
created: 2026-04-30
updated: 2026-04-30
status: active
tags: [consensus, debate, alignment, index]
related:
  - "[[consensus-debate]]"
  - "[[adr-011]]"
  - "[[harness-implementation-plan]]"
---

# Consensus Records

Permanent alignment records for all agent debates. **Every debate verdict — win, lose, or deadlock — is filed here.**

Future agents query this directory before forming positions. Contradicting a filed consensus triggers a harness block (L7 enforcement).

## Directory Convention

- Filename: `[layer]-[topic-slug].md`
- Layers: `spec` (L1), `plan` (L2), `verify` (L4)
- Example: `spec-idempotency-key-design.md`

## Consensus Page Template

```markdown
---
type: consensus
layer: spec | plan | verify
verdict: CONSENSUS_REACHED | DEADLOCK | BUDGET_EXHAUSTED | TIMEOUT
date: YYYY-MM-DD
participants: [agent-a, agent-b]
topic: "Brief description"
related: page-refs (wikilinks to related pages)
---

# [Topic]

## Final Position
[The winning / final agreed position]

## Key Rounds Summary
| Round | Attacker | Defender | Outcome |
|-------|----------|----------|---------|
| 1 | ... | ... | ... |

## Evidence References
- (wikilinks to evidence sources)

## Rationale
Why this consensus was reached. What was settled.
```

## No records yet

Consensus filing begins with Phase P19b of the [[harness-implementation-plan]].
