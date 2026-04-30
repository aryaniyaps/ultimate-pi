---
type: meta
title: "Hot Cache"
updated: 2026-04-30T14:00:00
created: 2026-04-30
tags: []
status: active
---

# Recent Context

## Last Updated
2026-04-30. Major consolidation: all research integrated into master harness plan. Duplication resolved. Unified frameworks created.

## Consolidation Summary (2026-04-30)

**Completed**: Full first-principles consolidation of ALL April 2026 research into the harness pipeline.

### New Pages Created

- [[harness-control-frameworks]] — Unified view: H-Formalism + Feedforward-Feedback + Generator-Evaluator as orthogonal dimensions
- [[drift-detection-unified]] — Three complementary drift paradigms (L2.5 tool-call, L3 spec, L4 implementation) with clear boundaries
- [[think-in-code-enforcement]] — Formal L3 module for mandatory code-over-data paradigm with 3-layer enforcement architecture

### Pages Significantly Updated

- [[harness-implementation-plan]] — Complete rewrite: 27 properly-numbered build phases (P0-P27 + F1-F3 future), single authoritative token budget (~15K-16K/subtask), all tools/research integrated, proper phase-to-layer mapping
- [[harness]] — Updated to reflect L2.5 drift monitor, cross-cutting tool enhancements, formal models, token budget
- [[index]] — Full reorganization: harness pipeline section, formal models, concepts grouped by domain (execution/drift, context/search, agent architecture), all 30+ concepts listed
- [[adr-011]] — Updated status to "accepted", integrated iMAD selective routing findings, revised token budget (always-debate ~13K → selective ~3K avg), pre-debate gating mechanism
- [[model-adaptive-harness]] — Restructured as canonical entry point with pointer to [[harness-configuration-layers]] for detailed tables. Added Gemini column. Removed redundancy.

### Duplication/Redundancy Resolved

1. **Layer numbering**: Old Phase 1-19 numbering replaced with P0-P27 mapped to layers. L2.5 properly placed. Phase 12 no longer collides with layer L3.
2. **Drift detection**: Three overlapping concepts (L3 grounding, L2.5 meta-agent, L4 adversarial) unified in [[drift-detection-unified]] with clear "why three" justification.
3. **Token budget**: Scattered across 4+ pages → single table in [[harness-implementation-plan]].
4. **Model profiles**: [[model-adaptive-harness]] and [[harness-configuration-layers]] de-duplicated — former is entry point, latter is detailed tables.
5. **Control frameworks**: H-formalism, feedforward-feedback, generator-evaluator unified in [[harness-control-frameworks]] as orthogonal dimensions.
6. **ADR-011 staleness**: Updated from always-debate to selective routing per iMAD findings.
7. **Index freshness**: All ~30 concept pages now listed. Previously missing ~7.

### New Tools in Pipeline

| Tool | Phase | Status |
|------|-------|--------|
| ck (semantic code search) | P13 | Planned — MCP integration + 3-layer enforcement |
| Gitingest (bulk ingestion) | P15 | Planned — `/gitingest` skill |
| pi-messenger (stripped) | P17 | Planned — debate transport layer |
| pi-lean-ctx (native) | F0 | Done — [[2026-04-30-pi-lean-ctx-native]] |

### Key New Paradigms

- **Think-in-Code enforcement** now has its own L3 module with 3-layer architecture (system prompt → interception → compression)
- **Selective debate routing** (iMAD) reduces consensus debate cost by ~92% on high-confidence tasks
- **Context drift as positive feedback loop** — each failed attempt accelerates failure. Meta-agent breaks the loop (detect → prune → restart).
- **Three quality concerns, three timings**: Syntax (inline, blocks progress), Semantics (L4, needs LLM), Style (Phase 16 final gate, deterministic)

### Token Budget (Unified, Per Subtask)

- ~15,000-16,000 total pipeline overhead (down from ~17,500 baseline)
- Savings: AST truncation (30-50%), fuzzy edits (5-15%), inline validation (10-20%), Haiku router (15-25%), selective debate (92% on ~80% tasks), Think-in-Code (30-200× on analysis)

### Active Architecture

```
L1: Spec → L2: Plan → L2.5: Drift Monitor → L3: Execute (+TiC, +AST, +Fuzzy, +Inline, +ck, +Gitingest)
  → L4: Adversarial (+selective debate) → Phase 16: Lint+Format → L5: Observe → L6: Memory → L7: Orch → L8: Query
```

Formal models: H=(E,T,C,S,L,V) + Feedforward-Feedback + Generator-Evaluator. All mapped to our pipeline in [[harness-control-frameworks]].
