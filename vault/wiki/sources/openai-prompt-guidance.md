---
type: source
source_type: official-documentation
title: "OpenAI Prompt Guidance (GPT-5.5 through GPT-4.1)"
author: "OpenAI"
date_published: 2026-04-01
date_fetched: 2026-05-01
url: "https://developers.openai.com/api/docs/guides/prompt-guidance"
confidence: high
key_claims:
  - "GPT-5.5 works best with outcome-first prompts that define the destination, not every step"
  - "GPT-5.4 requires explicit tool persistence, verification loops, and completion criteria"
  - "GPT-5.3 Codex ships with a canonical Codex-Max starter prompt optimized for coding agents"
  - "GPT-5.2+ reasoning effort is the primary tuning knob: none/low/medium/high/xhigh"
  - "GPT-5.1 introduced apply_patch and shell tools as native API tool types"
  - "Contradictory instructions damage reasoning models more than older models"
  - "Structured XML specs like `<instruction_spec>` improved instruction adherence"
tags:
  - prompting
  - openai
  - gpt
  - model-specific
  - harness-design
---

# OpenAI Prompt Guidance

Official prompting guide from OpenAI covering all GPT models from GPT-5.5 down to GPT-4.1. Each model generation has a dedicated section with model-specific guidance.

## Model-Specific Key Findings

### GPT-5.5
- **Outcome-first prompts**: Define the destination, let model choose path
- **Shorter prompts**: Legacy process-heavy prompts add noise
- **Shorter, outcome-oriented**: "describe what good looks like, what constraints matter, what evidence is available"
- **Personality + collaboration style**: Separate blocks for tone and task behavior
- **Preamble for streaming**: Short user-visible update before tool calls
- **Explicit stopping conditions**: "After each result, ask: can I answer now?"
- **Retrieval budgets**: Stopping rules for search depth
- **Phase parameter**: `commentary` vs `final_answer` distinction

### GPT-5.4
- **Tool persistence rules**: "Keep calling tools until task complete AND verification passes"
- **Verification loop**: Check correctness, grounding, formatting, safety before finalizing
- **Completeness contract**: Internal checklist, track processed items, confirm coverage
- **Dependency checks**: Don't skip prerequisites because end state seems obvious
- **Research mode**: Plan → Retrieve → Synthesize in 3 passes
- **Small model guidance**: gpt-5.4-mini is more literal, needs explicit execution order
- **Reasoning effort**: Start at none, increase only if evals regress

### GPT-5.3 Codex
- **Canonical Codex-Max prompt**: Full starter prompt published by OpenAI
- **apply_patch**: First-class tool with Responses API integration; 35% fewer failures than manual
- **Shell tool**: Structured shell_command with workdir, timeout, permissions
- **Update plan tool**: JSON-based TODO with pending/in_progress/completed states
- **Phase parameter**: Required; dropping phase causes significant degradation
- **Parallel tool calls**: `multi_tool_use.parallel` with batch ordering
- **Compaction**: First-class support for multi-hour reasoning
- **Agents.md**: Automatically merged directory-scoped instruction files
- **Personalities**: Friendly vs Pragmatic shipped with Codex CLI

### GPT-5.2
- **Verbosity controls**: Output verbosity spec with sentence/bullet limits per task type
- **Scope drift prevention**: Explicit "no extra features" rules for frontend
- **Long-context handling**: Force summarization and re-grounding
- **Ambiguity mitigation**: Uncertainty-and-ambiguity block for hallucination-prone queries
- **Tool persistence**: "Prefer tools over internal knowledge whenever fresh data needed"
- **Compaction endpoint**: `/responses/compact` for extending effective context
- **Reasoning effort migration**: GPT-4o/4.1 → `none`, GPT-5 → same, GPT-5.1 → same

### GPT-5.1
- **Agentic steerability**: Personality blocks, user update specs, solution persistence
- **User updates (preambles)**: Frequency, verbosity, tone, content axes; "at least every 6 steps"
- **Tool preambles**: Brief plan before tools, progress updates during
- **Reasoning modes**: New `none` mode (no reasoning tokens at all)
- **apply_patch tool**: Named tool type in Responses API; freeform under the hood
- **Shell tool**: Native tool type for controlled command execution
- **Metaprompting**: Model can debug and rewrite its own prompts

### GPT-5
- **Agentic eagerness**: Calibrate proactivity vs waiting for guidance
- **Context gathering**: Batch search → minimal plan → complete task
- **Frontend development**: Self-reflection rubrics, design system enforcement
- **Cursor prompt tuning**: Real-world production agent findings
- **Responses API**: Reasoning persisted between tool calls; 4.3% score improvement

### GPT-4.1
- **Literal instruction follower**: More literal than predecessors
- **Persistence reminders**: "keep going until query completely resolved"
- **Planning induction**: "plan extensively before each function call"
- **SWE-bench prompt**: Full 55% pass rate agent prompt published
- **Diff format**: V4A diff format with context-based (not line-number) matching

## Cross-Model Patterns

1. **Structured XML blocks work better than markdown** for complex instruction sets
2. **Tool definitions should use API tools field**, not manual prompt injection
3. **Reasoning effort is the primary tuning knob** across all GPT-5+ models
4. **Verbosity API parameter + prompt-level overrides** for output length control
5. **Metaprompting is officially recommended** for prompt optimization
6. **Contradictory prompts hurt reasoning models significantly**
7. **Small models need more explicit, structured instructions**
