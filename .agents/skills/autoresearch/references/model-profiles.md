# Model Behavioral Profiles

Concrete profiles that map model families to harness dimension values. Each profile specifies how the four-layer harness (L1 Signal, L2 Gate, L3 Channel, L4 Completion) should behave for that model.

**Base specification**: `references/harness-config.md` — defines the dimensions and what each value means.

**Source**: Forge Code's TermBench 2.0 findings (GPT 5.4 and Opus 4.6 both at 81.8% after model-specific adaptation), plus internal observation. https://forgecode.dev/blog/gpt-5-4-agent-improvements/

---

## Profile: opus (Claude / Opus Family)

**Summary**: Forgiving. Infers from structure. Self-corrects. Trust but verify.

| Layer | Dimension | Value | Rationale |
|---|---|---|---|
| L1 | Density | `concise` | Opus reads intent from minimal text. Verbosity = token waste |
| L1 | Constraint Ordering | `natural-flow` | Even attention across context. Early placement irrelevant |
| L1 | Emphasis | `contextual` | Responds to structure, not markers. `REQUIRED:` is noise |
| L1 | Nesting Depth | `hierarchical` | Handles H2→H3→H4 trees without confusion |
| L1 | Atomicity | `compound` | Multiple directives per paragraph OK |
| L2 | Enforcement | `soft-gate` | Self-regulates. Hard gates are overhead |
| L2 | Granularity | `per-round` | Mid-round gates unnecessary. Corrects within round |
| L2 | Evidence | `self-assessment` | Reliable narrative self-evaluation |
| L2 | Retry | `flag-and-continue` | Chooses retry when needed. Forcing = patronizing |
| L3 | Truncation | `metadata` | Reads `total_lines` from structured output. Infers remainder |
| L3 | Progress | `implicit` | Tracks session state from context |
| L3 | Error | `natural` | Natural language errors sufficient |
| L4 | Criteria | `completion-signal` | Declares done reliably |
| L4 | Self-Audit | `natural` | Naturally double-checks before declaring done |
| L4 | Partial-Work | `accept-with-gaps` | Honestly partial. Gaps are real, not masked |

**Watch for**: Over-inference (assumes too much from minimal signals). Verbose exploration that burns tokens.

**Key relaxation**: Opus does not need enforced verification gates. The Pre-File Checklist serves as a reminder, not a hard block. Round-completion gates can be self-assessed narratively.

---

## Profile: gpt (GPT-4 / GPT-5 Family)

**Summary**: Literal. Anchors on first-seen content. Stops early. Must be constrained.

| Layer | Dimension | Value | Rationale |
|---|---|---|---|
| L1 | Density | `verbose` | Sparse = missed. Repeat critical constraints |
| L1 | Constraint Ordering | `constraints-first` | Weights early tokens higher. `REQUIRED` on line 5 > line 50 |
| L1 | Emphasis | `explicit-markers` | `REQUIRED:`, `MANDATORY`, `DO NOT`, caps. Responds to directive language |
| L1 | Nesting Depth | `flat` | H3 max. Nested subsections cause structural errors |
| L1 | Atomicity | `atomic` | One directive per paragraph. "Do X, then Y" → model does X, stops |
| L2 | Enforcement | `hard-gate` | MUST enforce. No opt-out. "Please verify" does nothing |
| L2 | Granularity | `per-step` | Frequent checkpoints prevent drift. Gate after fetch, after extract, before file |
| L2 | Evidence | `checklist` | Falsifiable yes/no. Self-assessment is confidently wrong |
| L2 | Retry | `auto-loop` | Will choose "continue" over "retry" every time. Remove the choice |
| L3 | Truncation | `in-band` | "... truncated N lines" MUST be in body text. Ignores metadata |
| L3 | Progress | `explicit-counters` | "3/5 sources. Round 2/3." Loses track without anchors |
| L3 | Error | `structured` | Error code + message + retry hint. Natural language errors misread |
| L4 | Criteria | `falsifiable-checklist` | "DONE WHEN: index updated AND log appended..." Concrete, verifiable |
| L4 | Self-Audit | `enforced` | MUST switch to reviewer mode. Cannot trust "I'm done" signal |
| L4 | Partial-Work | `reject` | Partial work looks complete. Reject forces explicit gap documentation |

