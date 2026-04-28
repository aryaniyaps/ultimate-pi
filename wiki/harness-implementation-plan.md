# Agentic Harness Implementation Plan

## Overview

8-layer agent-native engineering harness for ultimate-pi. The pipeline is **mandatory and always-on** — every task flows through all 8 layers in sequence. No layer can be skipped. Tunable parameters control behavior within layers, not whether they run.

**Architecture:** pi.dev TypeScript extensions implement the intelligence (spec hardening, planning, QA, critics, observability, memory). Archon implements the orchestration (workflow DAG execution, worktree isolation, human approval gates, loop nodes for rework, persistent run history).

**Key principle (ADR-008):** Layer 4 (Automated QA) generates tests from the spec ONLY — never from implementation code. This prevents gaming the system and enforces black-box testing.

**Key principle (ADR-009):** Layer 7 (Memory) uses claude-obsidian skills (GitHub Mode B) for wiki operations — no custom WikiKnowledgeBase class, no Vectra, no embedding model. Agents read/write the wiki through skill-driven operations (ingest, query, lint) with LLM-native search (hot cache → index → pages).

Build order: schemas → memory → spec hardening → planner → execution+grounding → QA → critics → observability → Archon workflow.

---

## Shared Foundation

### `lib/harness-schemas.ts`

All inter-layer data contracts. Every layer validates input/output against these schemas.

```typescript
// --- Layer 1: Specification ---
export type AmbiguityFlag = {
  id: string;
  description: string;
  resolution: string | null;
  severity: "blocking" | "warning";
};

export type SuccessCriterion = {
  id: string;
  description: string;
  testable: boolean;
  verification_method: string;
};

export type AntiCriterion = {
  id: string;
  description: string;
};

export type HardenedSpec = {
  id: string;
  created_at: string;
  original_request: string;
  intent_summary: string;
  success_criteria: SuccessCriterion[];
  anti_criteria: AntiCriterion[];
  ambiguity_flags: AmbiguityFlag[];
  definition_of_done: string;
  constraints: string[];
  scope_boundary: { in_scope: string[]; out_of_scope: string[] };
  spec_version: number;
};

// --- Layer 2: Planning ---
export type PlanNode = {
  task_id: string;
  title: string;
  description: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  risk_surface: RiskEntry[];
  verification: VerificationMethod;
  status: "pending" | "in_progress" | "completed" | "failed" | "blocked";
  assigned_agent?: string;
};

export type RiskEntry = {
  component: string;
  failure_mode: string;
  likelihood: "high" | "medium" | "low";
  mitigation: string;
};

export type VerificationMethod = {
  type: "automated_test" | "manual_inspection" | "schema_validation" | "ai_critic";
  details: string;
  passed: boolean | null;
};

export type ExecutionPlan = {
  id: string;
  spec_id: string;
  created_at: string;
  nodes: PlanNode[];
  dag_valid: boolean;
  review_status: "pending" | "approved" | "rejected" | "revised";
  reviewer?: string;
  review_notes?: string;
};

// --- Layer 3: Execution ---
export type GroundingCheckpoint = {
  task_id: string;
  timestamp: string;
  spec_id: string;
  spec_version_at_checkpoint: number;
  drift_detected: boolean;
  drift_details?: string;
  state_hash: string;
  committed: boolean;
  git_sha?: string;
};

export type SubtaskResult = {
  task_id: string;
  status: "success" | "partial" | "failed";
  outputs: Record<string, any>;
  grounding: GroundingCheckpoint;
  qa_result?: QAResult;
  critic_reviews: CriticReview[];
  observability: ObservabilitySpec;
};

// --- Layer 4: Automated QA (Black-Box Testing, ADR-008) ---
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
  generated_from: "spec_only";     // Always spec_only — IMMUTABLE constraint
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

// --- Layer 5: Adversarial Verification (was Layer 4) ---
export type CriticFocus = "correctness" | "security" | "performance" | "spec_compliance";

export type CriticReview = {
  critic_id: string;
  focus: CriticFocus;
  verdict: "pass" | "fail" | "conditional_pass";
  failures: CriticFailure[];
  timestamp: string;
};

export type CriticFailure = {
  severity: "critical" | "major" | "minor";
  description: string;
  evidence: string;
  remediation: string;
};

// --- Layer 6: Observability ---
export type ObservabilitySpec = {
  metrics: MetricDefinition[];
  health_checks: HealthCheck[];
  alert_conditions: AlertCondition[];
};

export type MetricDefinition = {
  name: string;
  type: "counter" | "gauge" | "histogram";
  description: string;
  unit: string;
  instrumentation_code: string;
};

export type HealthCheck = {
  name: string;
  method: string;
  expected_result: string;
};

export type AlertCondition = {
  metric_name: string;
  threshold: string;
  action: string;
};

// --- Layer 7: Memory (claude-obsidian, ADR-009) ---
// Wiki operations are skill-driven (ingest, query, lint), not programmatic.
// The harness writes wiki entries through claude-obsidian skills.
// Search is LLM-native: hot.md → index.md → relevant pages.
// No Vectra, no embedding model, no custom search code.

export type WikiMode = "github"; // Mode B: GitHub / Repository (ADR-009)

export type WikiEntryType =
  | "module"        // wiki/modules/ — code modules, packages, services
  | "component"     // wiki/components/ — reusable UI or functional components
  | "decision"      // wiki/decisions/ — Architecture Decision Records (ADRs)
  | "dependency"    // wiki/dependencies/ — external deps, versions, risk
  | "flow";         // wiki/flows/ — data flows, request paths, auth flows

// Harness-specific entry types map to WikiEntryType + frontmatter fields:
//   success_pattern → module/component with status: mature
//   failure_pattern → module/component/flow with > [!contradiction] callout
//   spec            → decision with decision_type: spec
//   plan            → flow with plan_status frontmatter
//   checkpoint      → wiki/log.md append entry
//   review          → decision with review_* frontmatter
//   evolution_event → wiki/log.md append entry

export type WikiFrontmatter = {
  type: WikiEntryType | "source" | "entity" | "concept" | "comparison" | "question" | "meta";
  title: string;
  status: "seed" | "developing" | "mature" | "evergreen" | "deprecated";
  created: string;            // YYYY-MM-DD
  updated: string;            // YYYY-MM-DD
  tags: string[];
  related: string[];          // wikilinks [[Page Name]]
  sources: string[];          // wikilinks to .raw/ source docs
  // Mode B specific fields
  path?: string;              // e.g., "src/auth/" for modules
  language?: string;          // e.g., "typescript"
  purpose?: string;
  maintainer?: string;
  depends_on?: string[];     // wikilinks
  used_by?: string[];         // wikilinks
  // Harness-specific fields
  layer?: string;             // e.g., "Layer_4"
  spec_id?: string;           // links to HardenedSpec.id
  plan_id?: string;           // links to ExecutionPlan.id
  harness_entry_type?: string; // original harness type: success_pattern, failure_pattern, etc.
};

export type QueryMode = "quick" | "standard" | "deep";

// Quick: ~1,500 tokens (hot.md + index.md only)
// Standard: ~3,000 tokens (hot.md + index + 3-5 pages)
// Deep: ~8,000+ tokens (full wiki scan)

export type WikiStatus = {
  mode: WikiMode;
  total_entries: number;
  entries_by_type: Record<string, number>;
  hot_cache_available: boolean;
  index_available: boolean;
  last_lint?: string;         // YYYY-MM-DD of last lint report
};

// --- Layer 8: Orchestration (Archon) ---
export type AgentCapability = {
  agent_id: string;
  capabilities: string[];
  current_load: number;
  specializations: CriticFocus[];
};

export type TaskRouting = {
  task_id: string;
  routed_to: string;
  routed_at: string;
  schema_input: string;
  schema_output: string;
};
```

