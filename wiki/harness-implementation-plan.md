# Agentic Harness Implementation Plan

## Overview

7-layer agent-native engineering harness for ultimate-pi. The pipeline is **mandatory and always-on** — every task flows through all 7 layers in sequence. No layer can be skipped. Tunable parameters control behavior within layers, not whether they run.

**Architecture:** pi.dev TypeScript extensions implement the intelligence (spec hardening, planning, critics, observability, memory). Archon implements the orchestration (workflow DAG execution, worktree isolation, human approval gates, loop nodes for rework, persistent run history).

Build order: schemas → memory → spec hardening → planner → execution+grounding → critics → observability → Archon workflow.

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
  critic_reviews: CriticReview[];
  observability: ObservabilitySpec;
};

// --- Layer 4: Adversarial Verification ---
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

// --- Layer 5: Observability ---
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

// --- Layer 6: Memory (Wiki-based, ADR-007) ---
export type EntryType = "success_pattern" | "failure_pattern" | "decision" | "evolution_event" | "spec" | "plan" | "checkpoint" | "review";

export type WikiEntry = {
  id: string;
  type: EntryType;
  title: string;
  tags: string[];
  created: string;
  updated?: string;
  layer?: string;
  related: string[];
  file_path: string;             // path to .md file in wiki/
  frontmatter: Record<string, any>;
  body: string;
};

export type SearchOptions = {
  type?: EntryType;
  tags?: string[];
  limit?: number;
  mode?: "hybrid" | "bm25" | "vector";
};

export type SearchResult = {
  entry: WikiEntry;
  score: number;
  match_type: "vector" | "bm25" | "hybrid";
};

export type IndexStatus = {
  entries: Record<EntryType, number>;
  total: number;
  index_status: "ready" | "empty" | "building";
  last_indexed: string;
  model: string;
  model_cached: boolean;
  search_mode: string;
};

// --- Layer 7: Orchestration (Archon) ---
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
    critics: { focus_areas: CriticFocus[]; max_attack_rounds: number };
    observability: { require_metrics: boolean };
    memory: { max_entries: number; embedding_model: string; search_mode: string; wiki_path: string };
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
    critics: { focus_areas: ["correctness", "spec_compliance"], max_attack_rounds: 2 },
    observability: { require_metrics: true },
    memory: { max_entries: 10000, embedding_model: "all-MiniLM-L6-v2", search_mode: "hybrid", wiki_path: "wiki" },
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
    "critics": { "focus_areas": ["correctness", "spec_compliance"], "max_attack_rounds": 2 },
    "observability": { "require_metrics": true },
    "memory": { "max_entries": 10000, "embedding_model": "all-MiniLM-L6-v2", "search_mode": "hybrid", "wiki_path": "wiki" }
  },
  "storage": { "base_dir": ".pi/harness" },
  "ai": { "timeout_ms": 30000, "max_tokens": 2000 }
}
```

---

## Layer 6 — Persistent Structured Knowledge Base (Wiki)

**Why first:** Every other layer reads/writes memory. Build the substrate before the consumers.

**Persistence (ADR-007):** Project wiki (`wiki/` directory) as single source of truth + Vectra semantic search + custom CLI. Human-readable, git-tracked, PR-reviewed, semantically searchable. See `wiki/decisions/ADR-007-wiki-as-knowledge-base.md`.

**Key change from ADR-004:** The knowledge base is no longer a separate Obsidian vault at `.pi/harness/knowledge-base/`. It IS the project `wiki/` directory. This eliminates the dual-store problem, makes wiki changes PR-reviewable, and gives agents a single obvious location for all knowledge.

### Files
- `lib/wiki-kb.ts` — WikiKnowledgeBase class, wiki/ directory I/O, Vectra search, embedding lifecycle
- `tools/wiki-cli.ts` — CLI wrapper (`wiki` command) for agent and human access
- `extensions/harness-knowledge-base.ts` — Extension: registers tools, commands, event hooks
- `.pi/skills/wiki/SKILL.md` — Agent skill for wiki CLI access

### Wiki structure
```
wiki/
  decisions/              # ADRs
  layers/                  # Layer docs
  patterns/                # Runtime patterns
    success/SP-<id>.md
    failure/FP-<id>.md
  specs/SPEC-<id>.md
  plans/PLAN-<id>.md
  checkpoints/CP-<id>.md
  reviews/REV-<id>.md
  evolution/EV-<id>.md
  harness-implementation-plan.md

