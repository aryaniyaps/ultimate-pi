# Layer 1 — Intake & Specification Hardening

## Origin principle

Amazon's working-backwards documents force clarity before execution. For agents, narrative documents fail — LLMs hallucinate into specification gaps. The fix: structured schema with an ambiguity gate that refuses to proceed until every underspecified component is resolved. **This layer is mandatory. Every task flows through it.**

## Purpose

Convert a raw user request into a **HardenedSpec**: machine-verified specification where every success criterion is testable, every boundary is explicit, and every ambiguity is flagged and resolved. No execution begins while any blocking ambiguity remains unresolved.

## Data contract

```typescript
type HardenedSpec = {
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

type AmbiguityFlag = {
  id: string;
  description: string;
  resolution: string | null;           // null = unresolved → blocks execution
  severity: "blocking" | "warning";
};

type SuccessCriterion = {
  id: string;
  description: string;
  testable: boolean;
  verification_method: string;
};

type AntiCriterion = {
  id: string;
  description: string;                 // what the solution MUST NOT do
};
```

## Behavior

### Entry: raw user request

The layer intercepts at session start (or first tool call) when no HardenedSpec exists for the current session. **This always runs.**

### Step 1 — AI hardening call

SpecHardener sends the raw request to the model with a structured prompt. The model produces a `HardenedSpec` JSON object.

### Step 2 — Ambiguity gate (mandatory, non-bypassable)

Count `AmbiguityFlag`s where `resolution === null && severity === "blocking"`.

- **Zero blocking ambiguities**: spec is hardened → emit `spec_hardened`, proceed to Layer 2.
- **Blocking ambiguities remain**: return ambiguities to the user. Loop until resolved (max `max_ambiguity_retries` attempts, default 3). Exhausted → require manual `approve-spec` override.
- **Warning-level ambiguities**: auto-resolved when `auto_resolve_warning: true` (default). The resolution is "proceed with best interpretation."

### Step 3 — Storage

Persist HardenedSpec to memory (Layer 6) + `.pi/harness/specs/<spec-id>.json`.

### Step 4 — Versioning

If the spec is revised (ambiguity resolution, scope change), increment `spec_version`. Downstream layers check `spec_version` for drift detection.

### Step 5 — Archon integration

In the `harness-pipeline.yaml` workflow, this layer is the `harden-spec` node followed by the `resolve-ambiguities` loop node. Archon's loop handles the ambiguity resolution cycle; the pi.dev extension tool `harden-spec` does the AI call.

## AI prompt

```
You are a specification hardening agent. Given a raw task request, produce a structured specification.

For every aspect that is vague, underspecified, or ambiguous, create an AmbiguityFlag.
Be aggressive: multiple reasonable interpretations = ambiguity.
Unverifiable success = ambiguity.

Output strict JSON matching the HardenedSpec schema.

Rules:
- Every success criterion must be testable (if you cannot write a test, flag as ambiguous)
- Anti-criteria: what the solution MUST NOT do
- "blocking" severity = cannot proceed without resolution
- "warning" severity = proceed with caution, may cause rework
- definition_of_done = single boolean expression
- scope_boundary must explicitly list out-of-scope items

Raw request:
<request>
```

## Extension: `extensions/harness-spec.ts`

| Type | Name | Description |
|------|------|-------------|
| Event consumed | `session_start` | Check if spec exists; if not, request hardening |
| Event emitted | `spec_hardened` | `{ spec_id }` → consumed by Layer 2 |
| Tool | `harden-spec` | Takes raw text → produces HardenedSpec |
| Tool | `resolve-ambiguity` | Takes spec_id + ambiguity_id + resolution → updates spec |
| Tool | `approve-spec` | Human override: force-approve despite blocking ambiguities |
| Command | `/harness-spec-status` | Show current spec, unresolved ambiguities, version |

## Config (tuning only — layer always runs)

```json
{
  "spec_hardening": {
    "max_ambiguity_retries": 3,
    "auto_resolve_warning": true
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `max_ambiguity_retries` | 3 | Max ambiguity resolution loops before requiring manual override |
| `auto_resolve_warning` | true | Auto-resolve warning-level ambiguities with "proceed with best interpretation" |

## Error states

| Error | Recovery |
|-------|----------|
| `harden_spec_ai_failure` | Retry up to 2 times; escalate to human |
| `blocking_ambiguity_max_retries` | Present full list to human; require `approve-spec` override |
| `spec_version_conflict` | Layer 3 detects via grounding checkpoint; triggers replan |

## Token cost

~2,000 tokens per hardening call. Ambiguity resolution adds ~1,000 tokens per retry.