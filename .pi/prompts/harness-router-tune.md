---
description: Propose model-router updates from eval evidence; apply only with explicit approval.
argument-hint: "--evidence <evidence.json> --candidate <candidate-router.json> [--proposal <out.json>]"
---

# harness-router-tune

Router tuning is **propose-and-approve only**.

## Step 0 — Parse arguments

Read `$ARGUMENTS` and parse:

- required: `--evidence <evidence.json>`, `--candidate <candidate-router.json>`
- optional: `--proposal <out.json>`

If required args are missing, stop and return:

`Usage: /harness-router-tune --evidence <evidence.json> --candidate <candidate-router.json> [--proposal <out.json>]`

## Process

1. Validate evidence completeness and guard status.
2. Generate a proposal artifact only (no live router mutation).
3. Require explicit human approval metadata before any apply step.

## Never-do rule

- Never write `.pi/model-router.json` directly from this command.

## Proposal flow

1. Build proposal:

```bash
node .pi/harness/router/propose-router-tuning.mjs \
  --evidence <evidence.json> \
  --candidate <candidate-router.json> \
  --proposal-out .pi/harness/router/proposals/<id>.json
```

2. Review proposal (human approval required).
3. Apply only with explicit approver + justification:

```bash
node .pi/harness/router/apply-router-proposal.mjs \
  --proposal .pi/harness/router/proposals/<id>.json \
  --approve-by "<human>" \
  --justification "<reason>" \
  --write
```

## Evidence requirements

- Minimum sample count threshold met.
- Pre/post success-rate delta included.
- Cost-per-task delta included.
- Regression guard status present and passing.

If any requirement is missing, stop with `human_required`.

## Guardrails

- Do not overthink weak evidence; reject incomplete proposals quickly.
- Only produce proposal/apply instructions within this contract.
- Never apply tuning without explicit human approver identity and justification.

## Completion behavior

End with:

- `tuning_status` (`proposed`, `human_required`, or `rejected`)
- evidence gate summary (sample count, success delta, cost delta, regression guard)
- explicit non-mutation confirmation for `.pi/model-router.json`