### `lib/harness-config.ts`

Config schema — **tuning only, no enable/disable**. The pipeline always runs.

```typescript
export type HarnessConfig = {
  // No top-level "enabled" — the harness is always on when installed
  layers: {
    spec_hardening: { max_ambiguity_retries: number; auto_resolve_warning: boolean };
    planner: { require_approval: boolean; max_plan_revisions: number };
    execution: { grounding_interval: "every_subtask" | "every_n_subtasks"; grounding_n: number };
    qa: { test_runner: string; coverage_target: number; max_rework_rounds: number; test_types: TestCategory[]; spec_only: true };
    critics: { focus_areas: CriticFocus[]; max_attack_rounds: number };
    observability: { require_metrics: boolean };
    memory: { wiki_mode: WikiMode; wiki_path: string; max_entries: number; query_mode: QueryMode };
  };
  storage: { base_dir: string };
  ai: {
    model_override?: string;
    timeout_ms: number;
    max_tokens: number;
  };
};

export const DEFAULT_CONFIG: HarnessConfig = {
  layers: {
    spec_hardening: { max_ambiguity_retries: 3, auto_resolve_warning: true },
    planner: { require_approval: true, max_plan_revisions: 3 },
    execution: { grounding_interval: "every_subtask", grounding_n: 1 },
    qa: { test_runner: "vitest", coverage_target: 0.8, max_rework_rounds: 3, test_types: ["unit", "integration", "e2e"], spec_only: true as const },
    critics: { focus_areas: ["correctness", "spec_compliance"], max_attack_rounds: 2 },
    observability: { require_metrics: true },
    memory: { wiki_mode: "github" as const, wiki_path: "wiki", max_entries: 10000, query_mode: "standard" },
  },
  storage: { base_dir: ".pi/harness" },
  ai: { timeout_ms: 30000, max_tokens: 2000 },
};
```

### `.pi/harness.json` (config template)

```json
{
  "layers": {
    "spec_hardening": { "max_ambiguity_retries": 3, "auto_resolve_warning": true },
    "planner": { "require_approval": true, "max_plan_revisions": 3 },
    "execution": { "grounding_interval": "every_subtask", "grounding_n": 1 },
    "qa": { "test_runner": "vitest", "coverage_target": 0.8, "max_rework_rounds": 3, "test_types": ["unit", "integration", "e2e"], "spec_only": true },
    "critics": { "focus_areas": ["correctness", "spec_compliance"], "max_attack_rounds": 2 },
    "observability": { "require_metrics": true },
    "memory": { "wiki_mode": "github", "max_entries": 10000, "query_mode": "standard", "wiki_path": "wiki" }
  },
  "storage": { "base_dir": ".pi/harness" },
  "ai": { "timeout_ms": 30000, "max_tokens": 2000 }
}
```

---

## Layer 7 — Persistent Structured Knowledge Base (claude-obsidian)

**Why first:** Every other layer reads/writes memory. Build the substrate before the consumers.

