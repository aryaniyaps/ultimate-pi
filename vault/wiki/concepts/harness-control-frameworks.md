---
type: concept
title: "Harness Control Frameworks — Unified"
created: 2026-04-30
updated: 2026-04-30
status: active
tags: [harness, controls, architecture, formal-model, unified]
related:
  - "[[harness-h-formalism]]"
  - "[[feedforward-feedback-harness]]"
  - "[[generator-evaluator-architecture]]"
  - "[[harness-implementation-plan]]"
  - "[[agentic-harness]]"
sources:
  - "[[meng2026-agent-harness-survey]]"
  - "[[bockeler2026-harness-engineering]]"
  - "[[anthropic2026-harness-design]]"
---

# Harness Control Frameworks — Unified

Three independent frameworks describe harness controls. They are complementary, not competing. This page unifies them and maps them to our pipeline.

## The Three Frameworks

| Framework | Source | Focus | Analogy |
|-----------|--------|-------|---------|
| **H-Formalism** H=(E,T,C,S,L,V) | Meng et al. 2026 | Component taxonomy — what pieces must exist | Blueprint |
| **Feedforward-Feedback** | Böckeler/Fowler 2026 | Control flow — how information moves through the system | Cybernetics |
| **Generator-Evaluator** | Anthropic 2026 | Agent topology — who does what, who checks whom | Org chart |

Each answers a different question:
- H-Formalism: "What components must every harness have?"
- Feedforward-Feedback: "How do guides and sensors work together?"
- Generator-Evaluator: "How should agents be organized to prevent self-deception?"

---

## H-Formalism: Component Taxonomy (Meng 2026)

**H = (E, T, C, S, L, V)** — six components. No harness achieves production reliability without all six.

| Component | Our Implementation |
|-----------|-------------------|
| **E** Execution Loop | L1-L4 pipeline (Spec → Plan → Execute → Verify) |
| **T** Tool Registry | Tool schemas, MCP tools (lean-ctx 48 tools, ck, Gitingest), skills |
| **C** Context Manager | Wiki knowledge base, AST truncation, lean-ctx compression, think-in-code |
| **S** State Store | Wiki vault, ctx_session, hot.md cache |
| **L** Lifecycle Hooks | L7 Archon orchestration, post-edit validation, drift monitor hooks |
| **V** Evaluation Interface | L4 adversarial verification, L5 observability, terminal-bench |

**Gaps**: No formal contract language for component interfaces. L-component is implicit. V-component needs systematic action trajectory tracking.

See [[harness-h-formalism]] for full component-by-component specification.

---

## Feedforward-Feedback: Control Flow (Böckeler/Fowler 2026)

Cybernetics model: guides (feedforward) set expectations before action. Sensors (feedback) measure outcomes after action.

```
FEEDFORWARD (Guides)                   FEEDBACK (Sensors)
├─ Computational                       ├─ Computational
│  ├─ Language servers                 │  ├─ Tests (unit, integration)
│  ├─ CLIs, scripts                    │  ├─ Linters (ESLint, ruff)
│  └─ Codemods                         │  ├─ Type checkers
│                                      │  ├─ Mutation testing
├─ Inferential                         │  └─ Structural tests (ArchUnit)
│  ├─ AGENTS.md, skills                │
│  ├─ Rules, conventions               ├─ Inferential
│  ├─ Reference docs                   │  ├─ AI code review agents
│  └─ How-to guides                    │  ├─ LLM-as-judge
│                                      │  └─ Semantic analysis
```

**Our implementation mapping**:

| Control Type | Our Implementation |
|-------------|-------------------|
| Feedforward-Computational | Tool schemas, `tsc --noEmit`, JSON schema validation, structured output contracts |
| Feedforward-Inferential | SKILL.md files, ADRs, wiki pages, AGENTS.md, model profiles |
| Feedback-Computational | Inline syntax validation (Phase 12), final lint+format gate (Phase 16), ck semantic grep |
| Feedback-Inferential | L4 adversarial verification, L2 plan review, L1 spec debate, meta-agent drift monitor (L2.5) |

**Key insight**: Agents need BOTH feedforward AND feedback. Separately, agents either repeat mistakes (feedback-only) or encode rules but never verify them (feedforward-only).

**Unsolved**: Behaviour Harness — functional correctness verification. Current approach (AI-generated tests + manual testing) insufficient. Future Phase F2.

**Steering loop**: Human improves feedforward/feedback controls when issues repeat. This is ongoing harness engineering, not one-time configuration.

See [[feedforward-feedback-harness]] for detailed framework specification.

---

## Generator-Evaluator: Agent Topology (Anthropic 2026)

**Core finding**: When agents evaluate their own work, they "confidently praise mediocre outputs." Self-evaluation is fundamentally broken. Must separate generator from evaluator.

**GAN-inspired architecture**:
- Generator agent creates output
- Evaluator agent checks it
- Evaluator must be explicitly tuned to be skeptical
- Out of the box, Claude "talks itself out of flagging real issues"

**Our implementation**:

| Layer | Generator | Evaluator | Mechanism |
|-------|-----------|-----------|-----------|
| L1 (Spec) | Spec hardener | Spec critic (debate, selective) | Sprint contract: agree "done" before L2 |
| L2 (Plan) | Planner | Plan critic (debate, selective) | Sprint contract: agree "done" before L3 |
| L4 (Code) | Implementer (L3) | Adversarial critic (L4) | Hard-threshold pass/fail, multi-round debate |

**Key improvements from this framework**:
1. Sprint contracts at L2: generator and evaluator explicitly agree on "what done means" BEFORE code is written
2. Hard-threshold grading: not narrative feedback ("looks good") but falsifiable checklist ("passes all 7 criteria")
3. Evaluator separate model: use different model for evaluator for genuine adversarial diversity
4. Regular simplification audits: as models improve, remove unnecessary evaluator components

See [[generator-evaluator-architecture]] for full specification.

---

## How They Fit Together

```
┌──────────────────────────────────────────────────────────┐
│                 HARNESS CONTROL STACK                     │
│                                                           │
│  H-Formalism (Component Blueprint)                        │
│  ├─ E: Execution Loop → L1-L4 pipeline                   │
│  ├─ T: Tool Registry → lean-ctx, ck, Gitingest           │
│  ├─ C: Context Manager → Wiki, AST truncation, TiC       │
│  ├─ S: State Store → Wiki vault, hot.md                  │
│  ├─ L: Lifecycle Hooks → L7 orchestration hooks          │
│  └─ V: Evaluation → L4 adversarial, L5 observability     │
│                                                           │
│  Feedforward-Feedback (Control Flow)                      │
│  ├─ Feedforward-Inferential → SKILL.md, ADRs, AGENTS.md  │
│  ├─ Feedforward-Computational → Tool schemas, validators │
│  ├─ Feedback-Inferential → L4 critics, L2.5 drift monitor│
│  └─ Feedback-Computational → Phase 12 syntax, Phase 16   │
│                                                           │
│  Generator-Evaluator (Agent Topology)                     │
│  ├─ Generator agents → L1 spec, L2 plan, L3 execute      │
│  └─ Evaluator agents → L1 critic, L2 critic, L4 critic   │
└──────────────────────────────────────────────────────────┘
```

The three frameworks are orthogonal dimensions of the same system:
- **H-Formalism** says WHAT must exist
- **Feedforward-Feedback** says HOW information flows
- **Generator-Evaluator** says WHO does what

Any component can be analyzed through all three lenses simultaneously.
