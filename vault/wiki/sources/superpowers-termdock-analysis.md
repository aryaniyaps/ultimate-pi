---
type: source
source_type: article
author: Danny Huang / Termdock
date_published: 2026-03-17
date_accessed: 2026-05-05
url: https://www.termdock.com/en/blog/superpowers-framework-agent-skills
confidence: high
key_claims:
  - "89K+ GitHub stars as of March 2026, one of the fastest-growing developer tools"
  - "Superpowers enforces process with hard gates, not suggestions"
  - "Subagent-driven development is the architectural innovation — fresh context per task, two-stage review"
  - "Cross-agent compatibility via plain Markdown SKILL.md files"
  - "Rigid where it matters (TDD, debugging), flexible where it doesn't (brainstorming, code review)"
---

# Superpowers: Skills Framework Reshaping AI Dev (Termdock)

## Summary

Comprehensive third-party analysis of Superpowers by Termdock (March 2026). Provides detailed breakdown of each core skill, the philosophical design, and practical usage guidance.

## Key Analysis Points

### The Core Insight
AI agents are smart but undisciplined. They jump to implementation, skip tests, guess at architecture. The fix is not a better model — it is giving the agent structured process with hard gates. A skill saying "write tests first" gets ignored. A skill saying "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST. Delete code written before tests. Start over." gets followed.

### Philosophy: Rigid Where It Matters, Flexible Where It Doesn't
- **TDD and debugging** — Rigid. Iron laws, explicit prohibitions, delete-and-restart consequences. Cutting corners in these domains causes compounding damage.
- **Brainstorming** — Structured but adaptive. Hard gate (no code before design approval), but questions and approaches vary by context.
- **Code review** — Advisory. Reports findings and severity. Human decides which to fix.

### What Makes This Different from Good Prompts
A single prompt instruction is a suggestion. The agent follows it when convenient, ignores it under pressure. A Superpowers skill is a process with enforcement. "Speed limit sign versus speed bump. One informs. The other physically prevents."

The compounding effect: Brainstorming produces a spec → spec feeds into plan → plan feeds into subagent development → subagents follow TDD → code review catches what TDD missed. Each skill's output is the next skill's input.

### Cross-Agent Compatibility
Skills are Markdown files, not platform-specific plugins. Claude Code has deepest integration (`allowed-tools`, automatic updates, native subagents). Other agents get core workflow without advanced orchestration. Works with Claude Code, Cursor, Codex CLI, OpenCode, Gemini CLI, Qwen Code, Goose CLI, Auggie.

### Real Results
chardet 7.0.0 shipped using Superpowers: 41x faster, 96.8% accuracy, dozens of longstanding issues fixed. Test suite covering 2,161 files across 99 encodings was a direct product of TDD enforcement.

## Relevance to Harness
Confirms that enforcement mechanism (hard gates > suggestions) is the differentiating factor. Validates our approach of making harness layers mandatory. The "composable workflow where output feeds into next skill" mirrors our L1→L2→L3→L4 pipeline design.
