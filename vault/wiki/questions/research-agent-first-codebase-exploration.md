---
type: synthesis
title: "Research: Agent-First Codebase Exploration Strategies"
created: 2026-04-30
updated: 2026-04-30
tags:
  - research
  - agent-architecture
  - codebase-exploration
  - harness-design
status: developing
related:
  - "[[oss-guide-codebase-exploration]]"
  - "[[aider-repomap-tree-sitter]]"
  - "[[swe-agent-aci]]"
  - "[[swe-bench]]"
  - "[[openhands-platform]]"
  - "[[agent-codebase-interface]]"
  - "[[progressive-disclosure-agents]]"
  - "[[repo-map-ranking]]"
  - "[[execution-feedback-loop]]"
  - "[[harness]]"
  - "[[grounding-checkpoints]]"
  - "[[structured-planning]]"
sources:
  - "[[oss-guide-codebase-exploration]]"
  - "[[aider-repomap-tree-sitter]]"
  - "[[swe-agent-aci]]"
  - "[[swe-bench]]"
  - "[[openhands-platform]]"
---

# Research: Rethinking OSS Codebase Exploration for AI Coding Agents

## Overview

The OSS Guide by Parth Parikh et al. (2020) is a human-centric manual for exploring large codebases. Every technique assumes a human developer with visual cortex, intuition, unlimited working memory, and gradual learning curves. AI coding agents have none of these. This synthesis maps each human technique to an agent-equivalent strategy — and identifies where the agent can actually do better.

The core finding: humans and agents need fundamentally different interfaces to the same codebase. The Agent-Codebase Interface (ACI) concept from SWE-agent formalizes this gap. Our harness must implement agent-native exploration strategies, not emulate human workflows.

---

## Key Findings

### 1. "Use the project" → "Map the project" (Source: [[oss-guide-codebase-exploration]], [[aider-repomap-tree-sitter]])

**Human strategy**: Build something with the project to learn its breadth through experiential exposure.

**Agent equivalent**: Construct a structured repo map — AST-parsed symbol definitions with cross-references, ranked by importance within token budget. Agents learn from structured information, not experiential use. Aider's repo map approach (tree-sitter + graph ranking) is the canonical implementation.

**Agent advantage**: Can ingest the entire symbol structure of a 100K-line codebase in ~2K tokens. A human would need days of exploration.

**Agent disadvantage**: Cannot form intuitive mental models. Every dependency must be explicitly represented.

### 2. "Check earliest commits" → "Check architectural spec" (Source: [[oss-guide-codebase-exploration]])

**Human strategy**: Read initial commits to understand the project's founding goals and core architecture.

**Agent equivalent**: Parse the current architecture, not historical commits. Agents don't benefit from evolutionary understanding — they need the current dependency graph. Architectural decision records (ADRs), SPEC.md files, and module-level docstrings are more valuable. Earliest commits may contain code that no longer exists or has been refactored beyond recognition.

**Verdict**: Skip for agents. Read current architecture docs instead.

### 3. "Test cases as documentation" → "Test cases as ground truth" (Source: [[oss-guide-codebase-exploration]], [[execution-feedback-loop]])

**Human strategy**: Read tests to understand expected behavior.

**Agent equivalent**: Execute tests as verification checkpoints in the feedback loop. Tests serve dual purpose: (a) documentation of expected behavior, (b) runtime verification of changes. Agents should extract test assertions as behavioral contracts and use failing tests as precision navigation (test output + stack trace → exact file:line of failure).

**Agent advantage**: Can run the entire test suite, extract structured failure data, and correlate failures to specific edits — all in seconds. Humans can't match this speed.

**Agent disadvantage**: Cannot visually "see" test patterns or infer missing test coverage without explicit tooling.

### 4. "Git log trick (80/20 rule)" → "Graph centrality ranking" (Source: [[oss-guide-codebase-exploration]], [[repo-map-ranking]])

