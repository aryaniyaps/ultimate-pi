---
type: module
title: Harness-Wiki Skill Mapping
status: active
created: "2026-04-28"
updated: "2026-04-28"
tags: [module, harness, wiki, skills, integration, pipeline]
sources:
  - "[[adr-010]]"
  - "[[adr-009]]"
  - "[[harness]]"
related:
  - "[[harness-wiki-pipeline]]"
  - "[[wiki-query-interface]]"
  - "[[persistent-memory]]"
---

# Harness-Wiki Skill Mapping

Exactly which Obsidian wiki skills are invoked at each pipeline stage. This is the skill→layer contract table referenced by [[adr-010]].

## Skill Inventory

| Skill | Purpose | Trigger Type |
|-------|---------|-------------|
| `wiki-query` | Read/search wiki for decisions, specs, patterns | Read (before action) |
| `wiki-ingest` | Write sources and extracted entities to wiki | Write (after change) |
| `wiki-lint` | Health check: orphans, dead links, stale claims, frontmatter gaps | Write (periodic) |
| `wiki-fold` | Rollup log entries into meta-pages | Write (periodic) |
| `save` | Capture conversation/insight as structured wiki note | Write (after insight) |
| `obsidian-markdown` | Format wiki pages with correct OFM syntax | Write (all writes) |
| `obsidian-bases` | Create dynamic database views over wiki pages | Read (dashboards) |
| `canvas` | Visual map of wiki pages and relationships | Read (exploration) |
| `autoresearch` | Deep research loop that files findings into wiki | Write (research) |
| `compress` | Compress wiki pages into caveman format for token savings | Write (periodic) |
| `defuddle` | Strip clutter from web pages before ingestion | Read (pre-process) |

## Per-Layer Skill Mapping

### L1: Spec Hardening

| Phase | Skill | Action | Detail |
|-------|-------|--------|--------|
| **Read** | `wiki-query` | Look up `decisions/` and `modules/spec-hardening` | Find existing hardening rules, ADR constraints, success criteria patterns |
| **Write** | `save` | File hardened spec as decision page | `decisions/spec-{feature}.md` with frontmatter `type: decision` |
| **Write** | `wiki-ingest` | Update `modules/spec-hardening.md` status | Add new `> [!success]` or `> [!warning]` callout |
| **Format** | `obsidian-markdown` | Ensure all spec pages use correct OFM | Wikilinks, callouts, frontmatter |

### L2: Structured Planning

| Phase | Skill | Action | Detail |
|-------|-------|--------|--------|
| **Read** | `wiki-query` | Look up `flows/`, `modules/structured-planning` | Prior plans, DAG patterns, proven task decomposition |
| **Read** | `wiki-query` | Deep search for related ADRs | Cross-reference all decisions that affect the plan |
| **Write** | `save` | File approved plan as flow page | `flows/plan-{feature}.md` with frontmatter `type: flow`, `plan_status: approved` |
| **Write** | `wiki-ingest` | Update `modules/structured-planning.md` | Add plan reference, update status |
| **Format** | `obsidian-markdown` | All plan pages use OFM | Task DAG in code blocks, wikilinks to dependencies |

### L3: Grounding Checkpoints

| Phase | Skill | Action | Detail |
|-------|-------|--------|--------|
| **Read** | `wiki-query` | Quick search `hot.md` for current session context | Am I drifting from the approved plan? |
| **Write** | `wiki-ingest` | Record checkpoint in `log.md` | Append entry with checkpoint type, task_id, pass/fail |
| **Write** | `save` | If drift detected, file failure pattern | `modules/{feature}.md` with `> [!contradiction]` callout |
| **Write** | `save` | If checkpoint passed, update hot.md | Refresh recent context with current state |

### L4: Adversarial Verification

