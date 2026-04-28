# Layer 4 — Adversarial Verification

## Origin principle

Human code review is partly social and partly quality control. For agents, only quality control matters — and it should be **much stronger**. Instead of a cooperative peer, output is reviewed by a **critic agent whose explicit role is to find failures**. Multiple independent critics with different focus areas are better than one. **This layer is mandatory. No code ships without passing adversarial review.**

## Purpose

After each subtask completes, run it through one or more critic agents specialized in different attack surfaces. A single critical-severity failure blocks the subtask. Review is adversarial: attack, don't suggest improvements.

## Data contract

```typescript
type CriticFocus = "correctness" | "security" | "performance" | "spec_compliance";

type CriticReview = {
  critic_id: string;
  focus: CriticFocus;
  verdict: "pass" | "fail" | "conditional_pass";
  failures: CriticFailure[];
  timestamp: string;
};

type CriticFailure = {
  severity: "critical" | "major" | "minor";
  description: string;
  evidence: string;
  remediation: string;
};
```

### Verdict semantics

| Verdict | Meaning | Action |
|---------|---------|--------|
| `pass` | No failures found | Proceed to Layer 5 |
| `fail` | At least one critical/major failure | Subtask must be reworked |
| `conditional_pass` | Only minor issues | Proceed with logged caveats |

### Failure severity

| Severity | Blocks? | Description |
|----------|---------|-------------|
| `critical` | Yes | Will cause incorrect behavior, data loss, security breach |
| `major` | Yes | Significant defect that should be fixed before proceeding |
| `minor` | No | Style/cosmetic or unlikely edge case |

## Behavior

### Entry: `subtask_completed` event (always received)

### Review flow (always runs)

```
subtask_completed(task_id, plan_id)
    ↓
Collect context: diff, task description, success criteria, anti-criteria
    ↓
For each focus_area in config (default: correctness, spec_compliance):
    → AI call with adversarial prompt
    → Parse into CriticReview
    ↓
Aggregate verdicts:
  ANY fail → subtask_failed → rework loop (up to max_attack_rounds)
  ALL pass → subtask_verified → Layer 5
  Only minor → conditional_pass → Layer 5 with caveats
    ↓
Store CriticReviews in memory + .pi/harness/reviews/
```

### Default critic set

**Correctness** and **spec_compliance** always run. **Security** and **performance** are added for risk-sensitive changes (configurable via `focus_areas`).

### Retry logic (Rework loop)

Failed subtask → rework → re-review. Up to `max_attack_rounds` (default 2). If exhausted, the plan is blocked and escalated to human. This is implemented as the Archon workflow loop in `execute-plan`.

### Archon integration

The `execute-plan` loop node handles rework naturally: if `run-critics` returns failures, the loop continues with a rework prompt. The `max_attack_rounds` config controls how many rework cycles are attempted.

## Critic prompt templates

All critics use the same output format:

```json
{
  "verdict": "pass" | "fail" | "conditional_pass",
  "failures": [
    {
      "severity": "critical" | "major" | "minor",
      "description": "<what is wrong>",
      "evidence": "<exact location or code snippet>",
      "remediation": "<minimal fix>"
    }
  ]
}
```

### Correctness critic

```
You are a correctness attacker. Your ONLY job is to find correctness failures.
Do NOT suggest improvements. Do NOT be constructive. Find BUGS.

Attack vectors: logic errors, off-by-one, unhandled edges, race conditions,
null/undefined dereferences, type mismatches, missing error handling.

Changed files: <diff>
Task specification: <task_description>
Success criteria: <success_criteria>
```

### Security critic

```
You are a security attacker. Find security vulnerabilities. ATTACK.

Attack vectors: injection, auth bypass, data exposure, insecure defaults,
missing input validation, privilege escalation.

Changed files: <diff>
Task specification: <task_description>
```

### Performance critic

```
You are a performance attacker. Find performance failures. ATTACK.

Attack vectors: N+1 queries, unbounded loops, memory leaks, blocking async,
O(n²) where O(n) achievable, missing pagination.

Changed files: <diff>
Task specification: <task_description>
```

### Spec-compliance critic

```
You are a spec-compliance attacker. Find deviations from specification. ATTACK.

Attack vectors: missing functionality, anti-criteria violations, scope creep,
definition of done not met, ambiguity resolution not followed.

Specification: <spec_json>
Task: <task_description>
Anti-criteria: <anti_criteria>
```

## Extension: `extensions/harness-critics.ts`

| Type | Name | Description |
|------|------|-------------|
| Event consumed | `subtask_completed` | Begin critic review |
| Event emitted | `subtask_verified` | `{ task_id, plan_id, reviews }` → Layer 5 |
| Event emitted | `subtask_failed` | `{ task_id, plan_id, reviews, retry_count }` → Layer 3 rework |
| Tool | `run-critics` | Run all/specified critics on a task |
| Tool | `run-critic-focus` | Run single focus-area critic |
| Command | `/harness-critic-status` | Recent reviews, pass/fail counts |

## Config (tuning only — layer always runs)

```json
{
  "critics": {
    "focus_areas": ["correctness", "spec_compliance"],
    "max_attack_rounds": 2
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `focus_areas` | ["correctness", "spec_compliance"] | Which critics to run. Options: correctness, security, performance, spec_compliance |
| `max_attack_rounds` | 2 | Max rework+re-review cycles before escalation |

## Error states

| Error | Recovery |
|-------|----------|
| `critic_ai_failure` | Retry up to 2 times; persistent failure → conditional_pass with logged failure |
| `critic_timeout` | conditional_pass with caveat; log warning |

## Token cost

~2,000 per critic per subtask. Default 2 critics = ~4,000. All 4 = ~8,000.