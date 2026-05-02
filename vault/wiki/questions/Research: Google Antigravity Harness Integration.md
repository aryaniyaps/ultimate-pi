---
type: synthesis
title: "Research: Google Antigravity Harness Integration"
created: 2026-05-01
updated: 2026-05-01
tags:
  - research
  - antigravity
  - google
  - harness
  - agent-first
  - integration
status: developing
related:
  - "[[antigravity-agent-first-architecture]]"
  - "[[agent-artifacts-verifiable-deliverables]]"
  - "[[browser-subagent-visual-verification]]"
  - "[[harness-implementation-plan]]"
  - "[[agentic-harness]]"
  - "[[model-adaptive-harness]]"
  - "[[self-evolving-harness]]"
  - "[[cursor-harness-innovations]]"
sources:
  - "[[google-antigravity-official-blog]]"
  - "[[google-antigravity-wikipedia]]"
  - "[[cursor-vs-antigravity-2026]]"

---# Research: Google Antigravity Harness Integration

## Overview

Google Antigravity is an agent-first development platform (launched November 18, 2025 alongside Gemini 3). It represents the first major IDE platform built from the ground up for autonomous coding agents — not an AI plugin bolted onto an existing editor. This research identifies SOTA innovations, maps them against our harness implementation plan, and proposes integration from first principles.

## Key Findings

### SOTA Innovations

1. **Agent-First Dual-View Architecture** (Source: [[google-antigravity-official-blog]]): Editor View for hands-on coding + Manager View for multi-agent orchestration. This is a fundamentally different approach from our sequential pipeline model.

2. **1M Token Context Window** (Source: [[cursor-vs-antigravity-2026]]): Ingests entire repositories into active memory instead of RAG-based retrieval. Natively understands cross-file dependencies. Tradeoff: massive token cost ($249.99/mo Ultra plan partly due to this).

3. **Browser Subagent with Visual Verification** (Source: [[cursor-vs-antigravity-2026]]): Agent drives headless Chromium, takes screenshots, analyzes pixels with vision models. Closes the loop on UI changes. Our harness has NO equivalent capability.

4. **Artifact-Based Trust System** (Source: [[google-antigravity-official-blog]]): Agents produce human-reviewable deliverables (task lists, screenshots, recordings) instead of raw tool logs. Asynchronous feedback on artifacts without stopping execution.

5. **Skills with Progressive Disclosure** (Source: gap-fill research): SKILL.md files loaded only when semantically relevant. Community ecosystem ported from Claude Code. Directly analogous to our `.pi/skills/SKILL.md` system.

6. **Cross-Project Learning Knowledge Base** (Source: [[google-antigravity-official-blog]]): Agents save successful strategies, code patterns, and solutions. Query across projects. Extends our L6 persistent memory concept.

7. **Nano Banana (Built-in Asset Generation)** (Source: [[cursor-vs-antigravity-2026]]): Integrated image generator for UI assets directly in IDE. No external tools needed.

8. **Deep System-Level AI Integration** (Source: [[google-antigravity-wikipedia]]): VS Code fork where AI is a system primitive, not an extension. Google hired Windsurf team + licensed tech for $2.4B.

### What Antigravity Validates from Our Plan

| Our Feature | Antigravity Equivalent | Confidence |
|-------------|----------------------|------------|
| Model-adaptive harness | Multi-model support (Gemini, Claude, GPT-OSS) with model-specific strengths | **high** |
| Dynamic context | 1M token context window (different approach, same problem) | **medium** |
| Pre-verification isolation (P15b) | Visual verification via browser subagent | **high** |
| Subagent specialization (P25) | Manager View multi-agent orchestration | **high** |
| Self-evolving harness (F1) | Cross-project learning knowledge base | **high** |
| Skills system (F0) | SKILL.md progressive disclosure | **high** |
| Adversarial verification (L4) | Artifact-based proof (complementary, not competing) | **medium** |

### Critical Gaps Revealed

