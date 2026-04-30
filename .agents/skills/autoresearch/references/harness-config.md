# Harness Configuration Specification

**The agent harness is not a fixed script. It is a configurable system of signals, gates, channels, and completion models.** Different LLMs fail at different points in this system. Exposing these as configuration dimensions — not hardcoded assumptions — is what separates a brittle harness from a reliable one.

Source: Forge Code's TermBench 2.0 findings. GPT 5.4 and Opus 4.6 reached identical scores (81.8%) only after the harness was adapted to each model's specific failure modes. The models did not change. The harness did. https://forgecode.dev/blog/gpt-5-4-agent-improvements/

---

## The Four-Layer Harness Model

```
┌─────────────────────────────────────────┐
│ L4: COMPLETION MODEL                     │
│ How "done" is determined and verified    │
├─────────────────────────────────────────┤
│ L3: STATE CHANNEL                        │
│ How system state reaches the model       │
├─────────────────────────────────────────┤
│ L2: GATE DESIGN                          │
│ How transitions between phases work      │
├─────────────────────────────────────────┤
│ L1: SIGNAL DESIGN                        │
│ How instructions are formatted           │
└─────────────────────────────────────────┘
```

Each layer has configurable dimensions. Each model needs different values.

---

## L1: Signal Design

How instructions, constraints, and structure are formatted for model consumption. This is the "schema shape" problem from Forge Code Fix 1 and Fix 2.

### Dimension: Density
| Value | Behavior | Model Match |
|---|---|---|
| `verbose` | Full sentences, repetition of key points, explicit rationales | GPT |
| `concise` | Minimal text, assumes inference, compact | Opus/Claude |
| `moderate` | Balanced, some repetition | Gemini |

**Why**: GPT anchors on what it reads. Sparse instructions = sparse attention = missed constraints. Opus infers from structure and doesn't need repetition.

### Dimension: Constraint Ordering
| Value | Behavior | Model Match |
|---|---|---|
| `constraints-first` | REQUIRED/MANDATORY blocks before descriptive content | GPT, Gemini |
| `natural-flow` | Context first, constraints embedded naturally | Opus/Claude |

**Why**: GPT processes tokens sequentially and weights early tokens higher. A constraint on line 50 is less "present" than one on line 5. Opus maintains even attention across context. (Forge Code Fix 1)

### Dimension: Emphasis Mechanism
| Value | Behavior | Model Match |
|---|---|---|
| `explicit-markers` | `REQUIRED:`, `MANDATORY`, `DO NOT`, `YOU MUST` in bold/caps | GPT |
| `contextual` | Relies on section hierarchy and natural language weight | Opus/Claude |

**Why**: GPT responds to explicit directive markers. Opus reads intent from structure. A subtle "consider verifying" reads differently to each model.

### Dimension: Nesting Depth
| Value | Behavior | Model Match |
|---|---|---|
| `flat` | Max 1 level of nesting. Bullet lists, no subsection trees deeper than H3 | GPT |
| `hierarchical` | H2→H3→H4 nesting OK, nested bullet lists OK | Opus/Claude |

**Why**: GPT gets confused by nested `required`/structural relationships. More nesting = more ways to produce malformed outputs. (Forge Code Fix 2)

### Dimension: Instruction Atomicity
| Value | Behavior | Model Match |
|---|---|---|
| `atomic` | One instruction per paragraph. No compound directives | GPT |
| `compound` | Multiple related instructions per paragraph OK | Opus/Claude |

**Why**: When GPT reads "do X, then Y, then Z" in one paragraph, it may execute X, stop, and consider the task done. Atomic instructions force sequential processing.

---

## L2: Gate Design

How transitions between phases are controlled. This is the "enforced verification" problem from Forge Code Fix 4 — the single biggest improvement.

### Dimension: Enforcement Model
| Value | Behavior | Model Match |
|---|---|---|
| `hard-gate` | Cannot proceed without explicit gate clearance. No opt-out. Runtime MUST enforce. | GPT |
| `soft-gate` | Gate is suggested. Model expected to self-regulate. Opt-out allowed. | Opus/Claude |

**Why**: GPT stops after plausible-but-incomplete solutions. "Please verify your work" as a suggestion does nothing. The gate must be programmatically enforced. (Forge Code Fix 4)

### Dimension: Gate Granularity
| Value | Behavior | Model Match |
|---|---|---|
| `per-step` | Gate after every significant action (fetch, extract, file) | GPT |
| `per-round` | Gate after each research round | Opus/Claude |
| `per-session` | Single gate before filing only | None (too loose) |

**Why**: GPT needs frequent checkpoints to prevent drift. Opus self-corrects within a round so mid-round gates are overhead. But per-session-only is dangerous for any model.

### Dimension: Evidence Standard
| Value | Behavior | Model Match |
|---|---|---|
| `checklist` | Falsifiable yes/no items. Must answer each explicitly | GPT |
| `self-assessment` | Model evaluates its own state narratively | Opus/Claude |

**Why**: GPT produces convincing-sounding self-assessments that are wrong. A checklist with concrete items forces falsifiability. Opus can reliably self-assess.

### Dimension: Retry Behavior
| Value | Behavior | Model Match |
|---|---|---|
| `auto-loop` | Gate failure automatically triggers retry of previous phase | GPT |
| `flag-and-continue` | Gate failure is noted. Model decides whether to retry | Opus/Claude |

