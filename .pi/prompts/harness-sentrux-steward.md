---
description: Ad-hoc architectural intent review — spawn harness/sentrux-steward with graphify evidence.
argument-hint: "[--run <run-id>]"
---

# harness-sentrux-steward

You are the **chair** for Sentrux **intent** evolution (manifest → rules.toml). Spawn **`harness/sentrux-steward`** only — do not edit the manifest inline without a proposal artifact.

**Skill:** `harness-sentrux-setup` — bootstrap vs steward vs sync.

## When to use

- User requests manifest / rules refresh
- After `/harness-plan` when execution plan adds top-level paths not covered by manifest layer globs
- Debate `quality` focus flags structural risk
- Post-run `sentrux check` failures suggesting missing boundaries (before replan)

Do **not** spawn on every `/harness-review`.

## Step 0 — Context

Use `[HarnessRunContext]` / `[HarnessActivePlan]`. Optional `--run <run-id>` for recovery.

## Step 1 — Spawn steward

```
subagent({
  agentScope: "both",
  agent: "harness/sentrux-steward",
  task: "<HarnessSpawnContext + plan_packet_path + planning-context.yaml + execution-plan paths + scope hint>"
})
```

Gate: `harness_artifact_ready({ paths: ["artifacts/sentrux-manifest-proposal.yaml"] })`

## Step 2 — Chair decision

Read `artifacts/sentrux-manifest-proposal.yaml`.

- `change_class: none` → report no manifest change; stop.
- Otherwise → `ask_user` with summary, evidence bullets, and `adr_draft` if `adr_required`.

On approval:

1. Apply `manifest_patch` to `.pi/harness/sentrux/architecture.manifest.json` (parent `write` or manual edit).
2. `node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs" --force`
3. Append session custom entry `harness-architecture-changed` (triggers rules sync extension).
4. If `adr_required`, file harness ADR snippet or `docs/adr/` entry per team convention.

On reject: keep manifest unchanged; document decision in run notes.

## Completion

Report `change_class`, whether manifest was updated, and `sentrux check` outcome if run after sync.
