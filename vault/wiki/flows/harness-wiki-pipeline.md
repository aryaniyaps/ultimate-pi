---
type: flow
title: Harness-Wiki Pipeline
status: active
created: "2026-04-28"
updated: "2026-04-28"
tags: [flow, harness, wiki, pipeline, integration, read-first, write-after]
sources:
  - "[[adr-010]]"
  - "[[harness-wiki-skill-mapping]]"
related:
  - "[[harness]]"
  - "[[persistent-memory]]"
  - "[[wiki-query-interface]]"
  - "[[schema-orchestration]]"
---

# Harness-Wiki Pipeline

The exact data flow between the harness pipeline and the wiki vault. Implements [[adr-010]]: read-first, write-after, no-staleness.

## Core Contract

```
┌─────────────────────────────────────────────────┐
│              HARNESS LAYER ACTION                 │
│                                                   │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│   │ READ WIKI │ →  │  LAYER   │ →  │ WRITE    │   │
│   │ (query)   │    │  LOGIC   │    │ WIKI     │   │
│   └──────────┘    └──────────┘    └──────────┘   │
│         ↑                              ↓         │
│    ADRs, specs,              Decisions, patterns, │
│    patterns, status           events, statuses   │
└─────────────────────────────────────────────────┘
```

**Invariant**: No layer acts without reading. No layer completes without writing.

## Read-First Protocol

Before any layer executes, the following wiki reads happen:

### Session Bootstrap (once per session)

| Step | Skill | Target | Purpose |
|------|-------|--------|---------|
| 1 | `wiki-query` quick | `hot.md` | Load recent context (~500 tokens) |
| 2 | `wiki-query` quick | `index.md` | Know what pages exist (~1000 tokens) |
| 3 | `wiki-query` standard | ADRs in `decisions/` | Load active constraints |
| 4 | `compress` | If hot.md > 600 words | Trim to stay under token budget |

### Per-Layer Read

| Layer | Mandatory Wiki Reads | Skill | Depth |
|-------|---------------------|-------|-------|
| L1 | `decisions/adr-008`, `modules/spec-hardening`, any existing spec for feature | `wiki-query` standard | Standard |
| L2 | `flows/plan-*`, `modules/structured-planning`, all ADRs from L1 | `wiki-query` deep | Deep |
| L3 | `hot.md` (current checkpoint state), `flows/plan-{feature}` | `wiki-query` quick | Quick |
| L4 | `decisions/adr-008`, `modules/adversarial-verification`, L1 spec | `wiki-query` standard | Standard |
| L5 | `modules/automated-observability`, L1 spec | `wiki-query` standard | Standard |
| L6 | Per depth table in [[persistent-memory]] | `wiki-query` | Variable |
| L7 | `modules/schema-orchestration`, `flows/plan-*` | `wiki-query` standard | Standard |
| L8 | Per depth table in [[wiki-query-interface]] | `wiki-query` | Variable |

**Failure mode**: If `wiki-query` returns no relevant ADR for a layer that requires one, the layer MUST halt and request the user create the missing ADR before proceeding.

## Write-After Protocol

After every state transition, the following wiki writes happen:

### Per-Layer Write Matrix

| Layer | Event | Wiki Write | Skill | Target Page |
|-------|-------|-----------|-------|-------------|
| L1 | Spec hardened | Decision + callout | `save` | `decisions/spec-{feature}.md` |
| L1 | Ambiguity resolved | Decision | `save` | `decisions/spec-{feature}.md` |
| L2 | Plan approved | Flow page | `save` | `flows/plan-{feature}.md` |
| L2 | Plan rejected | Failure pattern | `save` | `modules/{feature}.md` with `> [!contradiction]` |
| L3 | Checkpoint passed | Log entry + hot.md | `wiki-ingest` + `save` | `log.md` + `hot.md` |
| L3 | Drift detected | Failure pattern | `save` | `modules/{feature}.md` with `> [!contradiction]` |
| L4 | Subtask verified | Success pattern | `save` | `modules/{feature}.md` with `status: mature` |
| L4 | Subtask failed | Failure pattern | `save` | `modules/{feature}.md` with `> [!contradiction]` |
| L4 | QA test results | Decision + metrics | `save` | `decisions/qa-{feature}.md` |
| L5 | Observability defined | Decision | `save` | `decisions/observability-{feature}.md` |
| L5 | Metric verified | Module update | `wiki-ingest` | `modules/automated-observability.md` |
| L6 | Memory write | Per event hooks table | `save` / `wiki-ingest` | Per [[persistent-memory]] mapping |
| L7 | Wave completed | Orchestration status | `wiki-ingest` | `modules/schema-orchestration.md` |
| L7 | Replan triggered | Log entry + flow update | `wiki-ingest` | `log.md` + `flows/plan-{feature}.md` |
| L8 | Deep query answered | Synthesis page | `save` | `questions/research-{topic}.md` |

