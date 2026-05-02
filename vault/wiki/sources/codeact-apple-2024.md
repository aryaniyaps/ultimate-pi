---
type: source
status: ingested
source_type: academic_paper
title: "CodeAct: Executable Code Actions Elicit Better LLM Agents"
author: "Xingyao Wang, Yangyi Chen, Lifan Yuan, Yizhe Zhang, Yunzhu Li, Hao Peng, Heng Ji (Apple / UIUC)"
date_published: 2024-07
url: "https://arxiv.org/abs/2402.01030"
confidence: high
conference: "ICML 2024"
tags:
  - agent-tools
  - code-generation
  - tool-calling
  - academic
key_claims:
  - "Replacing JSON/text tool-calling with executable Python code improves LLM agent success rate by ~20 percentage points on multi-tool tasks"
  - "CodeAct agents require ~30% fewer interaction turns than JSON-based agents"
  - "Python interpreter provides automatic, zero-cost error signals — wrong calculations raise exceptions immediately"
  - "Open-source models benefit more: CodeActAgent (Mistral 7B) at 12.2% vs Lemur-70B at 3.7% on multi-tool benchmark"
  - "CodeActInstruct dataset: 7,139 multi-turn code-based trajectories across 4 domains"
created: 2026-05-02
updated: 2026-05-02

---# CodeAct (Apple, ICML 2024)

Foundation research paper that established the **code-as-unified-action-space** paradigm. Proposes replacing the JSON and text action formats common in tool-calling agents with executable Python code.

## Core Insight

LLMs have seen millions of lines of real-world code during pretraining but only contrived tool-calling examples. Code is a better lingua franca for agent actions because it already encodes control flow, data dependencies, and multi-step composition.

## Key Results

| Metric | JSON Actions | CodeAct | Improvement |
|--------|-------------|---------|-------------|
| Multi-tool success (GPT-4) | 53.7% | 74.4% | +20.7 pp |
| Interaction turns | baseline | -30% | fewer round-trips |
| Open-source (best) | 3.7% (Lemur-70B) | 12.2% (Mistral 7B) | +8.5 pp |

## Mechanism

- Unified action space: all agent actions expressed as Python code
- Python interpreter catches errors automatically — no separate critique step
- Dynamic revision: agent can emit new actions or revise prior ones based on observations
- CodeActInstruct: fine-tuning dataset covering information retrieval, package calls, external memory, robot planning

## Limitations

- M3ToolEval benchmark has only 82 tasks (small sample, no confidence intervals)
- Sandbox security is acknowledged but not deeply addressed (one paragraph)
- 60+ point capability gap between GPT-4 and CodeActAgent remains

## Adoption

- Directly inspired Cloudflare Code Mode (TypeScript variant for Workers)
- Implemented in OpenHands/OpenDevin, LangGraph CodeAct, Manus
- Foundation for the entire "code execution layer" agent paradigm

## Relevance to ultimate-pi

The academic foundation for our P14 (Think-in-Code Enforcement) and the new TypeScript execution layer phase. The 20% improvement on multi-tool tasks validates that code-based tool orchestration is not just a context optimization but a capability improvement. The interpreter-as-error-signal mechanism complements our L4 adversarial verification.