**Layer 7 reads/writes the wiki.** Harness integration writes to `wiki/` via [claude-obsidian](https://github.com/AgriciDaniel/claude-obsidian) skills operating in GitHub Mode (Mode B). No custom `WikiKnowledgeBase` class, no Vectra, no embedding model.

**Key change (ADR-009):** Replaces ADR-007's custom `WikiKnowledgeBase` + Vectra search stack with claude-obsidian's skill-driven operations. The wiki is an Obsidian-compatible vault using wikilinks, YAML frontmatter, `.raw/` immutable sources, `hot.md` cross-session cache, `index.md` master catalog, and `log.md` operation audit trail. Search is LLM-native (read hot.md → index.md → relevant pages), not vector-based.

### Why claude-obsidian Mode B

| Capability | Before (ADR-007) | After (ADR-009) |
|------------|-------------------|------------------|
| Cross-session memory | None (every session starts blank) | `wiki/hot.md` ~500-word recent context cache |
| Source provenance | No source tracking | `.raw/` immutable sources + manifest delta tracking |
| Repository knowledge | Flat `patterns/` directories | Mode B: `modules/`, `components/`, `decisions/`, `dependencies/`, `flows/` |
| Search | Vectra hybrid BM25+vector, ~80MB model | LLM-native: hot.md → index.md → pages (3 depth modes) |
| Lint / health checks | None | 8+ category lint: orphans, dead links, stale claims, frontmatter gaps |
| Contradiction flagging | None | `> [!contradiction]` callouts on conflicting entries |
| Batch ingest | One-at-a-time | Parallel with delta tracking via `.raw/.manifest.json` |
| Cross-references | Plain markdown links | Wikilinks `[[Page Name]]` + bidirectional backlinks |
| Dependencies | `vectra` + `transformers` + model (~87MB) | Skills (~50KB) + optional `ollama` (~300MB) |

### Files

- `.pi/skills/wiki/SKILL.md` — Harness-specific override: triggers, entry type mapping, conventions
- `extensions/harness-knowledge-base.ts` — Extension: registers tools, commands, event hooks; invokes wiki skills
- Wiki skills installed via `npx skills add Ar9av/obsidian-wiki --yes` (24 skills: wiki-setup, wiki-ingest, wiki-query, wiki-lint, wiki-status, wiki-rebuild, wiki-update, wiki-capture, wiki-research, wiki-export, wiki-dashboard, wiki-synthesize, wiki-history-ingest, claude-history-ingest, codex-history-ingest, hermes-history-ingest, openclaw-history-ingest, data-ingest, cross-linker, tag-taxonomy, graph-colorize, llm-wiki, skill-creator)
- Obsidian formatting skills installed via `npx skills add kepano/obsidian-skills --yes` (5 skills: obsidian-markdown, obsidian-bases, json-canvas, obsidian-cli, defuddle)

### Wiki structure (Mode B: GitHub / Repository)

```
wiki/
  index.md                # Master catalog of all wiki pages
  log.md                  # Append-only operation log
  hot.md                  # Hot cache: ~500-word recent context summary
  overview.md             # Executive summary of the entire wiki
  decisions/              # Architecture Decision Records (ADRs)
  modules/                # One note per major module / package / service
  components/             # Reusable UI or functional components
  dependencies/           # External deps, versions, risk assessment
  flows/                  # Data flows, request paths, auth flows
  sources/                # One summary page per .raw/ source document
  entities/               # People, orgs, products, repos
  concepts/               # Ideas, patterns, frameworks
  meta/                   # Dashboards, lint reports, conventions
  harness-implementation-plan.md
  layers/                  # Layer docs (existing)

.raw/                     # Immutable source documents
  articles/
  .manifest.json           # Delta tracking: hash, ingested_at, pages_created
```

### Harness entry type → Mode B mapping

| Harness `EntryType` | Mode B location | Frontmatter type | Notes |
|----------------------|-----------------|------------------|-------|
| `decision` | `wiki/decisions/` | `decision` | Direct match |
| `success_pattern` | `wiki/modules/` or `wiki/components/` | `module` or `component` | Add `status: mature`, `harness_entry_type: success_pattern` |
| `failure_pattern` | `wiki/modules/` or `wiki/flows/` | `module` or `flow` | Add `status: deprecated`, `> [!contradiction]` callout |
| `spec` | `wiki/decisions/` | `decision` | Add `decision_type: spec`, `spec_id` frontmatter |
| `plan` | `wiki/flows/` | `flow` | Add `plan_status` frontmatter |
| `checkpoint` | `wiki/log.md` append | N/A | Logged as operation entry in log.md |
| `review` | `wiki/decisions/` | `decision` | Add `review_*` frontmatter |
| `evolution_event` | `wiki/log.md` append | N/A | Logged as operation entry in log.md |

### Search strategy (LLM-native, no Vectra)

Search is done by reading files in order — no vector index, no embedding model.

| Query mode | Reads | Token cost | When to use |
|------------|-------|------------|-------------|
| `quick` | `wiki/hot.md` + `wiki/index.md` only | ~1,500 | Simple factual lookups |
| `standard` (default) | `wiki/hot.md` → `wiki/index.md` → 3-5 relevant pages | ~3,000 | Most harness decisions |
| `deep` | Full wiki + optional web | ~8,000+ | Synthesis, gap analysis, comparisons |

**Why this works:**
- `wiki/hot.md` provides cross-session continuity at ~500 words — the biggest gap in ADR-007
- `wiki/index.md` is a structured catalog with page titles, types, and one-line descriptions
- Wikilinks `[[Page Name]]` enable traversal to 2 levels of depth
- LLMs are the search engine — no model-specific embeddings needed for ≤10k entries
- For large wikis (>10k entries), DragonScale semantic tiling (local `ollama` + `nomic-embed-text`) is available as an opt-in lint feature

### Ingest operation (from wiki-ingest skill)

When the harness writes a pattern/decision/evolution event:

```
Harness event (spec_hardened, plan_approved, subtask_verified, etc.)
    ↓
Determine harness entry type → map to Mode B type + directory
    ↓
Create/update wiki page in correct directory with frontmatter
    ↓
Update wiki/index.md — add entry for new page
    ↓
Update wiki/hot.md — overwrite with recent context
    ↓
Append to wiki/log.md — new entry at TOP
    ↓
Check for contradictions — add > [!contradiction] callouts if needed
```

### Query operation (from wiki-query skill)

When another harness layer reads the wiki before a decision:

```
Quick: Read hot.md → answer immediately if found (~1,500 tokens)
Standard: Read hot.md → index.md → 3-5 pages → synthesize (~3,000 tokens)
Deep: Read hot.md → index.md → scan all relevant pages → synthesize (~8,000+ tokens)
```

### Lint operation (from wiki-lint skill)

After every 10-15 writes, or on demand:

1. Orphan pages (no inbound wikilinks)
2. Dead links (wikilinks to non-existent pages)
3. Stale claims (older assertions contradicted by newer sources)
4. Missing pages (concepts mentioned but no page exists)
5. Missing cross-references (mentions without wikilinks)
6. Frontmatter gaps (missing type, status, created, updated, tags)
7. Empty sections (headings with no content)
8. Stale index entries (items pointing to renamed/deleted pages)

Output: `wiki/meta/lint-report-YYYY-MM-DD.md`

### Extension behavior

- `session_start`: Read `wiki/hot.md` to get recent context; scaffold wiki if not initialized
- `session_shutdown`: Update `wiki/hot.md` with session context; append to `wiki/log.md`
- Tool: `harness-search` — trigger wiki-query skill (quick/standard/deep mode)
- Tool: `harness-kb-store` — trigger wiki-ingest skill for pattern/decision/evolution
- Tool: `harness-kb-retrieve` — read a specific wiki page by name or path
- Command: `/harness-kb-status` — show wiki status: entry counts, hot cache, last lint
- Command: `/harness-wiki-lint` — trigger wiki-lint skill for health check
- Hook on `turn_end`: Auto-capture decision rationale to wiki/decisions/
- Hook on `spec_hardened`: Store spec as decision with `decision_type: spec`
- Hook on `plan_approved`: Store plan as flow with `plan_status: approved`
- Hook on `subtask_completed`: Append checkpoint to wiki/log.md
- Hook on `subtask_verified`: Store success pattern as module/component with `status: mature`
- Hook on `subtask_failed`: Store failure pattern with `> [!contradiction]` callout

### Frontmatter schema (Mode B + harness extensions)

```yaml
---
type: module              # module | component | decision | dependency | flow
status: active            # seed | developing | mature | evergreen | deprecated
path: "src/auth/"         # for modules/components
language: typescript       # for modules/components
purpose: ""
maintainer: ""
last_updated: 2026-04-28
depends_on: []
used_by: []
tags: [module]
created: 2026-04-28
updated: 2026-04-28
# Harness-specific extensions
layer: "Layer_4"           # which harness layer produced this
spec_id: "SPEC-abc123"    # links to HardenedSpec.id
plan_id: "PLAN-def456"    # links to ExecutionPlan.id
harness_entry_type: "success_pattern"  # original harness type
related:
  - "[[Architecture Overview]]"
sources:
  - "[[.raw/articles/source.md]]"
---
```

### Dependencies

| Component | Source | Purpose |
|-----------|--------|---------|
| obsidian-wiki skills (24) | `npx skills add Ar9av/obsidian-wiki --yes` | Wiki operations: ingest, query, lint, setup, status, rebuild, update, capture, research, export, dashboard, synthesize, cross-linker, tag-taxonomy, history-ingest, etc. |
| obsidian-skills (5) | `npx skills add kepano/obsidian-skills --yes` | Obsidian formatting: markdown syntax, bases, canvas, CLI, defuddle |
| Obsidian app (optional) | Free | Human browsing, graph view, backlinks, properties panel |
| `ollama` + `nomic-embed-text` (optional) | ~300MB | QMD semantic search for large wikis |
| `qmd` MCP server (optional) | ~10MB | Local lex+vec search over wiki + sources |

**Removed dependencies:** `vectra` (~1.8MB), `@huggingface/transformers` (~5MB), `all-MiniLM-L6-v2` model (~80MB), `commander` (~200KB), `nanoid` (~5KB). Net reduction: ~87MB.

**Key advantage:** Both skill packages are installed via `npx skills add` and auto-updated. No manual vendoring or lock-file drift.

## Layer 1 — Intake and Specification Hardening

### Files
- `lib/harness-spec.ts` — SpecHardener class, AI prompt construction, ambiguity detection
- `extensions/harness-spec.ts` — Extension: intercepts requests, runs hardening gate

### Flow

```
User request
    ↓
SpecHardener.harden(raw_request) → AI call → HardenedSpec
    ↓
Ambiguity gate: count blocking ambiguities with null resolution
    ↓
If blocking ambiguities > 0:
    → Return to user for resolution
    → Loop until zero blocking ambiguities (max_ambiguity_retries)
    ↓
Store HardenedSpec in memory + .pi/harness/specs/<id>.json
    ↓
Emit: spec_hardened → Layer 2
```

### AI prompt

```
You are a specification hardening agent. Given a raw task request, produce a structured specification.

For every vague, underspecified, or ambiguous aspect, create an AmbiguityFlag.
Be aggressive: multiple reasonable interpretations = ambiguity.
Unverifiable success = ambiguity.

Output strict JSON matching the HardenedSpec schema.

Rules:
- Every success criterion must be testable (if you can't write a test, flag as ambiguous)
- Anti-criteria: what the solution MUST NOT do
- "blocking" severity = cannot proceed without resolution
- "warning" severity = proceed with caution, may cause rework
- definition_of_done = single boolean expression
- scope_boundary must explicitly list out-of-scope items

Raw request:
<request>
```

### Extension behavior

- `session_start` gate: if no spec exists for session, request hardening
- Tool: `harden-spec` — takes raw text, produces HardenedSpec
- Tool: `resolve-ambiguity` — takes spec_id + ambiguity_id + resolution
- Tool: `approve-spec` — human override for force-approve
- Command: `/harness-spec-status`

---

## Layer 2 — Structured Planning

### Files
- `lib/harness-planner.ts` — Planner class, DAG generation, validation
- `extensions/harness-planner.ts` — Extension: listens for spec_hardened, produces plan

### Flow

```
spec_hardened event →
Planner.createPlan(spec) → AI call → ExecutionPlan with nodes[]
    ↓
DAG validation: cycle detection, orphan detection, spec coverage
    ↓
If invalid: regenerate (max_plan_revisions)
    ↓
Plan review gate (always runs):
    → Adversarial critic review of plan
    → OR human approval (config: require_approval)
    ↓
Store ExecutionPlan in memory + .pi/harness/plans/<id>.json
    ↓
Emit: plan_approved → Archon workflow (Layer 8)
```

### AI prompt — plan creation

```
You are a planning agent. Produce an execution plan as a DAG of tasks.

Rules:
- Each task = smallest independently verifiable unit
- Every task declares: inputs, outputs, dependencies
- Every task identifies ≥1 risk entry
- Every task has concrete verification method
- No cycles
- Prefer parallelism: independent tasks should have no dependency relation

Output strict JSON matching ExecutionPlan schema.

Hardened specification:
<spec_json>
```

### Extension behavior

- Listens for `spec_hardened`
- Tool: `create-plan`, `review-plan`, `approve-plan`
- Command: `/harness-plan-status`

---

## Layer 3 — MVC Execution with Grounding Checkpoints

### Files
- `lib/harness-executor.ts` — Executor class, grounding logic, drift detection
- `extensions/harness-executor.ts` — Extension: manages subtask execution, grounding hooks

### Flow

```
For each ready node in plan:
    ↓
    ┌─ PRE-EXECUTION GROUNDING ──────────────────────────┐
    │ 1. Load HardenedSpec from memory                    │
    │ 2. Compare spec_version vs last checkpoint          │
    │ 3. If spec changed: drift_detected → abort, replan  │
    │ 4. Compute state_hash = hash(all node statuses)     │
    │ 5. Record GroundingCheckpoint                       │
    └─────────────────────────────────────────────────────┘
    ↓
    Execute subtask (agent performs code change)
    ↓
    ┌─ POST-EXECUTION GROUNDING ─────────────────────────┐
    │ 1. Re-read HardenedSpec                              │
    │ 2. Verify output matches declared outputs            │
    │ 3. Verify no anti-criteria violated                  │
    │ 4. Git commit intermediate state                     │
    │ 5. Record GroundingCheckpoint                        │
    └─────────────────────────────────────────────────────┘
    ↓
    Emit: subtask_completed → Layer 4 (Automated QA)
```

### Extension behavior

- Listens for `plan_approved`
- Tool: `execute-next-task`, `grounding-check`
- Hook on `turn_end`: auto-grounding check during execution
- Command: `/harness-execution-status`

---

## Layer 4 — Automated QA (Black-Box Testing)

**Principle (ADR-008):** The test writer sees ONLY the spec — never implementation code. This prevents gaming the system and enforces black-box testing. Tests validate what the code SHOULD do (from the spec), not what it DOES do (from reading implementation).

### Files
- `lib/harness-qa.ts` — QAAgent class, test generation (spec-only prompts), test runner invocation, result collection
- `extensions/harness-qa.ts` — Extension: listens for `subtask_completed`, generates + runs tests

### Flow

```
subtask_completed →
    ↓
┌─ SPEC-ONLY TEST GENERATION ──────────────────────────┐
│ 1. Load HardenedSpec (success_criteria, anti_criteria,  │
│    definition_of_done, scope_boundary)                 │
│ 2. Load PlanNode for this task (task boundaries,        │
│    declared inputs/outputs, verification method)         │
│ 3. Load PUBLIC API SURFACE ONLY (exported type         │
│    signatures, function signatures — NO implementation) │
│ 4. AI generates test cases mapped 1:1 to spec criteria  │
│    - unit tests ← individual success criteria            │
│    - integration tests ← cross-node criteria             │
│    - e2e tests ← definition_of_done + scope              │
│ 5. Write test files to project test directory            │
│ 6. Run test suite via configured runner (default: vitest)│
│ 7. Collect TestRunResult for each case                   │
│ 8. Compute coverage = % of spec criteria with tests      │
└─────────────────────────────────────────────────────────┘
    ↓
┌─ QA GATE ───────────────────────────────────────────┐
│ ALL tests green AND coverage >= coverage_target?      │
│   YES → subtask_tested → Layer 5 (Critics)            │
│   NO (red tests) → rework loop back to Layer 3        │
│        (up to max_rework_rounds)                       │
│   NO (coverage gap) → generate additional tests,     │
│        re-run (one retry before failing)                │
│   TEST GENERATION FAILURE → subtask_test_failed →    │
│        flag for human review                            │
└──────────────────────────────────────────────────────── ┘
    ↓
Store QAResult + TestSuite in .pi/harness/qa/<id>.json
Commit test files alongside production code
```

### AI prompt — test generation (spec-only)

```
You are a test generation agent. Your job is to write automated tests
that verify a system behaves according to its specification.

CRITICAL CONSTRAINT: You do NOT have access to the implementation code.
You only see the specification and the public API surface. This is by design.
Write tests against the SPECIFICATION, not against the implementation.

Given:
- Hardened specification with success criteria and anti-criteria
- Task description and declared inputs/outputs
- Public API surface (type signatures only, NO implementation bodies)

For each success criterion, produce at least one test case that:
1. Exercises the specified behavior
2. Asserts the expected outcome as stated in the criterion
3. Does NOT depend on implementation details

For each anti-criterion, produce a test that verifies the forbidden
behavior does NOT occur.

Output strict JSON matching TestSuite schema.

Rules:
- Every test must trace to a spec_criterion_id (success or anti-criterion)
- Tests must use only the public API surface — no accessing internals
- Expected behavior comes FROM THE SPEC, not from guessing implementation
- Include negative tests (what should NOT happen) from anti-criteria
- Include edge cases implied by the spec's constraints and scope boundary
- Test types: unit (single criterion), integration (cross-criterion), e2e (full scenario)
- Generate test code for the configured runner (default: vitest)
-
- NEVER assume implementation details. If the spec says "returns a valid user",
  test that the return value satisfies validity criteria, NOT that it has a
  specific internal structure.

Hardened specification:
<spec_json>

Task:
<task_json>

Public API surface:
<api_signatures_only>
```

### Extension behavior

- Listens for `subtask_completed`
- Tool: `generate-tests` — takes spec_id + task_id, produces spec-only TestSuite
- Tool: `run-tests` — executes generated tests via configured runner (vitest), returns QAResult
- Tool: `qa-status` — shows test generation + execution status for current subtask
- Command: `/harness-qa-status`

---

## Layer 5 — Adversarial Verification

### Files
- `lib/harness-critics.ts` — CriticAgent class, adversarial prompt templates
- `extensions/harness-critics.ts` — Extension: listens for subtask_tested

### Flow

```
subtask_tested →
For each focus_area (default: correctness, spec_compliance):
    AI call with adversarial prompt → CriticReview
    ↓
Aggregate verdicts:
    ANY critical/major failure → subtask_failed → rework loop
    All pass → subtask_verified → Layer 6 (Observability)
    Only minor → conditional_pass → Layer 6 (with caveats)
    ↓
Critics ALSO review test quality:
    - Are spec-based tests comprehensive? (not just trivial passes)
    - Do tests cover edge cases from anti-criteria?
    - Is there a gap between spec criteria and test coverage?
    ↓
Store CriticReviews in memory + .pi/harness/reviews/
```

### Critic prompts (adversarial)

**Correctness:** Attack logic errors, off-by-one, unhandled edges, null derefs, type mismatches.
**Security:** Attack injection, auth bypass, data exposure, insecure defaults.
**Performance:** Attack N+1 queries, unbounded loops, memory leaks, blocking async.
**Spec compliance:** Attack missing functionality, anti-criteria violations, scope creep.

Each critic: "Your ONLY job is to find failures. Do NOT suggest improvements. ATTACK."

### Extension behavior

- Listens for `subtask_tested`
- Tool: `run-critics`, `run-critic-focus`
- Command: `/harness-critic-status`

---

## Layer 6 — Automated Observability

### Files
- `lib/harness-observability.ts` — ObservabilityEnforcer class
- `extensions/harness-observability.ts` — Extension: enforces observability as definition-of-done

### Flow

```
subtask_verified →
ObservabilityEnforcer.enforce(task, code_changes)
    ↓
AI call → extract metrics, health checks, alert conditions → ObservabilitySpec
    ↓
Verify metric instrumentation code exists in the change
    ↓
If missing: generate scaffolding, block until wired (require_metrics=true)
    ↓
Store ObservabilitySpec with SubtaskResult
```

### Extension behavior

- Listens for `subtask_verified`
- Tool: `define-observability`, `verify-observability`
- Command: `/harness-observability-status`

---

## Layer 8 — Schema-Based Orchestration via Archon

### Architecture decision

Layer 8 is implemented as an **Archon workflow YAML** that invokes the pi.dev extension tools in the correct sequence. Archon provides:

| Capability | What Archon provides | What we'd otherwise build |
|---|---|---|
| DAG execution | YAML-defined workflow nodes with dependencies | Custom task graph executor |
| Loop nodes | `loop: { until: ALL_TASKS_COMPLETE }` | Custom rework loop logic |
| Human approval gates | `loop: { until: APPROVED, interactive: true }` | Custom approval UI |
| Worktree isolation | Auto git worktree per workflow run | Custom branch management |
| Run persistence | SQLite/PostgreSQL run history | Custom state storage |
| Multi-platform invocation | CLI, Web UI, Slack, Telegram, GitHub | Custom API layer |
| Parallel node execution | Concurrent independent nodes | Custom parallel dispatch |

### Archon workflow: `.archon/workflows/harness-pipeline.yaml`

```yaml
# The 8-layer harness pipeline — always-on, no skip
nodes:
  # Layer 1: Specification hardening
  - id: harden-spec
    prompt: |
      Harden the user's request into a structured specification.
      Use the harden-spec tool. If there are blocking ambiguities,
      present them to the user for resolution using resolve-ambiguity.
      Loop until all blocking ambiguities are resolved.

  # Layer 1: Ambiguity resolution loop
  - id: resolve-ambiguities
    depends_on: [harden-spec]
    loop:
      prompt: |
        Check /harness-spec-status. If blocking ambiguities remain,
        present them to the user and resolve using resolve-ambiguity.
      until: NO_BLOCKING_AMBIGUITIES
      interactive: true

  # Layer 2: Planning
  - id: create-plan
    depends_on: [resolve-ambiguities]
    prompt: |
      Create an execution plan from the hardened specification.
      Use the create-plan tool.

  # Layer 2: Plan review (adversarial)
  - id: review-plan
    depends_on: [create-plan]
    prompt: |
      Review the execution plan adversarially using the review-plan tool.
      The plan critic should attack the plan, not approve it.
      If the plan is rejected, regenerate using create-plan.

  # Layer 2: Plan approval gate
  - id: approve-plan
    depends_on: [review-plan]
    loop:
      prompt: |
        If the plan was rejected by the critic, incorporate review notes
        and regenerate using create-plan, then review again.
        If the plan passes review, present to the user for approval
        using approve-plan or ask for confirmation.
      until: PLAN_APPROVED
      interactive: true
      max_iterations: 3
      gate_message: |
        Review the plan approval state. Approve to continue, or provide a reason
        to regenerate the plan. If the limit is reached, the run must fail closed.

  # Layers 3-6: Execution loop with grounding, QA, critics, observability
  - id: execute-plan
    depends_on: [approve-plan]
    loop:
      prompt: |
        Execute the next task in the plan using execute-next-task.
        This tool handles:
        - Pre-execution grounding checkpoint (Layer 3)
        - Code change execution
        - Post-execution grounding checkpoint (Layer 3)
        - Spec-only automated test generation + execution (Layer 4)
        - Adversarial critic review (Layer 5)
        - Observability enforcement (Layer 6)

        If tests fail (red), rework the subtask (up to max_rework_rounds).
        If a subtask fails critic review, rework it (up to max_attack_rounds).
        If drift is detected, stop and replan.

        Check /harness-execution-status after each task.
        Continue until all plan nodes are completed or failed.
      until: ALL_TASKS_COMPLETE
      max_iterations: 100
      fresh_context: true

  # Layer 7: Memory capture
  - id: capture-memory
    depends_on: [execute-plan]
    prompt: |
      Store the execution results in the wiki using claude-obsidian skills:
      - If the plan succeeded: ingest success pattern via wiki-ingest skill (type: module, status: mature)
      - If any task failed: ingest failure pattern via wiki-ingest skill (with > [!contradiction] callout)
      - Record all key decisions made during execution in wiki/decisions/
      - Update wiki/hot.md with session context summary
      - Append to wiki/log.md with operation details
      - Update wiki/index.md with any new pages
      Run /harness-wiki-lint if more than 10 entries were written.
```

### How Archon invokes pi.dev extension tools

Archon's AI nodes execute prompts that reference the harness's registered tools. When Archon invokes `pi` as the AI assistant client, the pi.dev session has access to all harness extension tools (`harden-spec`, `create-plan`, `execute-next-task`, etc.). The workflow prompt tells the agent which tools to call and in what sequence.

This means:
- **No custom orchestration code** — Archon handles DAG execution, loops, and approval gates
- **Extension tools are the API** — each layer's tool is the callable interface
- **Worktree isolation comes free** — Archon creates an isolated git worktree per run
- **Run history is free** — Archon persists every workflow run to SQLite

### Harness terminal state model

Archon provides workflow execution, retries, and run status, but the harness must own the
meaning of success and failure. The workflow should translate Archon run state into a
small set of explicit harness terminal states:

- `completed`: every required control objective passed, including spec, plan, execution,
  QA (tests green), critics, observability, and memory capture
- `blocked`: a mandatory human gate or external dependency could not be resolved within
  budget
- `replan_required`: drift, failed critics, failed QA (max rework rounds exhausted), or spec
  changes require a new plan before execution can continue
- `cancelled`: the workflow intentionally stopped because a precondition was not met
- `failed`: retries, loop limits, or fatal errors were exhausted

The harness should normalize Archon statuses like `completed`, `failed`, and `cancelled`
into these states, and persist the mapping in run history so later layers can resume or
compensate deterministically.

### Failure and resume policy

- Node retries are allowed for transient errors only by default; fatal errors fail closed.
- Every interactive loop must have a bounded `max_iterations` and a gate message that
  explains the exit behavior.
- Compensation is a harness responsibility, not an Archon assumption: if a node partially
  succeeds, the harness records a compensating action or an explicit rollback plan in the run
  record.
- Resume is allowed only from the last verified checkpoint and only if the harness state
  machine says the prior run ended in `failed`, `blocked`, or `cancelled` with a resumable
  reason.

### Additional Archon workflows

```yaml
# .archon/workflows/harness-fix-issue.yaml — GitHub issue → full pipeline
nodes:
  - id: classify-issue
    prompt: "Read the GitHub issue and classify its type and scope"
  - id: harden-spec
    depends_on: [classify-issue]
    prompt: "Harden the issue description into a specification using harden-spec"
  # ... continues with same pipeline nodes as harness-pipeline.yaml

# .archon/workflows/harness-quick-review.yaml — Adversarial review only
nodes:
  - id: get-diff
    bash: "git diff HEAD~1"
  - id: run-critics
    depends_on: [get-diff]
    prompt: "Run adversarial critic review on the latest changes using run-critics with all 4 focus areas"
```

---

## Integration Points

### Full pipeline event flow

```
User request
  → [Layer 1] harden-spec → resolve ambiguities → spec_hardened
  → [Layer 2] create-plan → review-plan → approve-plan → plan_approved
  → [Archon] orchestrate via workflow YAML
    → [Layer 3] execute-next-task (grounding checkpoints)
      → subtask_completed
        → [Layer 4] generate-tests + run-tests (spec-only, black-box)
          → subtask_tested (if green) or rework (if red)
            → [Layer 5] run-critics → subtask_verified or subtask_failed
              → if verified: [Layer 6] enforce-observability → subtask_observable
              → if failed: rework loop (Archon loop node)
    → ALL_TASKS_COMPLETE
  → [Layer 7] capture-memory → store success/failure patterns + decisions
```

### Archon ↔ pi.dev extension interface

```
Archon workflow node (AI prompt)
    ↓
pi.dev session agent reads prompt
    ↓
Agent calls harness extension tool (e.g., harden-spec, create-plan, execute-next-task)
    ↓
Extension logic runs:
  - AI call via completeSimple (for spec hardening, planning, QA, critics, observability)
  - Programmatic logic (for grounding, drift detection, test execution, schema validation)
  - Memory store read/write (Layer 7)
    ↓
Tool returns structured JSON result
    ↓
Archon records node completion, advances workflow
```

---

## Build Order (Phased)

### Phase 0: Foundation
1. `lib/harness-schemas.ts` — all type definitions
2. `lib/harness-config.ts` — config types, defaults, merge, validate (no enable/disable)
3. `.pi/harness.example.json` — config template

### Phase 1: Memory (Layer 7) — claude-obsidian Wiki Skills
4. Install claude-obsidian skills: `npx pi-skills add AgriciDaniel/claude-obsidian` (installs wiki, wiki-ingest, wiki-query, wiki-lint, save, autoresearch, canvas)
5. Run `/wiki` to scaffold the vault in Mode B (GitHub/Repository) — handled entirely by claude-obsidian
6. `extensions/harness-knowledge-base.ts` — extension registration (invokes claude-obsidian skills)
7. Migrate existing `wiki/decisions/` and `wiki/layers/` content to Mode B frontmatter format (manual, one-time)

### Phase 2: Spec Hardening (Layer 1)
6. `lib/harness-spec.ts` — SpecHardener with AI prompts
7. `extensions/harness-spec.ts` — extension with gate logic

### Phase 3: Planning (Layer 2)
8. `lib/harness-planner.ts` — Planner with DAG generation + validation
9. `extensions/harness-planner.ts` — extension with review gate

### Phase 4: Execution + Grounding (Layer 3)
10. `lib/harness-executor.ts` — Executor with checkpoint + drift detection
11. `extensions/harness-executor.ts` — extension with grounding hooks

### Phase 5: Automated QA (Layer 4)
12. `lib/harness-qa.ts` — QAAgent with spec-only test generation + runner
13. `extensions/harness-qa.ts` — extension with QA gate logic

### Phase 6: Critics (Layer 5)
14. `lib/harness-critics.ts` — CriticAgent with adversarial prompts
15. `extensions/harness-critics.ts` — extension with review routing

### Phase 7: Observability (Layer 6)
16. `lib/harness-observability.ts` — ObservabilityEnforcer
17. `extensions/harness-observability.ts` — extension with enforcement

### Phase 8: Archon Integration (Layer 8)
18. `.archon/workflows/harness-pipeline.yaml` — main pipeline workflow
19. `.archon/workflows/harness-fix-issue.yaml` — GitHub issue workflow
20. `.archon/workflows/harness-quick-review.yaml` — standalone critic review
21. `.archon/commands/harness.md` — Archon command for invoking the pipeline
22. Integration test: full pipeline end-to-end via `archon run harness-pipeline`

### Phase 9: Package integration
23. Update `package.json` — add new extension files to `check:ts`
24. Update `README.md` with harness + Archon documentation
25. Update `PLAN.md` to mark layers as implemented
26. `.npmignore` for `.pi/harness/` and `.archon/` data directories

---

## Risk Surface

| Risk | Mitigation |
|---|---|
| AI spec hardening hallucinates ambiguity where none exists | max_ambiguity_retries cap; human can force-approve via `approve-spec` |
| Plan DAG generation produces invalid graph | Automated cycle detection + validation before storage |
| Grounding checkpoints add latency | Configurable interval (every_subtask vs every_n); correctness > speed |
| QA tests don't compile or run | Test generation uses project's existing test runner config; fallback to schema-only validation if runner fails |
| QA test writer leaks implementation code despite spec-only constraint | Architectural enforcement: extension constructs prompt programmatically, never includes implementation files; `spec_only` config is immutable |
| QA coverage target too aggressive for simple tasks | coverage_target is configurable (default 0.8 = 80%); spec criteria that can't be tested flagged at Layer 1 |
| QA rework loop exhausts max_rework_rounds | Fails closed: subtask_test_failed → human review; does not proceed to critics |
| Critic agents too aggressive (false positives) | conditional_pass verdict doesn't block; max_attack_rounds caps rework |
| Memory store grows unbounded | max_entries config; wiki-lint detects orphans; eviction policy (failure patterns never evicted) |
| Archon adds runtime dependency | Archon is MIT-licensed, well-maintained, supports Pi; harness must normalize terminal states and keep compensation/resume logic in its own state machine |
| Mandatory pipeline too rigid for trivial tasks | Trivial tasks still benefit from spec+plan+critic; overhead is ~17k tokens per subtask (acceptable for correctness gains) |
| claude-obsidian is external dependency | Pin skill versions in repo; skills are ~50KB text files, vendorable |
| LLM-native search cost for large wikis | hot.md short-circuits most queries at ~500 tokens; deep queries ~8k tokens optional; DragonScale tiling available for >10k entries |
| Wikilinks need Obsidian for graph view | Skills work without Obsidian; graph view is nice-to-have, not required |
| Wiki can contain stale info without lint | wiki-lint skill runs health checks; integrated into harness capture-memory step |
| `.raw/` directory adds storage overhead | Sources are immutable and git-tracked; manifest prevents re-processing; acceptable tradeoff for provenance |

---

## Token Budget (per subtask)

| Layer | Tokens |
|---|---|
| Spec hardening | ~2,000 |
| Planning + review | ~5,000 |
| Grounding checkpoints | ~500 |
| **Automated QA (test gen + run)** | **~3,500** |
| Critics (2 focus areas) | ~4,000 |
| Observability | ~1,500 |
| Memory writes (ingest + index + hot cache update) | ~500 (standard) / ~1,500 (deep) |
| **Total per subtask** | **~17,500** |

Typical 5-subtask plan: ~83,500 tokens overhead + coding tokens.

---

## Verification Criteria

Each phase complete when:
1. TypeScript compiles (`npm run check:ts` passes)
2. Extension loads in pi.dev (`/harness-<layer>-status` responds)
3. Unit tests pass for core logic
4. Integration test: minimal task through the layer in isolation
5. Phase 5 (QA): generated tests pass against real implementation; spec-only constraint verified (no implementation code in prompt)
6. Phase 8: `archon run harness-pipeline` completes end-to-end
7. Workflow status round-trips through `archon workflow status --json` and maps to the harness terminal states above
8. Loop exhaustion, retry exhaustion, and cancel paths each produce deterministic, machine-readable run records
9. ADR updated if design decisions change