### Session Shutdown (once per session)

| Step | Skill | Target | Purpose |
|------|-------|--------|---------|
| 1 | `save` | `hot.md` | Update recent context for next session |
| 2 | `wiki-ingest` | `log.md` | Append shutdown entry |
| 3 | `wiki-lint` | Full vault | Catch staleness, orphans, dead links |
| 4 | `wiki-fold` | `wiki/folds/` | If 8+ entries since last fold, run fold |

## Staleness Elimination Rules

These rules guarantee no wiki page goes stale:

### Rule 1: Status Propagation
When a module's implementation status changes (e.g., `status: developing` → `status: active`), the module page frontmatter MUST be updated in the same pipeline step.

### Rule 2: Decision Referencing
When a new ADR supersedes or modifies an existing one:
- The new ADR MUST have `supersedes: old-adr` in frontmatter
- The old ADR MUST have `superseded_by: new-adr` and `status: superseded` updated
- `index.md` MUST reflect the change

### Rule 3: Cross-Reference Integrity
When `save` creates a new page, it MUST:
- Add wikilinks to all related pages mentioned in frontmatter
- Add a backlink entry in each referenced page (or flag for `wiki-lint` to catch)
- Update `index.md` with the new entry

### Rule 4: Contradiction Resolution
When `wiki-lint` detects a contradiction between pages:
- Both pages get `> [!contradiction]` callouts
- A `questions/contradiction-{topic}.md` page is created
- The next L7 orchestration step MUST resolve it before proceeding

### Rule 5: Hot Cache Freshness
`hot.md` is overwritten completely at:
- Session start (read from wiki state)
- Every L3 checkpoint (update with current state)
- Session shutdown (write final state)

Hot.md MUST never be older than the last completed L3 checkpoint.

### Rule 6: Lint Schedule
`wiki-lint` runs:
- After every 10-15 wiki writes (counter tracked by L7)
- At session shutdown
- On explicit user request

Lint output goes to `wiki/meta/lint-report-YYYY-MM-DD.md`.

### Rule 7: Index Synchronization
`index.md` is updated:
- After every `save` that creates a new page
- After every `wiki-ingest` batch
- After every `wiki-lint` that removes or merges pages
- Never manually — always through skills

## Extension Hook Implementation

Each `extensions/harness-*.ts` file implements this pattern:

```typescript
// Pre-action: read wiki
const wikiContext = await wikiQuery({
  depth: 'standard',
  targets: ['decisions/', `modules/${layerName}`],
});

// Validate: ensure we have the ADRs we need
if (requiredADRs.some(adr => !wikiContext.hasADR(adr))) {
  throw new HarnessError('MISSING_ADR', 'Required ADR not found in wiki');
}

// Execute: layer logic
const result = await layerLogic(input, wikiContext);

// Post-action: write wiki
await save({
  type: result.writeType,
  title: result.writeTitle,
  content: result.writeContent,
  related: result.relatedPages,
});

// Update: hot cache if significant
if (result.affectsHotCache) {
  await updateHotCache(result);
}

// Increment: write counter for lint scheduling
writeCounter++;
if (writeCounter >= 10) {
  await wikiLint();
  writeCounter = 0;
}
```

## Token Budget Impact

| Activity | Tokens | Frequency |
|----------|--------|-----------|
| Session bootstrap reads | ~3,000 | 1/session |
| Per-layer reads | ~500-3,000 | Per subtask x layers |
| Per-layer writes | ~500-1,500 | Per subtask x events |
| Lint runs | ~2,000 | Every 10-15 writes |
| Hot cache updates | ~500 | Per checkpoint |
| Fold runs | ~1,000 | After 8+ log entries |
| **Added per subtask** | **~3,000-6,000** | On top of existing ~17,500 |

New total per subtask: **~20,500-23,500 tokens**.
New total for 5-subtask plan: **~102,500-117,500 tokens** overhead.

This is a ~20-35% increase over the pre-integration budget, but eliminates the risk of design drift and wiki staleness entirely.