**Human strategy**: `git log --name-only | sort | uniq -c | sort -rg` to find most-edited files — the 20% of files doing 80% of the work.

**Agent equivalent**: AST-based dependency graph with PageRank-style centrality. Most-referenced symbols = most important. This is more accurate than edit frequency because: (a) some core files rarely change (stable), (b) some frequently-edited files are just config/tests. Graph centrality captures structural importance, not historical churn.

**Implementation for harness**: tree-sitter parse → extract definitions + references → build file-to-file edge graph → rank by in-degree (reference count) → select top-k within token budget.

### 5. "Don't try to understand everything" → "Progressive disclosure" (Source: [[oss-guide-codebase-exploration]], [[progressive-disclosure-agents]])

**Human strategy**: Narrow scope to the relevant subsystem; treat everything else as a black box.

**Agent equivalent**: Identical principle, but implemented through [[progressive-disclosure-agents]] — a layered information architecture (L0: project map, L1: symbol map, L2: file context, L3: deep context). Agent starts with L0 always available, queries deeper layers on demand.

**Key difference**: Humans scope down through intuition. Agents scope down through structured queries — "show me all callers of function X" or "show me all implementations of interface Y." The tooling must support these queries efficiently.

### 6. "Paper Cut Principle" → "Coverage-driven exploration" (Source: [[oss-guide-codebase-exploration]])

**Human strategy**: Many small fixes across the codebase build deep understanding over time.

**Agent equivalent**: Agents don't learn over time (stateless across sessions unless persisted). Instead, they should ingest coverage information upfront: which files touch which subsystems, what the dependency boundaries are, where the hot paths live. A single comprehensive map is better than incremental learning. For persistent agents, store codebase understanding in the [[persistent-memory]] wiki layer.

**Recommendation**: Build the full repo map once (cached). Refresh on new sessions by diffing against cached map. Don't rely on gradual learning.

### 7. "Reproduce the issue" → "Automated reproduction + test capture" (Source: [[oss-guide-codebase-exploration]], [[execution-feedback-loop]])

**Human strategy**: Manually reproduce the bug to understand it, then write a failing test.

**Agent equivalent**: Automate reproduction when possible (script the steps). Generate a minimal failing test from the issue description. The test becomes the verification checkpoint. This is a core capability already in the [[grounding-checkpoints]] layer of our harness.

### 8. "Structured theorizing" → "Multi-hypothesis search" (Source: [[oss-guide-codebase-exploration]])

**Human strategy**: Brainstorm potential causes, verify each.

**Agent equivalent**: Generate multiple candidate fix locations based on error signatures, stack traces, and symbol maps. Verifying each through targeted code inspection. This is effectively what the [[adversarial-verification]] layer does — critic agents propose alternative hypotheses.

### 9. "Feedback from mentors" → "Adversarial verification" (Source: [[oss-guide-codebase-exploration]], [[adversarial-verification]])

**Human strategy**: Rubber duck debugging, mentor review, explain to someone else.

**Agent equivalent**: [[adversarial-verification]] — a separate critic agent reviews the proposed change, checks for edge cases, verifies against specifications, and either approves or sends back with specific failure reasons. This replaces the human mentor role.

### 10. "Hack it, then get it right" → "Iterative refinement with verification gates" (Source: [[oss-guide-codebase-exploration]])

**Human strategy**: Get a proof of concept working first, then polish.

**Agent equivalent**: This maps directly to the harness pipeline: [[structured-planning]] → [[grounding-checkpoints]] (smallest verifiable change) → execute → verify → iterate. The key difference: agents must pass verification at every checkpoint, not just at the end. Each iteration must produce a verifiable state.

---

## Agent-Superior Capabilities

Areas where agents outperform humans on codebase exploration:

