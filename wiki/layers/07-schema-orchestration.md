# Layer 7 — Schema-Based Orchestration via Archon

## Origin principle

Human coordination is narrative (Slack, PRs, standups). Agent coordination should be structured data passing. Each agent publishes outputs as typed schemas; orchestration routes work based on declared capabilities and current state. No "asking" — only task routing based on capability declaration. **This layer is mandatory. It composes all other layers into a coherent pipeline.**

## Purpose

Orchestrate the 7-layer pipeline end-to-end. Route tasks. Execute in waves. Collect typed outputs. Handle rework loops. Provide worktree isolation. Persist run history. All via **Archon's workflow engine** — we don't reimplement DAG execution, loop nodes, approval gates, or state management.

## Architecture decision: Archon as workflow engine

Rather than building custom orchestration code in pi.dev extensions, Layer 7 uses Archon's YAML workflow engine. This provides:

| Need | Archon provides | What we'd otherwise build |
|-----|-----------------|--------------------------|
| DAG execution | YAML workflow nodes with dependencies | Custom task graph executor |
| Loop nodes | `loop: { until: CONDITION }` with fresh context | Custom rework loop logic |
| Human approval gates | `loop: { until: APPROVED, interactive: true }` | Custom approval UI |
| Worktree isolation | Auto git worktree per run | Custom branch management |
| Run persistence | SQLite/PostgreSQL (7 tables) | Custom state storage |
| Multi-platform invocation | CLI, Web UI, Slack, Telegram, GitHub | Custom API layer |
| Parallel nodes | Concurrent independent nodes | Custom parallel dispatch |

The pi.dev extensions implement **intelligence** (spec hardening, planning, critic review, grounding, memory). Archon implements **orchestration** (sequencing, looping, isolation, persistence). This separation keeps each concern focused and testable.

## Primary workflow: `harness-pipeline.yaml`

```yaml
# .archon/workflows/harness-pipeline.yaml
# The 7-layer harness pipeline — mandatory, always-on, no skip

nodes:
  # Layer 1: Specification hardening
  - id: harden-spec
    prompt: |
      Harden the user's request into a structured specification using the harden-spec tool.
      If there are blocking ambiguities, present them for resolution.

  - id: resolve-ambiguities
    depends_on: [harden-spec]
    loop:
      prompt: |
        Check /harness-spec-status. If blocking ambiguities remain,
        present them to the user and resolve using resolve-ambiguity.
      until: NO_BLOCKING_AMBIGUITIES
      interactive: true

  # Layer 2: Planning + review
  - id: create-plan
    depends_on: [resolve-ambiguities]
    prompt: |
      Create an execution plan from the hardened specification using create-plan.

  - id: review-plan
    depends_on: [create-plan]
    prompt: |
      Review the execution plan adversarially using review-plan.
      Attack the plan: find missing tasks, incorrect dependencies, overly broad tasks.

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

  # Layers 3-5: Execution with grounding, critics, and observability
  - id: execute-plan
    depends_on: [approve-plan]
    loop:
      prompt: |
        Execute the next task using execute-next-task. This handles:
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
      fresh_context: true

  # Layer 6: Memory capture
  - id: capture-memory
    depends_on: [execute-plan]
    prompt: |
      Store execution results in memory:
      - If plan succeeded: store success pattern via harness-memory-store
      - If any task failed: store failure pattern via harness-memory-store
      - Record key decisions made during execution.
      Verify with /harness-memory-status.
```

## Additional workflows

### `harness-fix-issue.yaml` — GitHub issue → full pipeline

```yaml
nodes:
  - id: classify-issue
    prompt: "Read the GitHub issue and classify its type and scope"
  - id: harden-spec
    depends_on: [classify-issue]
    prompt: "Harden the issue description using harden-spec"
  # ... same pipeline nodes as harness-pipeline.yaml from resolve-ambiguities onward
```

### `harness-quick-review.yaml` — Standalone critic review

```yaml
nodes:
  - id: get-diff
    bash: "git diff HEAD~1"
  - id: run-critics
    depends_on: [get-diff]
    prompt: "Run adversarial critic review on the latest changes using run-critics with all 4 focus areas: correctness, security, performance, spec_compliance"
```

## How Archon invokes pi.dev extension tools

Archon's AI nodes execute prompts that reference the registered pi.dev tools. When Archon invokes `pi` as the AI assistant client, the pi.dev session has access to all harness extension tools:

```
Archon workflow node (AI prompt)
    ↓
pi.dev session agent reads prompt
    ↓
Agent calls harness extension tool (harden-spec, create-plan, etc.)
    ↓
Extension logic runs (AI calls via completeSimple, programmatic logic, memory)
    ↓
Tool returns structured JSON result
    ↓
Archon records node completion, advances workflow
```

## Single-agent vs multi-agent

| Mode | When | How |
|------|------|-----|
| Single-agent | Default (one pi.dev session) | Archon sequences tasks. Each "dispatch" tells the agent what to do next. Grounding + critics run inline. |
| Multi-agent | `max_parallel > 1` + multiple registered agents | Archon dispatches to multiple agents. Each publishes typed output schemas. Routing is IPC via files or process communication. |

Both modes use the same workflow YAML. The `fresh_context: true` flag on the execution loop ensures grounding checkpoints get a clean view.

## Data contract

```typescript
type AgentCapability = {
  agent_id: string;
  capabilities: string[];
  current_load: number;          // 0.0 (idle) to 1.0 (fully loaded)
  specializations: CriticFocus[];
};

type TaskRouting = {
  task_id: string;
  routed_to: string;             // agent_id
  routed_at: string;
  schema_input: string;          // JSON schema ref
  schema_output: string;         // JSON schema ref
};

type WaveResult = {
  wave_number: number;
  tasks: TaskRouting[];
  results: SubtaskResult[];
  all_verified: boolean;
  duration_ms: number;
};
```

### Schema validation (mandatory)

Every task input/output must conform to its declared schema. The orchestrator validates:
- Before dispatch: input data matches `schema_input`
- After completion: output data matches `schema_output`
- Validation failure: mark task failed, store failure pattern

Schema references resolve to stored JSON schemas in `.pi/harness/schemas/`.

## Extension: `extensions/harness-orchestrator.ts`

| Type | Name | Description |
|------|------|-------------|
| Event consumed | `plan_approved` | Begin orchestrated execution |
| Event consumed | `subtask_verified` | Task passed critics; advance wave |
| Event consumed | `subtask_failed` | Task failed; mark dependents blocked |
| Event emitted | `execution_complete` | `{ plan_id, status, results }` → Layer 6 memory |
| Event emitted | `wave_started` | `{ plan_id, wave_number, task_count }` |
| Event emitted | `wave_completed` | `{ plan_id, wave_number, results }` |
| Tool | `orchestrate-plan` | Begin orchestrated execution of a plan |
| Tool | `register-agent-capability` | Declare agent capabilities |
| Tool | `get-routing-status` | Current wave, task assignments |
| Command | `/harness-orchestration-status` | Agents, capabilities, wave progress |

**Note:** Most orchestration is handled by Archon's workflow engine. This extension provides the pi.dev-side hooks for schema validation, wave tracking, and event emission. The Archon workflow YAML is the primary orchestration definition.

## Config (tuning only — orchestration always runs)

```json
{
  "orchestration": {
    "max_parallel": 2
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `max_parallel` | 2 | Max concurrent tasks. Single-agent mode: simulated via serialization. Multi-agent: actual parallel execution |

## Archon setup requirements

For the harness pipeline to work, Archon must be installed and configured to use `pi` as the AI assistant:

```bash
# Install Archon
curl -fsSL https://archon.diy/install | bash

# Or via Homebrew
brew install coleam00/archon/archon
```

The harness workflow YAML files live in `.archon/workflows/` in the project root and are committed to the repo. This means the entire team runs the same process.

## Error states

| Error | Recovery |
|-------|----------|
| `deadlock` | All pending nodes have unmet deps → emit execution_complete with partial state |
| `agent_unavailable` | Fall back to default agent; if none, block task |
| `schema_validation_failed` | Mark task failed; store failure pattern |
| `wave_timeout` | Mark in-progress tasks as failed; continue with remaining |
| `archon_unavailable` | Fall back to manual tool invocation; pipeline still works locally |

## Token cost

Orchestration itself: ~200 per wave (no AI calls — routing logic). AI cost is in the tasks (Layers 1-5).

## File layout

```
lib/harness-orchestrator.ts          # Orchestrator class, schema validation, wave tracking
extensions/harness-orchestrator.ts   # pi.dev extension registration
.archon/
  workflows/
    harness-pipeline.yaml            # Main 7-layer pipeline
    harness-fix-issue.yaml           # GitHub issue → full pipeline
    harness-quick-review.yaml         # Standalone critic review
  commands/
    harness.md                        # Archon command for invoking the pipeline
.pi/harness/schemas/
  task/
    <task-id>/
      input.json
      output.json
```