1. **No Browser Control (NEW GAP)**: Our harness has zero visual verification capability. Browser subagent is Antigravity's killer feature. Phase P30 needed.

2. **No Artifact Generation (NEW GAP)**: Our harness produces raw verification results (pass/fail, metrics). No human-reviewable deliverables. Phase P31 needed.

3. **No Cross-Project Learning (PARTIAL GAP)**: L6 persistent memory is project-scoped. Cross-project knowledge transfer would accelerate agent performance. Phase P32 needed.

4. **No Manager View / Control Plane (ARCHITECTURAL GAP)**: L7 orchestration is DAG-based sequential, not parallel agent dispatch. This is intentional for our CLI harness but worth reconsidering.

5. **Context Strategy Divergence**: We use selective context (hot cache → index → pages). Antigravity uses massive context (1M tokens). Which is better? Depends on cost tolerance.

## Key Entities

- **Google Antigravity**: Agent-first IDE platform. Free public preview. VS Code fork. $2.4B Windsurf acquisition.
- **Gemini 3.1 Pro**: Primary model powering Antigravity agents. Google's frontier coding model.
- **Windsurf**: AI IDE acquired by Google ($2.4B, July 2025). Team now building Antigravity.

## Key Concepts

- [[antigravity-agent-first-architecture]]: The two-view (Editor + Manager) control plane model
- [[agent-artifacts-verifiable-deliverables]]: Trust via human-reviewable deliverables
- [[browser-subagent-visual-verification]]: Headless browser agent for UI verification

## Contradictions

- **1M Context Window vs RAG**: Antigravity bets on massive context. Our harness bets on selective retrieval. [[cursor-vs-antigravity-2026]] notes Antigravity's approach has massive cost implications ($249.99/mo Ultra plan). Our approach is more token-efficient but may miss cross-file dependency understanding. Verdict: both valid. Different cost/accuracy tradeoffs.

- **Agent-First vs Pipeline-First**: Antigravity trusts agents to verify themselves (artifacts). Our harness enforces verification through pipeline stages (L3, L4). Both approaches have failure modes: agent self-verification misses errors; pipeline verification adds latency. Verdict: complementary. Best harness has both.

## Open Questions

- What would a CLI-native "Manager View" look like? Can we achieve multi-agent orchestration without a GUI?
- At what task complexity does visual verification become necessary vs. nice-to-have?
- Can cross-project learning be implemented without privacy/compliance issues?
- How does Antigravity's approach to model-adaptive tool provisioning compare to our provider-native prompting (P22b)?

## Integration Recommendations

Three new phases for the [[harness-implementation-plan]]:

### P30: Browser Subagent Integration (L3 tools)
Add headless browser control capability via browser-harness (9.4K stars, MIT, thin CDP harness by browser-use). Self-healing: agent writes missing helpers mid-execution. Direct CDP access — one WebSocket to Chrome, nothing between. TypeScript variant: browser-harness-js (428 stars, 652 typed CDP methods). Replaces Puppeteer. See [[Source: browser-harness CDP Harness]] and [[browser-harness-agent]].

### P31: Artifact Generation Layer (L4→L5 bridge)
After L4 adversarial verification, agents generate human-reviewable artifacts: screenshots, browser recordings, test result summaries. Artifacts feed into L5 observability. Provides the "prove it worked" complement to L4's "prove it's wrong."

### P32: Cross-Project Learning Knowledge Base (L6 extension)
Extend persistent memory to support cross-project knowledge transfer. Agents save successful strategies and code patterns tagged by domain. Query across projects with relevance scoring. Foundation for F1 self-evolving harness.

### What We Should NOT Adopt
- **1M Token Context Window**: Token-inefficient for CLI harness. Selective context is better.
- **Full IDE Integration**: Our harness is CLI-level. Different architecture, different constraints.
- **Google Cloud Lock-in**: Antigravity's deep GCP integration is vendor lock-in. Harness stays platform-agnostic.
- **$249.99/mo Pricing**: Unsustainable for individual developers. Our token budget optimization is a competitive advantage.