| Phase | Skill | Action | Detail |
|-------|-------|--------|--------|
| **Read** | `wiki-query` | Look up `decisions/adr-008` and relevant specs | Tests must come from spec ONLY — never from implementation |
| **Read** | `wiki-query` | Look up `modules/adversarial-verification` | Attack patterns, focus areas, retry limits |
| **Write** | `save` | File verified success patterns | `modules/{feature}.md` with `status: mature` frontmatter |
| **Write** | `save` | File failure patterns with critic findings | `modules/{feature}.md` with `> [!contradiction]` callout |
| **Write** | `wiki-ingest` | Update `modules/adversarial-verification.md` | Add attack results to findings section |

### L5: Automated Observability

| Phase | Skill | Action | Detail |
|-------|-------|--------|--------|
| **Read** | `wiki-query` | Look up `modules/automated-observability` | Existing metric definitions, alert conditions |
| **Write** | `save` | File observability decision | `decisions/observability-{feature}.md` with metric definitions |
| **Write** | `wiki-ingest` | Update `modules/automated-observability.md` | Add new metrics, update verification table |

### L6: Persistent Memory (Already Wiki-Native)

| Phase | Skill | Action | Detail |
|-------|-------|--------|--------|
| **Read** | `wiki-query` | Standard/deep search per depth table | See [[persistent-memory]] three-depth mode |
| **Write** | `save` | File decisions, patterns, events | Per "Write Patterns by Layer" table in [[persistent-memory]] |
| **Write** | `wiki-query` | Update `hot.md` | Every session start / shutdown per event hooks |
| **Write** | `wiki-ingest` | Batch entity/concept extraction | After research or multi-source ingestion |
| **Periodic** | `wiki-lint` | Health check every 10-15 writes | Per lint schedule in [[wiki-query-interface]] |
| **Periodic** | `wiki-fold` | Rollup log entries | After 8+ entries per [[adr-010]] contract |
| **Periodic** | `compress` | Compress high-token pages | When hot.md or frequent pages exceed token budget |

### L7: Schema Orchestration

| Phase | Skill | Action | Detail |
|-------|-------|--------|--------|
| **Read** | `wiki-query` | Look up `modules/schema-orchestration` and `flows/` | Pipeline definitions, wave tracking, status |
| **Write** | `wiki-ingest` | Update orchestration page per wave completion | Status transitions, replan events |
| **Enforcement** | L7 extension hooks | **Block wiki-skip**: if no wiki-query precedes an action, reject it | This is the enforcement point for [[adr-010]] |

### L8: Wiki Query Interface (Already Wiki-Native)

| Phase | Skill | Action | Detail |
|-------|-------|--------|--------|
| **Read** | `wiki-query` | Primary search interface per depth table | See [[wiki-query-interface]] |
| **Read** | `obsidian-bases` | Dashboard views over wiki pages | Status dashboards, dependency views |
| **Read** | `canvas` | Visual exploration of page relationships | Architecture maps, dependency graphs |
| **Write** | `save` | File deep-query results | `questions/research-{topic}.md` |

## Cross-Cutting Skills

These skills operate across layers, not tied to a specific stage:

| Skill | When | Why |
|-------|------|-----|
| `autoresearch` | Before L1-L2 for unknown domains | Fills gaps in wiki before spec hardening begins |
| `defuddle` | Before `wiki-ingest` for web sources | Strips clutter, saves 40-60% tokens on ingestion |
| `compress` | When any wiki page exceeds token budget | Keeps L6 reads efficient |
| `wiki-fold` | After 8+ entries in `log.md` | Prevents log bloat, creates fold summaries |
| `canvas` | On-demand for visual architecture | Architecture diagrams, dependency maps |

## Enforcement Points

The harness enforces the read-first/write-after contract at two chokepoints:

1. **L7 Schema Orchestration**: Before dispatching any layer, the orchestrator checks that `wiki-query` has been called for the relevant pages. If not, it inserts a read step.
2. **Extension hooks**: Every `extensions/harness-*.ts` file must call the appropriate wiki skill before/after its layer logic. The hook pattern is:
   - `pre_action`: Call `wiki-query` for relevant docs
   - `post_action`: Call `save` or `wiki-ingest` to persist outcomes
   - `periodic`: Call `wiki-lint` every 10-15 writes