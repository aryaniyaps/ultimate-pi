---
description: Ad-hoc naming convention review — spawn harness/ls-lint-steward with graphify evidence.
argument-hint: "[--run <run-id>]"
---

# harness-ls-lint-steward

You are the **chair** for ls-lint **intent** evolution (manifest → `.ls-lint.yml`). Spawn **`harness/ls-lint-steward`** only — do not edit the manifest inline without a proposal artifact.

**Skill:** `harness-ls-lint-setup` — bootstrap vs steward vs sync.

## When to run

- Plan or run adds paths/extensions not covered by `naming.manifest.json`
- Post-run `ls-lint` failures suggesting missing scoped rules (before replan)
- User requests naming convention change

## Spawn

```
subagent({
  agentScope: "both",
  agent: "harness/ls-lint-steward",
  task: "<HarnessSpawnContext + planning-context + execution-plan-draft + ls-lint output if any>"
})
```

Gate: `harness_artifact_ready({ paths: ["artifacts/ls-lint-manifest-proposal.yaml"] })`

## Chair applies (after `human_required` cleared)

Read `artifacts/ls-lint-manifest-proposal.yaml`.

If `change_class` is `none`, report and stop.

Otherwise:

1. Apply `manifest_patch` to `.pi/harness/ls-lint/naming.manifest.json`.
2. `node "$UP_PKG/.pi/scripts/harness-ls-lint-bootstrap.mjs" --force`
3. Append session entry `harness-naming-changed` (triggers extension sync on `agent_end`).
4. Optional: `node "$UP_PKG/.pi/scripts/harness-ls-lint-cli.mjs"` to confirm pass.

Report `change_class`, whether manifest was updated, and ls-lint outcome if run after sync.
