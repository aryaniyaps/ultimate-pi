---
type: concept
title: "Majority Vote Ensembling"
created: 2026-04-30
tags:
  - agent-architecture
  - llm
  - ensembling
aliases:
  - Solution Ensembling
related:
  - "[[Dual-Model Agent Architecture]]"
sources:
  - "[[Augment SWE-bench Agent GitHub]]"
---

# Majority Vote Ensembling

A technique where an agent generates multiple candidate solutions to the same problem, then uses an LLM (or voting mechanism) to select the best one. Used by Augment Code's SWE-bench agent to boost success rates.

## How Augment Implements It

1. Run the core agent (Claude Sonnet 3.7) N times on the same problem (typically N=8).
2. Each run produces a candidate solution (diff).
3. Run evaluation harness on each candidate to get pass/fail outcomes.
4. Feed all candidates + outcomes to OpenAI o1 with a prompt asking it to select the best solution.
5. o1 returns the index of the selected solution.

## Input Format
```json
{
  "id": "problem-1",
  "instruction": "Fix the login timeout issue",
  "diffs": ["diff1", "diff2", "..."],
  "eval_outcomes": [
    {"is_success": true},
    {"is_success": false}
  ]
}
```

## Why It Works

1. **Variance reduction**: Multiple independent runs reduce the impact of any single bad generation.
2. **Complementary failures**: Different runs fail on different aspects; ensembling can pick the run that succeeded.
3. **LLM-as-judge**: o1's reasoning capabilities are better suited for comparative analysis than code generation.
4. **Evaluation-guided**: Including eval outcomes helps the ensembler distinguish between functionally correct and incorrect solutions.

## Cost Consideration

Running N candidates multiplies cost by N. Augment's approach: use a fast/cheap model (Sonnet) for the N runs, then an expensive model (o1) only for the single ensembling step.

## Implementation for Our Harness

```python
def ensemble_solutions(problem: str, candidates: int = 5) -> str:
    solutions = []
    for i in range(candidates):
        # Run agent independently
        diff = run_agent(problem)
        result = evaluate(diff)
        solutions.append({"diff": diff, "success": result.passed})
    
    # Select best via LLM ensembler
    best = llm_ensembler.select_best(problem, solutions)
    return best.diff
```