.pi/wiki-search/
    vectra-index/          # Vectra local index files
    model-config.json     # embedding model metadata
    model-cache/          # cached embedding model (~80MB)
    embedding-cache/      # cached embeddings
```

### `lib/wiki-kb.ts` API surface

```typescript
class WikiKnowledgeBase {
  private wikiPath: string;        // wiki/ directory
  private vectraIndex: LocalIndex; // .pi/wiki-search/vectra-index/
  private embeddingModel: any;

  constructor(wikiPath?: string);   // default: <project-root>/wiki/
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Write — creates .md file in wiki/ + updates Vectra index
  store(entry: WikiEntry): Promise<string>;
  retrieve(id: string): Promise<WikiEntry | null>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  // Pattern-specific
  storeSuccessPattern(context: string, content: any, tags: string[]): Promise<string>;
  storeFailurePattern(context: string, content: any, tags: string[]): Promise<string>;
  storeDecision(context: string, decision: string, rationale: string, alternatives: string[]): Promise<string>;
  recordEvolution(event: string, files_changed: string[]): Promise<string>;

  // Cross-references
  backlinks(id: string): Promise<WikiEntry[]>;
  related(id: string, limit?: number): Promise<SearchResult[]>;

  // Retrieval helpers
  findSimilarPatterns(current_context: string, limit?: number): Promise<SearchResult[]>;
  getRecentDecisions(count?: number): Promise<WikiEntry[]>;
  getFailurePatternsFor(tags: string[]): Promise<WikiEntry[]>;

  // Index management
  reindex(): Promise<void>;
  status(): Promise<IndexStatus>;
}
```

### Wiki CLI (`wiki` command)

```bash
wiki search <query> [--type TYPE] [--tags TAG,TAG] [--limit N] [--mode hybrid|bm25|vector]
wiki get <ID>
wiki list [--type TYPE] [--tags TAG,TAG] [--limit N] [--sort created|updated|score]
wiki add <type> <title> [--tags TAG,TAG] [--layer L] [--related ID,ID]
wiki related <ID> [--limit N]
wiki backlinks <ID>
wiki status
wiki reindex [--force]
```

Output: JSON by default (agent-friendly). `--pretty` for human-readable tables.

Full CLI spec: `wiki/layers/08-wiki-query-interface.md`

### Search architecture

- **Tier 1 — BM25** (always available, zero setup): keyword + phrase matching via Vectra's built-in wink-nlp
- **Tier 2 — Vector similarity** (after model download): `@huggingface/transformers` generates 384-dim embeddings via `all-MiniLM-L6-v2` (~80MB, cached locally in `.pi/wiki-search/model-cache/`)
- **Default mode — Hybrid**: BM25 pre-filters by metadata, vector similarity re-ranks by semantic closeness
- **Graceful fallback**: if embedding model unavailable, search uses BM25-only (no blocking)

### Extension behavior

- `session_start`: Initialize WikiKnowledgeBase, load config, call `initialize()`
- `session_shutdown`: Call `shutdown()` to persist Vectra index
- Tool: `harness-search` — semantic/keyword search over wiki
- Tool: `harness-kb-store` — explicitly store a pattern/decision
- Tool: `harness-kb-retrieve` — retrieve wiki entry by ID
- Command: `/harness-kb-status` — entry counts, search index status, embedding model status
- Hook on `turn_end`: Auto-capture decision rationale

### Agent skill

`.pi/skills/wiki/SKILL.md` provides CLI-based access for agents: `wiki search` before decisions, `wiki add` after decisions/successes/failures, `wiki reindex` after git pull.

### New dependencies

| Package | Size | Purpose |
|---------|------|----------|
| `vectra` | ~1.8MB | Local vector DB with BM25 + hybrid search |
| `@huggingface/transformers` | ~5MB core | Local embedding model runtime (ONNX) |
| Model: `all-MiniLM-L6-v2` | ~80MB (cached) | 384-dim sentence embeddings |
| `commander` | ~200KB | CLI argument parsing |
| `nanoid` | ~5KB | ID generation for runtime entries |

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
Emit: plan_approved → Archon workflow (Layer 7)
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
    Emit: subtask_completed → Layer 4 (critics)
```

