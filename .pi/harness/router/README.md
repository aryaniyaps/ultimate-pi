# Router Tuning Flow

Router tuning is intentionally split into two steps:

1. **Propose** (`propose-router-tuning.mjs`)
2. **Approve + apply** (`apply-router-proposal.mjs`)

Blind writes to `.pi/model-router.json` are prohibited by design.

## Proposal

```bash
node .pi/harness/router/propose-router-tuning.mjs \
  --evidence /path/to/evidence.json \
  --candidate /path/to/candidate-router.json \
  --proposal-out .pi/harness/router/proposals/proposal-001.json
```

## Apply (requires explicit human approval + justification)

```bash
node .pi/harness/router/apply-router-proposal.mjs \
  --proposal .pi/harness/router/proposals/proposal-001.json \
  --approve-by "human.name" \
  --justification "why this is safe" \
  --write
```

## Safety checks

- Evidence threshold must pass (`sample_count >= min_sample_count`)
- Regression guard must pass
- Base router hash in proposal must match current `.pi/model-router.json`
- Apply requires explicit approver and justification
- Current router file is backed up before write
