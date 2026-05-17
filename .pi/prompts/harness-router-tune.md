---
description: Propose model-router updates from eval evidence; apply only with explicit approval.
argument-hint: "--evidence <evidence.json> --candidate <candidate-router.json> [--proposal <out.json>]"
---

# harness-router-tune

Orchestrator — scripts + `harness/meta-optimizer` spawn. **Never** write `.pi/model-router.json` directly.

## Step 0 — Parse arguments

- required: `--evidence <evidence.json>`, `--candidate <candidate-router.json>`
- optional: `--proposal <out.json>`

If missing required args:

`Usage: /harness-router-tune --evidence <path> --candidate <path> [--proposal <out.json>]`

## Orchestration (required)

1. Parent validates evidence paths exist.
2. Optionally spawn:

```
Agent({ subagent_type: "harness/meta-optimizer", prompt: "mode: tune, evidence paths…" })
```

3. Parent runs proposal script:

```bash
node .pi/harness/router/propose-router-tuning.mjs \
  --evidence <evidence.json> \
  --candidate <candidate-router.json> \
  --proposal-out .pi/harness/router/proposals/<id>.json
```

4. `ask_user` approve / reject / edit (harness-decisions).
5. Apply only after approval:

```bash
node .pi/harness/router/apply-router-proposal.mjs \
  --proposal .pi/harness/router/proposals/<id>.json \
  --approve-by "<human>" \
  --justification "<reason>" \
  --write
```

## Completion

- `tuning_status`: `proposed`, `human_required`, or `rejected`
- Evidence gate summary
- Confirm `.pi/model-router.json` was not mutated without apply script