### Extension behavior

- Listens for `plan_approved`
- Tool: `execute-next-task`, `grounding-check`
- Hook on `turn_end`: auto-grounding check during execution
- Command: `/harness-execution-status`

---

## Layer 4 — Adversarial Verification

### Files
- `lib/harness-critics.ts` — CriticAgent class, adversarial prompt templates
- `extensions/harness-critics.ts` — Extension: listens for subtask_completed

### Flow

```
subtask_completed →
For each focus_area (default: correctness, spec_compliance):
    AI call with adversarial prompt → CriticReview
    ↓
Aggregate verdicts:
    ANY critical/major failure → subtask_failed → rework loop
    All pass → subtask_verified → Layer 5
    Only minor → conditional_pass → Layer 5 (with caveats)
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

- Listens for `subtask_completed`
- Tool: `run-critics`, `run-critic-focus`
- Command: `/harness-critic-status`

---

## Layer 5 — Automated Observability

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

## Layer 7 — Schema-Based Orchestration via Archon

### Architecture decision

Layer 7 is implemented as an **Archon workflow YAML** that invokes the pi.dev extension tools in the correct sequence. Archon provides:

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
# The 7-layer harness pipeline — always-on, no skip
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

  # Layers 3-5: Execution loop with grounding, critics, observability
  - id: execute-plan
    depends_on: [approve-plan]
    loop:
      prompt: |
        Execute the next task in the plan using execute-next-task.
        This tool handles:
        - Pre-execution grounding checkpoint (Layer 3)
        - Code change execution
        - Post-execution grounding checkpoint (Layer 3)
        - Adversarial critic review (Layer 4)
        - Observability enforcement (Layer 5)

        If a subtask fails critic review, rework it (up to max_attack_rounds).
        If drift is detected, stop and replan.

        Check /harness-execution-status after each task.
        Continue until all plan nodes are completed or failed.
      until: ALL_TASKS_COMPLETE
      max_iterations: 100
      fresh_context: true

  # Layer 6: Memory capture
  - id: capture-memory
    depends_on: [execute-plan]
    prompt: |
      Store the execution results in memory:
      - If the plan succeeded: store success pattern via harness-kb-store
      - If any task failed: store failure pattern via harness-kb-store
      - Record all key decisions made during execution
      Use /harness-kb-status to verify.
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
  critics, observability, and memory capture
- `blocked`: a mandatory human gate or external dependency could not be resolved within
  budget
- `replan_required`: drift, failed critics, or spec changes require a new plan before
  execution can continue
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
        → [Layer 4] run-critics → subtask_verified or subtask_failed
          → if verified: [Layer 5] enforce-observability → subtask_observable
          → if failed: rework loop (Archon loop node)
    → ALL_TASKS_COMPLETE
  → [Layer 6] capture-memory → store success/failure patterns + decisions
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
  - AI call via completeSimple (for spec hardening, planning, critics, observability)
  - Programmatic logic (for grounding, drift detection, schema validation)
  - Memory store read/write (Layer 6)
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

### Phase 1: Memory (Layer 6) + Wiki CLI (Layer 8)
4. `lib/wiki-kb.ts` — WikiKnowledgeBase implementation (replaces HarnessKnowledgeBase)
5. `tools/wiki-cli.ts` — CLI wrapper around WikiKnowledgeBase
6. `.pi/skills/wiki/SKILL.md` — Agent skill for wiki CLI access
7. `extensions/harness-knowledge-base.ts` — extension registration (uses WikiKnowledgeBase)

### Phase 2: Spec Hardening (Layer 1)
6. `lib/harness-spec.ts` — SpecHardener with AI prompts
7. `extensions/harness-spec.ts` — extension with gate logic

### Phase 3: Planning (Layer 2)
8. `lib/harness-planner.ts` — Planner with DAG generation + validation
9. `extensions/harness-planner.ts` — extension with review gate

### Phase 4: Execution + Grounding (Layer 3)
10. `lib/harness-executor.ts` — Executor with checkpoint + drift detection
11. `extensions/harness-executor.ts` — extension with grounding hooks

### Phase 5: Critics (Layer 4)
12. `lib/harness-critics.ts` — CriticAgent with adversarial prompts
13. `extensions/harness-critics.ts` — extension with review routing

### Phase 6: Observability (Layer 5)
14. `lib/harness-observability.ts` — ObservabilityEnforcer
15. `extensions/harness-observability.ts` — extension with enforcement

### Phase 7: Archon Integration (Layer 7)
16. `.archon/workflows/harness-pipeline.yaml` — main pipeline workflow
17. `.archon/workflows/harness-fix-issue.yaml` — GitHub issue workflow
18. `.archon/workflows/harness-quick-review.yaml` — standalone critic review
19. `.archon/commands/harness.md` — Archon command for invoking the pipeline
20. Integration test: full pipeline end-to-end via `archon run harness-pipeline`

### Phase 8: Package integration
21. Update `package.json` — add new extension files to `check:ts`
22. Update `README.md` with harness + Archon documentation
23. Update `PLAN.md` to mark layers as implemented
24. `.npmignore` for `.pi/harness/` and `.archon/` data directories

---

## Risk Surface

| Risk | Mitigation |
|---|---|
| AI spec hardening hallucinates ambiguity where none exists | max_ambiguity_retries cap; human can force-approve via `approve-spec` |
| Plan DAG generation produces invalid graph | Automated cycle detection + validation before storage |
| Grounding checkpoints add latency | Configurable interval (every_subtask vs every_n); correctness > speed |
| Critic agents too aggressive (false positives) | conditional_pass verdict doesn't block; max_attack_rounds caps rework |
| Memory store grows unbounded | max_entries config; eviction policy (failure patterns never evicted) |
| Archon adds runtime dependency | Archon is MIT-licensed, well-maintained, supports Pi; harness must normalize terminal states and keep compensation/resume logic in its own state machine |
| Mandatory pipeline too rigid for trivial tasks | Trivial tasks still benefit from spec+plan+critic; overhead is ~11k tokens per subtask (acceptable) |

---

## Token Budget (per subtask)

| Layer | Tokens |
|---|---|
| Spec hardening | ~2,000 |
| Planning + review | ~5,000 |
| Grounding checkpoints | ~500 |
| Critics (2 focus areas) | ~4,000 |
| Observability | ~1,500 |
| Memory writes | ~200 |
| **Total per subtask** | **~13,200** |

Typical 5-subtask plan: ~66,000 tokens overhead + coding tokens. Acceptable for correctness gains.

---

## Verification Criteria

Each phase complete when:
1. TypeScript compiles (`npm run check:ts` passes)
2. Extension loads in pi.dev (`/harness-<layer>-status` responds)
3. Unit tests pass for core logic
4. Integration test: minimal task through the layer in isolation
5. Phase 7: `archon run harness-pipeline` completes end-to-end
6. Workflow status round-trips through `archon workflow status --json` and maps to the harness terminal states above
7. Loop exhaustion, retry exhaustion, and cancel paths each produce deterministic, machine-readable run records
8. ADR updated if design decisions change
