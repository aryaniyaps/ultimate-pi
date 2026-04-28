# Harness Layers — Reference Index

Explicit documentation for each layer of the agent-native engineering harness.

| # | Layer | File | Principle | Status |
|---|-------|------|-----------|--------|
| 1 | Intake & Specification Hardening | [01-spec-hardening.md](01-spec-hardening.md) | Block execution until every underspecified component is resolved | Mandatory |
| 2 | Structured Planning | [02-structured-planning.md](02-structured-planning.md) | Machine-readable task DAG reviewed before code begins | Mandatory |
| 3 | MVC Execution & Grounding | [03-mvc-execution-grounding.md](03-mvc-execution-grounding.md) | Smallest verifiable change + mandatory re-grounding against spec | Mandatory |
| 4 | Adversarial Verification | [04-adversarial-verification.md](04-adversarial-verification.md) | Critic agents attack solutions; no cooperative review | Mandatory |
| 5 | Automated Observability | [05-automated-observability.md](05-automated-observability.md) | Instrumentation is part of definition-of-done | Mandatory |
| 6 | Persistent Structured Memory | [06-persistent-memory.md](06-persistent-memory.md) | Wiki as knowledge base + Vectra semantic search + CLI; system improves via context enrichment (ADR-007) | Mandatory |
| 8 | Wiki Query Interface | [08-wiki-query-interface.md](08-wiki-query-interface.md) | Custom CLI + agent skill for querying the wiki; semantic search, CRUD, cross-references | Mandatory |
| 7 | Schema-Based Orchestration | [07-schema-orchestration.md](07-schema-orchestration.md) | Archon workflow DAG orchestrates all layers | Mandatory |

## Architecture: pi.dev extensions + Archon

```
pi.dev extensions (intelligence)          Archon workflow (orchestration)
┌──────────────────────────┐              ┌──────────────────────────┐
│ Layer 1: Spec Hardening  │◄─────────────│ harden-spec node          │
│ Layer 2: Planner         │◄─────────────│ create-plan node          │
│ Layer 3: Executor        │◄─────────────│ execute-plan loop node    │
│ Layer 4: Critics         │◄─────────────│ (inline in execute loop) │
│ Layer 5: Observability   │◄─────────────│ (inline in execute loop) │
│ Layer 6: Knowledge Base  │◄─────────────│ capture-memory node      │
│   (Wiki + Vectra + CLI)  │              │                            │
└──────────────────────────┘              └──────────────────────────┘
         │                                          │
         │            wiki/                          │
         │  ┌──────────────────────────┐            │
         │  │ decisions/, patterns/    │            │
         │  │ specs/, plans/, etc.     │            │
         │  │ (.md files + frontmatter)│            │
         │  └──────────────────────────┘            │
         │  .pi/wiki-search/ (Vectra index)          │
         │                                          │
         └──────────── Archon invokes pi.dev tools ──┘
```

## Pipeline flow (mandatory, always-on)

```
User request
  → [L1] harden-spec → resolve ambiguities → spec_hardened
  → [L2] create-plan → review-plan → approve-plan → plan_approved
  → [Archon] orchestrate via workflow YAML
    → [L3] execute-next-task (grounding checkpoints)
      → subtask_completed
        → [L4] run-critics → subtask_verified or subtask_failed
          → if verified: [L5] enforce-observability → subtask_observable
          → if failed: rework loop (Archon loop node)
    → ALL_TASKS_COMPLETE
  → [L6] capture-memory → store patterns + decisions (wiki/ .md + Vectra index)
```

## Knowledge base (Layer 6)

Layer 6 uses the **project wiki** (`wiki/` directory) with **Vectra semantic search** and a **custom CLI**:
- Each knowledge entry is a `.md` file with YAML frontmatter in `wiki/` (decisions, patterns, specs, etc.)
- Open in any editor, browse on GitHub, or query via `wiki` CLI
- Vectra provides hybrid BM25 + vector similarity search
- Local embedding model (`all-MiniLM-L6-v2`, ~80MB, one-time download)
- Falls back to BM25-only if embedding model is unavailable
- Agent skill (`.pi/skills/wiki/`) provides CLI-based access
- See `wiki/layers/08-wiki-query-interface.md` for CLI and skill specs
- See `wiki/decisions/ADR-007-wiki-as-knowledge-base.md` for design rationale

## Key principle

**No skip.** Verification is mandatory. Agent confidence is not evidence. Every layer runs for every task. Config tunes behavior within layers (e.g., which critics to run, how often to ground), but cannot disable layers.

## Cross-cutting references

- **Implementation plan:** [../harness-implementation-plan.md](../harness-implementation-plan.md)
- **ADR-002** (7-layer architecture): [../decisions/002-agentic-harness-7-layers.md](../decisions/002-agentic-harness-7-layers.md)
- **ADR-003** (superseded — JSONL persistence): [../decisions/003-persistence-layer.md](../decisions/003-persistence-layer.md)
- **ADR-004** (superseded — Obsidian vault): [../decisions/004-knowledge-base-obsidian-vectra.md](../decisions/004-knowledge-base-obsidian-vectra.md)
- **ADR-006** (git-sync skill): [../decisions/ADR-006-git-sync-skill.md](../decisions/ADR-006-git-sync-skill.md)
- **ADR-007** (current — wiki as knowledge base): [../decisions/ADR-007-wiki-as-knowledge-base.md](../decisions/ADR-007-wiki-as-knowledge-base.md)
- **Config:** `.pi/harness.json` (tuning only, no enable/disable)
- **Archon workflows:** `.archon/workflows/harness-pipeline.yaml`