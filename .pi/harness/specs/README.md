# Harness Artifact Contracts

This directory is the canonical contract surface for Phase 1 harness artifacts.

## Versioning

- Contract family version: `1.0.0`
- Each schema includes a `contract_version` field and `schema_version` metadata.
- Backward-compatible additions: add optional fields only.
- Breaking changes: bump major version and add migration notes before use.

## Scope

These schemas define the minimum machine-readable contracts for:

- planning (`PlanPacket`, `PlanDecompositionBrief`, `PlanHypothesisBrief`, `PlanHypothesisEval`, `PlanAdversaryBrief`)
- execution telemetry (`RunTrace`, `HarnessRunRecord`)
- PostHog harness events (`HarnessPostHogEvent`)
- observation bus (`HarnessObservation`)
- independent evaluation (`EvalVerdict`)
- adversarial findings (`AdversaryReport`)
- incidents and overrides (`IncidentRecord`)
- debate rounds (`RoundResult`)
- policy consensus (`ConsensusPacket`)
- budget hard-stop events (`BudgetExhausted`)
- router tuning proposals (`RouterTuningProposal`)

## Governance Defaults Locked In

- Debate profile is `aggressive` (`max_rounds=6`, `round_token_cap=2500`, `debate_global_cap=35000`)
- Consensus confidence weights are fixed at:
  - `claim_quality=0.20`
  - `reproducibility=0.40`
  - `agreement=0.40`
- Severity policy gate thresholds are fixed at:
  - `security>=0.70` or `correctness>=0.70` blocks
  - `architecture>=0.80` or `test_integrity>=0.80` blocks
- Strict pre-PR gate prerequisites are explicit and must all pass.
- Policy override allows one human approver only, with mandatory justification.