**Why**: GPT, when given choice, will choose to continue rather than retry (premature completion bias). Auto-loop removes the choice.

---

## L3: State Channel

How system state (truncation, progress, errors) is communicated to the model. This is the "truncation blindness" problem from Forge Code Fix 3.

### Dimension: Truncation Signaling
| Value | Behavior | Model Match |
|---|---|---|
| `in-band` | Explicit text in output body: "... truncated N lines. Use read with offset to continue." | GPT |
| `metadata` | `total_lines`, `truncated: true` in structured metadata alongside output | Opus/Claude |

**Why**: GPT does not reliably read or act on metadata fields. The signal must be in the main output text where the model's attention is focused. (Forge Code Fix 3)

### Dimension: Progress Signaling
| Value | Behavior | Model Match |
|---|---|---|
| `explicit-counters` | "Round 1/3 complete. 5/15 pages used. 3/5 sources fetched this round." | GPT |
| `implicit` | Model tracks its own progress from context | Opus/Claude |

**Why**: GPT loses track of session-level state in long trajectories. Explicit counters act as anchor points.

### Dimension: Error Signaling
| Value | Behavior | Model Match |
|---|---|---|
| `structured` | Error objects with code, message, retry hint | GPT, Gemini |
| `natural` | Natural language error description | Opus/Claude |

**Why**: GPT handles structured error formats better when deciding next actions. Opus handles natural language errors equally well.

---

## L4: Completion Model

How "done" is determined and verified. Extends L2 gates to session-level termination.

### Dimension: Criteria Style
| Value | Behavior | Model Match |
|---|---|---|
| `falsifiable-checklist` | "DONE WHEN: index updated AND log appended AND hot.md updated AND all pages created" | GPT |
| `completion-signal` | Model declares done when it believes objectives are met | Opus/Claude |

**Why**: GPT's "I'm done" signal is unreliable. Falsifiable criteria give the harness (or the model itself in reviewer mode) a concrete standard to check against.

### Dimension: Self-Audit
| Value | Behavior | Model Match |
|---|---|---|
| `enforced` | Post-completion audit is MANDATORY. Must re-read outputs and verify. | GPT |
| `natural` | Model naturally double-checks its work. Enforcement is redundant. | Opus/Claude |

**Why**: Opus naturally does one more verification pass. GPT must be forced into reviewer mode. The difference is not capability — Opus self-audits; GPT must be audited.

### Dimension: Partial-Work Handling
| Value | Behavior | Model Match |
|---|---|---|
| `reject` | Incomplete work is rejected. Model must retry or explicitly file gaps. | GPT |
| `accept-with-gaps` | Model can file partial results with documented gaps. | Opus/Claude |

**Why**: GPT's partial work looks complete (convincing but wrong). Rejecting forces it to either finish properly or explicitly document what's missing. Opus's partial work is honestly partial.

---

## Dimension Summary Table

| Layer | Dimension | Opus/Claude | GPT | Gemini | Strict (default) |
|---|---|---|---|---|---|
| L1 | Density | concise | verbose | moderate | verbose |
| L1 | Constraint Ordering | natural-flow | constraints-first | constraints-first | constraints-first |
| L1 | Emphasis | contextual | explicit-markers | explicit-markers | explicit-markers |
| L1 | Nesting Depth | hierarchical | flat | flat | flat |
| L1 | Atomicity | compound | atomic | atomic | atomic |
| L2 | Enforcement | soft-gate | hard-gate | hard-gate | hard-gate |
| L2 | Granularity | per-round | per-step | per-round | per-step |
| L2 | Evidence | self-assessment | checklist | checklist | checklist |
| L2 | Retry | flag-and-continue | auto-loop | auto-loop | auto-loop |
| L3 | Truncation | metadata | in-band | in-band | in-band |
| L3 | Progress | implicit | explicit-counters | explicit-counters | explicit-counters |
| L3 | Error | natural | structured | structured | structured |
| L4 | Criteria | completion-signal | falsifiable-checklist | falsifiable-checklist | falsifiable-checklist |
| L4 | Self-Audit | natural | enforced | enforced | enforced |
| L4 | Partial-Work | accept-with-gaps | reject | reject | reject |

---

## How the Harness Uses This

1. `program.md` specifies `model_profile: auto|opus|gpt|gemini|strict`
2. The agent resolves the profile to dimension values using the table above
3. The skill text is written in **strict mode** (rightmost column) — safe for any model
4. **Model-specific relaxation**: When profile is `opus`, the agent may skip explicit markers, use natural flow, trust self-assessments. The strict-mode instructions still serve as the canonical specification; the relaxation is about execution style, not about ignoring constraints.

**Design principle**: Write once for strict. Relax for forgiving models. Never write for forgiving and hope strict models cope.

---

## What This Means for Skill Design

A well-designed skill is not a monolithic prompt. It is a template with:

1. **Canonical constraints** (what must happen, invariant across models)
2. **Signal annotations** (how loudly to say it, varies by model)
3. **Gate specifications** (where checkpoints go, what evidence they require)
4. **Relaxation directives** (what Opus/Claude can skip or soften)

The autoresearch SKILL.md embodies this: canonical constraints are the research pipeline steps. Signal annotations are `REQUIRED:` vs contextual. Gates are the round-completion and pre-file checklists. Relaxation directives are notes like "Opus: self-assessment sufficient for this gate."