**Key constraint**: Every gate is a hard gate. Every constraint is explicit. Every signal is in-band. Nothing is left to inference.

**The difference is NOT capability.** GPT reaches identical benchmark scores when the harness compensates. It's a behavioral difference, not an intelligence gap.

---

## Profile: gemini (Gemini Family)

**Summary**: Cautious. Benefits from planning. Variable across versions. Conservative defaults.

| Layer | Dimension | Value | Rationale |
|---|---|---|---|
| L1 | Density | `moderate` | Clear but not over-verbose |
| L1 | Constraint Ordering | `constraints-first` | Benefits from early constraint exposure |
| L1 | Emphasis | `explicit-markers` | Responds to directive language |
| L1 | Nesting Depth | `flat` | Simpler structure = fewer errors |
| L1 | Atomicity | `atomic` | Conservative: one thing at a time |
| L2 | Enforcement | `hard-gate` | Benefits from enforcement, especially for multi-step chains |
| L2 | Granularity | `per-round` | Round-level gates sufficient. Over-gating causes hesitation |
| L2 | Evidence | `checklist` | Concrete items preferred over narrative |
| L2 | Retry | `auto-loop` | Conservative retry policy |
| L3 | Truncation | `in-band` | Body text preferred over metadata |
| L3 | Progress | `explicit-counters` | Helps maintain trajectory awareness |
| L3 | Error | `structured` | Structured errors aid recovery |
| L4 | Criteria | `falsifiable-checklist` | Explicit completion criteria |
| L4 | Self-Audit | `enforced` | Enforced audit improves reliability |
| L4 | Partial-Work | `reject` | Conservative: force completion or explicit gaps |

**Note**: Gemini behavior varies across preview versions. Test profile against specific version. This profile is conservative — closer to gpt than opus.

---

## Profile: strict (Default / Unknown Model)

**Summary**: Assume the worst. Enforce everything. Safe for any model.

The `strict` profile is identical to `gpt` profile in all dimensions. It is the safe default when the model is unknown.

**Rationale**: The cost of over-specifying is minor (extra tokens, redundant gates). The cost of under-specifying is broken agent loops (missed constraints, premature completion, false synthesis). Always default to the stricter profile.

---

## Profile Selection

In `program.md`:

```yaml
model_profile: auto  # auto | opus | gpt | gemini | strict
```

- `auto`: Agent attempts to detect model. If uncertain, falls back to `strict`.
- `opus`: Apply opus profile relaxations.
- `gpt`: Apply gpt profile constraints (full enforcement).
- `gemini`: Apply gemini profile (conservative, near-gpt).
- `strict`: Full enforcement. Identical to gpt profile.

**Detection heuristics for `auto`**:
- Check system prompt / model identifier if available
- Check tool call style (Claude uses `invoke`, GPT uses `function_call`)
- Check response style (Claude: more verbose, structured. GPT: more direct)
- If ANY uncertainty: fall back to `strict`

---

## Applying a Profile

When the agent loads its profile:

1. **gpt/strict/gemini**: Execute the skill as written. All gates are hard. All signals are explicit. No relaxations applied.

2. **opus**: Apply relaxations:
   - Skip `REQUIRED:` / `MANDATORY` emphasis (treat as normal text)
   - Round-completion gates: self-assess narratively (don't need the 3-question format)
   - Pre-File Checklist: use as reminder, not hard block. May proceed if confident
   - Truncation: metadata is sufficient. `total_lines` in tool output = truncated
   - Post-file self-check: trust natural double-check behavior
   - Constraint ordering: can read constraints wherever they appear (no need to restructure)

**What NEVER relaxes, even for opus**:
- The research pipeline steps (search → fetch → clean → extract → file)
- Quality-sites routing rules
- Source attribution requirements
- Confidence labeling
- Max rounds / max pages constraints
- The core research objectives
