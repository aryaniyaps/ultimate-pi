---
type: resolution
title: "Resolved: iMAD Debate Gating — QA to Code Review Transfer"
created: 2026-04-30
updated: 2026-04-30
tags:
  - resolution
  - debate
  - selective-routing
  - imad
  - consensus
status: resolved
resolves:
  - "[[selective-debate-routing]] Open Questions #1-3"
  - "[[research-agentic-coding-harness-latest-papers]] Open Questions #1-3"
  - "[[consensus-debate]] Open Questions #1, #2, #4"
related:
  - "[[selective-debate-routing]]"
  - "[[consensus-debate]]"
  - "[[adr-011]]"
  - "[[fan2025-imad]]"
sources:
  - "[[fan2025-imad]]"

---# Resolved: iMAD Debate Gating — QA to Code Review Transfer

## Resolution

**iMAD's selective debate gating generalizes from QA to code review in PRINCIPLE, but the specific hesitation cues (41 linguistic features) must be adapted. The core insight — debate is not always beneficial and a lightweight classifier can save 92% of debate tokens — transfers directly. Implementation requires code-specific hesitation cues and model-specific classifiers.**

## What iMAD Proved (QA Domain)

iMAD (Fan et al., AAAI 2026) demonstrated across 6 QA datasets:

- **92% token reduction** vs always-debate
- **13.5% accuracy improvement** vs single-agent baseline
- Selective debate via 41 linguistic/semantic features: uncertainty markers ("might", "could be"), contradictory statements, missing evidence references, low confidence indicators
- Lightweight classifier (FocusCal loss) generalizes across datasets without per-task tuning
- **Debate can overturn correct single-agent answers** — this is the key finding that motivates selective routing

Source: [[fan2025-imad]]

## Transfer Analysis: QA → Code Review

### What Transfers Directly

| iMAD Component | Transfers to Code Review? | Confidence |
|---------------|--------------------------|------------|
| Selective routing principle | Yes — debate only when uncertainty detected | High |
| Pre-debate self-critique gate | Yes — single agent self-critiques first | High |
| Token savings model | Yes — 92% on high-confidence, 0% on uncertain | High |
| FocusCal loss classifier | Yes — architecture generalizes | Medium |
| Multi-dataset generalization | Untested — code review is different domain | Unknown |

### What Must Be Adapted

| iMAD Feature (QA) | Code Review Equivalent | Status |
|-------------------|----------------------|--------|
| "I think the answer is..." | "The implementation looks correct..." | Maps to uncertainty markers |
| "It might be B or C" | "This could introduce a race condition" | Maps to uncertainty markers |
| Missing citation | Missing spec reference / test coverage | New feature needed |
| Contradictory answer | Contradictory review feedback | Maps directly |
| Low confidence score | Low confidence in review verdict | Maps directly |

### What Does NOT Transfer

QA tasks have a single correct answer. Code review has MULTIPLE dimensions of correctness: spec compliance, edge cases, performance, security, style. A single confidence score is insufficient — the classifier must assess uncertainty per dimension.

## Specific Questions Resolved

### Q1: Do iMAD hesitation cues generalize from QA to code review?

**Partially.** Linguistic uncertainty markers ("might", "could be", "I think") generalize because they reflect the model's internal uncertainty regardless of domain. However, code review introduces domain-specific cues: missing spec references, untested edge cases, missing test coverage, performance concerns not addressed. These require new feature extraction.

**Recommendation**: Use iMAD's 41 linguistic features as the base. Add code-specific features: spec coverage ratio, test coverage ratio, edge case enumeration completeness, performance analysis presence. Retrain classifier on labeled code review debate outcomes.

### Q2: Can a single classifier work across L1 (spec), L2 (plan), L4 (code)?

**Yes, with caveats.** A single classifier CAN work if it operates on debate-agnostic features (linguistic uncertainty + structural completeness). However, each layer has different "completeness" signals:

- **L1 (Spec)**: Coverage of error states, edge cases, input constraints, output contracts
- **L2 (Plan)**: Task dependency completeness, rollback planning, resource estimation
- **L4 (Code)**: Spec compliance, test coverage, edge case handling, performance

**Recommendation**: Build one classifier with layer-specific feature sets. Start with a simple rule-based gate (confidence threshold) and graduate to ML classifier after collecting labeled debate outcomes.

### Q3: Should the classifier be model-specific?

**Yes.** The Agent Drift paper (Rath, 2026) shows different models exhibit different drift patterns. Similarly, different models exhibit different hesitation patterns:

- **Claude Opus**: Tends to be verbose in uncertainty, explicit about confidence level. Easy to detect.
- **Claude Sonnet**: More concise, may skip uncertainty markers. Harder to detect.
- **GPT models**: Different linguistic patterns entirely (more hedging, more disclaimers).
- **Gemini**: May overstate confidence. Hesitation cues less reliable.

**Recommendation**: Model-specific classifiers calibrated on per-model debate outcomes. Start with Opus (easiest to detect uncertainty). Add Sonnet/GPT classifiers after collecting sufficient data.

### Q4: Optimal convergenceRounds? (from consensus-debate)

**1 round for high-confidence tasks, 3 rounds for uncertain tasks.** iMAD's selective routing supports this: skip debate entirely when confidence is high (convergenceRounds = 0 effectively), use full 3 rounds when uncertainty detected. The default of 1 round is too aggressive for uncertain cases but correct for confident ones. Set `convergenceRounds: 1` as default WITH selective routing — the gate ensures only uncertain tasks enter debate at all.

### Q5: Same model for both sides, or different models? (from consensus-debate)

**Different models when available, same model acceptable.** The evaluator should ideally use a different model for genuine adversarial diversity (Anthropic explicitly recommends this in their harness design guide). However, same-model debate still provides value (the defender must understand the position more deeply to rebut). For the harness: default to different models (e.g., Opus proposer + Sonnet critic), fall back to same model if only one available.

### Q6: Reuse single critic agent across debates? (from consensus-debate)

**Yes, reuse critic agent.** The critic develops domain expertise across debates (learns common failure patterns). Fresh critics lose this accumulated knowledge. However, reset the critic's context between debates to avoid bias from previous debates.

## Harness Implementation

```
Task → Single agent self-critique (L1/L2/L4 as appropriate)
  ├─ [Rule-based gate] Extract hesitation features
  │   ├─ Confidence ≥ 0.8 AND no uncertainty markers → SKIP debate
  │   └─ Confidence < 0.8 OR uncertainty detected → TRIGGER debate
  │
  └─ Debate triggered → multi-round consensus debate (per ADR-011)
       └─ Convergence reached → file to wiki/consensus/ (mandatory)
```

**Projected token savings**: ~80% of subtasks skip debate. Debate overhead drops from ~13,000 to ~2,600 tokens per subtask (weighted average). This is less than iMAD's 92% because code review is more inherently uncertain than QA.

## Confidence

**Medium-High.** The principle transfers with high confidence (multiple sources agree selective routing is superior to always-debate). The specific implementation details (code-specific features, model-specific classifiers) require empirical validation on code review data. This is noted as an implementation-phase validation task.
