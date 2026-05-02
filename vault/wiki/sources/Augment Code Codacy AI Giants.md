---
type: source
status: ingested
source_type: podcast-recap
author: Codacy (interview with Vinay Perneti, VP Engineering at Augment Code)
date_published: 2026-03-30
url: https://blog.codacy.com/ai-giants-how-augment-code-solved-the-large-codebase-problem
confidence: high
key_claims:
  - "Custom embedding and retrieval models trained in pairs for maximum quality"
  - "New engineer ran evals in week one, shipped models in week two"
  - "Context as API: allowing companies to add their own context sources programmatically"
  - "60-80% code review acceptance rate"
  - "Roadmaps are dead — plan in quarters not years"
  - "Only 3 model choices vs competitors' 20+"
  - "Contractor vs employee model: contractors have intelligence, employees have context"
tags:
  - augment-code
  - context-engine
  - engineering-interview
  - enterprise
created: 2026-05-02
updated: 2026-05-02

---# How Augment Code Solved the Large Codebase Problem (Codacy AI Giants)

## Summary

Codacy CEO Jaime Jorge interviewed Vinay Perneti, VP of Engineering at Augment Code, about building AI tools that work in the real world of legacy code, technical debt, and million-line repositories.

## Key Engineering Insights

### Three-Pronged Context Strategy
1. **Research-driven embeddings**: Custom embedding and retrieval models trained in pairs for maximum quality.
2. **Expanding context sources**: Recently added PR history because "adding a feature flag touches like 20 different places."
3. **Context as an API**: Soon allowing companies to add their own context sources programmatically.

### The "Contractor vs Employee" Model
- Contractors borrow intelligence but lack context.
- Full-time employees have both intelligence and context.
- Augment provides context (like an FTE), using best-in-class models for intelligence.
- Result: only 3 model choices offered vs competitors' 20+.

### Onboarding Revolution
- Traditional: 4-5 months to become productive on large codebases.
- With Augment: 6 weeks to ship complex PRs touching wide ranges of codebase.
- New engineering manager: ran evals week one, shipped models week two.

### Code Review Evolution
- 60-80% acceptance rate on AI suggestions (higher than many human reviews).
- AI handles technical details, humans focus on direction and architecture.
- "Automation bias is cultural, not technical — the person pushing the PR owns the code."

### Pricing Evolution
- Moved from per-message pricing to usage-based pricing.
- Prompt enhancer made each message do exponentially more work, breaking old pricing model.
- Transparent, compute-cost-aligned pricing.

### Planning Philosophy
- "Roadmaps are dead" — threw out entire 2025 roadmap on January 25th.
- Now plan in quarters, not years.