| Capability | Why Agents Win |
|------------|---------------|
| Symbol-space ingestion | Can parse and index 100K+ symbols in seconds across entire codebase |
| Cross-reference tracking | Tree-sitter + graph algorithms find all callers/callees instantly |
| Multi-file correlation | Can hold 50+ files in context simultaneously (if within window) |
| Test execution speed | Can run thousands of tests, parse results, and correlate to changes |
| Pattern matching at scale | grep/semgrep/ast-grep across entire codebase in milliseconds |

## Agent-Weak Areas

Areas where agents need explicit tooling to compensate:

| Weakness | Mitigation |
|----------|-----------|
| No visual pattern recognition | Need explicit AST representations, not visual layouts |
| No intuition or mental models | Need explicit dependency graphs and data flow diagrams |
| Fixed context window | Need ranking and progressive disclosure to stay within budget |
| No learning across sessions | Need persistent memory ([[persistent-memory]] wiki layer) |
| Can't "skim" or scan | Need structured search with precise queries |
| No physical debugging | Need execution feedback loop with structured output |

---

## Implementation Recommendations for Our Harness

### Must-Have (L1-L3 integration)

1. **Repo Map Generator**: Integrate tree-sitter parsing into L3 ([[grounding-checkpoints]]) or as a pre-flight step. Produce ranked symbol map on every harness invocation.

2. **Progressive Disclosure API**: L0 always injected into context. L1 queryable by agent. L2/L3 available on explicit request.

3. **Execution Feedback Loop**: Every code change must trigger relevant test subset. Output must be structured (JSON error format with file:line:message).

4. **Persistent Codebase Understanding**: Cache repo maps in [[persistent-memory]]. Diff against cache on each session to identify changes.

### Should-Have (medium priority)

5. **Call Graph Queries**: "Show me all callers of X" / "Show me all implementations of interface Y" — implemented via tree-sitter reference tracking.

6. **Symbol-Level Diffs**: When a file changes, show which symbols were added/removed/modified — not just which lines changed.

7. **Test Impact Analysis**: Determine which tests are affected by a code change. Only run those. Essential for keeping the feedback loop fast.

### Nice-to-Have

8. **Architecture Diagram Generation**: Auto-generate module dependency diagrams from import graphs.

9. **Hotspot Detection**: Identify files/symbols with high churn + high reference count = high risk.

10. **Semantic Chunking**: Split files into semantically meaningful chunks (functions, classes, logical blocks) for more efficient context loading than raw line-based chunking.

---

## Contradictions

- [[oss-guide-codebase-exploration]] recommends "use the project" as the first step. [[aider-repomap-tree-sitter]] and [[swe-agent-aci]] show that structured mapping is superior for agents. Resolution: Use the project only to extract behavioral contracts (API surface, expected inputs/outputs), not for broad familiarization.

- [[oss-guide-codebase-exploration]] recommends checking earliest commits. Our analysis finds this ineffective for agents — architectural drift makes historical commits misleading. Resolution: Parse current architecture via AST, not git history.

## Open Questions

- How to handle dynamic languages (Python, JS) where tree-sitter can't resolve all references statically? (e.g., `getattr`, dynamic imports)
- What is the optimal token allocation between repo map vs. file contents vs. conversation history?
- How to handle monorepos where a single repo map would exceed even the largest context windows?
- Can we pre-compute and cache agent-specific codebase representations (embeddings, graphs) to avoid re-parsing on every invocation?
- How does the agent decide when to expand context (L0→L1→L2) vs. when to work with what it has?

## Sources

- [[oss-guide-codebase-exploration]]: Human-centric codebase exploration guide (2020)
- [[aider-repomap-tree-sitter]]: Tree-sitter + graph ranking for LLM code context (2023)
- [[swe-agent-aci]]: Agent-Computer Interfaces concept and SWE-agent system (2024)
- [[swe-bench]]: Benchmark for real-world software engineering tasks (2023)
- [[openhands-platform]]: Open platform for AI software developer agents (2024)
