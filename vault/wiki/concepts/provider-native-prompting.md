---
type: concept
title: "Provider-Native Prompting"
aliases: ["provider-native harness", "native prompt generation"]
created: 2026-05-01
updated: 2026-05-01
tags: [concept, prompting, harness-design, model-adaptive]
status: developing
related:
  - "[[model-adaptive-harness]]"
  - "[[harness-configuration-layers]]"
  - "[[Research: Model-Specific Prompting Guides]]"
  - "[[openai-prompt-guidance]]"
  - "[[anthropic-prompt-best-practices]]"
  - "[[gemini-3-prompting-guide]]"
---

# Provider-Native Prompting

**Generate prompts optimized for each model provider's official conventions, not a single canonical format with strictness relaxations.**

## Problem

The current harness design principle is: "Write once for strictest model (GPT-safe defaults). Relax for forgiving models." This treats model differences as varying STRICTNESS of the same format.

Official provider guidance reveals this is wrong. Each provider specifies fundamentally DIFFERENT prompting conventions:

| Concern | OpenAI | Anthropic | Google |
|---------|--------|-----------|--------|
| Structure | XML-like sections | XML tags | Plain text sections |
| Constraint order | FIRST | Flexible | LAST |
| Density | Concise, outcome-first | General over prescriptive | Concise by default |
| Verification | Pre-flight/post-flight loop | Self-check at end | Split-step verify→generate |
| Grounding | Citation rules | Quote extraction | Explicit truth statement |
| Thinking | reasoning_effort param | effort param + adaptive | thinking level LOW/HIGH |
| Temperature | Unspecified | Removed from API | **1.0 mandatory** |

These are not relaxations of the same format. They are different formats.

## Solution: Semantic Spec → Native Renderer

The harness should separate WHAT must be communicated (semantic spec) from HOW it's communicated (provider-native renderer).

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Semantic Spec  │ ──► │  Prompt Renderer  │ ──► │  API Call     │
│  (provider-      │     │  ┌──────────────┐ │     │              │
│   agnostic)      │     │  │ openai       │ │     │              │
│                  │     │  │ anthropic    │ │     │              │
│  - Task          │     │  │ google       │ │     │              │
│  - Constraints   │     │  │ fallback     │ │     │              │
│  - Context       │     │  └──────────────┘ │     │              │
│  - Output spec   │     └──────────────────┘     └──────────────┘
│  - Verification  │
│  - Tool spec     │
└─────────────────┘
```

### Semantic Spec (Provider-Agnostic)

The harness internally represents every task as a structured specification, not a prompt string:

```yaml
spec:
  task: "Refactor the authentication module to use JWT"
  constraints:
    - "Must maintain backward compatibility"
    - "Must not introduce new dependencies"
    - "Test coverage must not decrease"
  context:
    - file: auth/__init__.py
    - file: auth/tokens.py
    - file: tests/test_auth.py
  output:
    format: diff
    include_explanation: true
  verification:
    - run: pytest tests/test_auth.py
    - check: git diff --stat
  tools:
    - read_file
    - apply_patch  # openai native
    - text_editor   # anthropic native
    - bash
  model: gpt-5.4
```

### Renderer (Provider-Native)

Each renderer converts the semantic spec into the provider's recommended format:

**OpenAI renderer** produces:
```
<code_editing_rules>
- Before editing, read relevant file contents for complete context
- Make small, testable, incremental changes
- Run pytest tests/test_auth.py after each change
- Do not add new dependencies
- Maintain backward compatibility
</code_editing_rules>

# Task
Refactor the authentication module to use JWT.

# Success criteria
- Backward compatibility maintained
- No new dependencies introduced  
- Test coverage not decreased
- All existing tests pass

# Stop rules
- Do not stop until all tests pass
- If blocked, explain what's missing and ask
```

**Anthropic renderer** produces:
```xml
<instructions>
Refactor the authentication module to use JWT.
</instructions>

<context>
<file path="auth/__init__.py">...</file>
<file path="auth/tokens.py">...</file>
<file path="tests/test_auth.py">...</file>
</context>

<constraints>
- Maintain backward compatibility. This is important because...
- Do not introduce new dependencies.
- Test coverage must not decrease. Run tests after each change.
</constraints>

<verification>
Before you finish, run pytest tests/test_auth.py and verify all tests pass.
Check git diff --stat to confirm only intended files changed.
</verification>
```

**Google renderer** produces:
```
You are a senior software engineer. You are refactoring the authentication module 
to use JWT tokens. You are expected to perform calculations and logical deductions 
based strictly on the provided code.

[Context files: auth/__init__.py, auth/tokens.py, tests/test_auth.py]

Based on the entire codebase above, refactor the authentication module to use JWT.
Synthesize all relevant information from the code that pertains to the refactoring.

- Maintain backward compatibility
- No new dependencies
- Test coverage must not decrease
- All existing tests must pass

Verify with high confidence that all tests pass before declaring done. If you cannot 
verify, state what's blocking and STOP.
```

## Integration with Existing Harness Layers

Each harness layer generates a semantic spec fragment. The renderer combines them per model.

| Layer | Semantic Spec Fragment |
|-------|----------------------|
| L1 Spec Hardening | Task definition, acceptance criteria, ambiguity resolution |
| L2 Structured Planning | Task DAG, subtask ordering, dependency graph |
| L2.5 Drift Monitor | Detection strategy, thresholds, escalation rules |
| L3 Grounding Checkpoints | Verification steps per checkpoint |
| L4 Adversarial Verification | Attack vectors, falsifiable criteria |
| L5 Observability | Required metrics, instrumentation points |
| L6 Memory | Wiki read/write contract, relevant pages |
| L7 Orchestration | Workflow DAG, approval gates |
| L8 Wiki Query | Search query, context assembly strategy |

The renderer combines all fragments into a single provider-native prompt.

## Design Principles

1. **Official guidance over empirical observation.** Provider docs are the primary source. Empirical failure modes are layered on top, not the foundation.

2. **Provider-native, not strictness-relaxation.** Generate different prompts for different providers. Never generate one canonical prompt and relax.

3. **Semantic spec is the source of truth.** Prompt text is ephemeral. The spec is what gets versioned, tested, and audited.

4. **Renderer is pluggable.** New providers/models get new renderers. The spec stays stable.

5. **Validate against provider conventions.** Lint prompts against known provider rules before sending (e.g., "Gemini temperature != 1.0" = block).

## Implementation Notes

- **Phase P22b** in [[harness-implementation-plan]] adds the prompt renderer module
- Each renderer is a standalone module: `lib/renderers/openai.ts`, `lib/renderers/anthropic.ts`, `lib/renderers/google.ts`
- Fallback renderer for unknown models: conservative markdown format
- Renderer config stored in `.pi/harness/renderers.json`
- Model-to-renderer mapping in `.pi/harness/model-profiles.json`

## Source

Derived from official provider documentation:
- [[openai-prompt-guidance]]
- [[anthropic-prompt-best-practices]]
- [[gemini-3-prompting-guide]]
