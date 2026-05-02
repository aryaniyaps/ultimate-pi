---
type: source
status: ingested
source_type: official-documentation
title: "Anthropic Prompt Engineering Best Practices (Claude Opus 4.7 through Haiku 4.5)"
author: "Anthropic"
date_published: 2026-04-01
date_fetched: 2026-05-01
url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices"
confidence: high
key_claims:
  - "Claude Opus 4.7 interprets prompts more literally and explicitly than Opus 4.6"
  - "Effort parameter (max/xhigh/high/medium/low) is the primary control knob replacing budget_tokens"
  - "Adaptive thinking dynamically calibrates reasoning depth per step"
  - "XML tags are the recommended structure format for complex prompts"
  - "Long content at top + query at bottom improves performance up to 30%"
  - "Claude Opus 4.7 has stronger default design aesthetic with specific house style"
  - "Code review harnesses need explicit lowering of the reporting bar for Opus 4.7"
tags:
  - prompting
  - anthropic
  - claude
  - model-specific
  - harness-design
created: 2026-05-02
updated: 2026-05-02

---# Anthropic Prompt Engineering Best Practices

Official comprehensive prompt engineering guide for Claude's latest models (Opus 4.7, Opus 4.6, Sonnet 4.6, Haiku 4.5). Single reference covering foundational techniques, output control, tool use, thinking, and agentic systems.

## Model-Specific Key Findings

### Claude Opus 4.7
- **More literal instruction following**: Will not silently generalize instructions; precision over thrash
- **Response length calibrated to task complexity**: Shorter on lookups, longer on analysis
- **Effort parameter critical**: `xhigh` for coding/agentic, `high` minimum for intelligence-sensitive
- **Tool use triggering**: Uses tools LESS than Opus 4.6; needs explicit guidance or higher effort
- **User-facing progress updates**: Better native updates; remove scaffolding that forces interim messages
- **Tone shift**: More direct/opinionated, less validation-forward, fewer emoji than Opus 4.6
- **Subagent spawning**: Tends to spawn FEWER subagents by default
- **Default frontend aesthetic**: Warm cream (~`#F4F1EA`), serif display type, terracotta/amber accent
- **Code review**: Better at finding bugs but follows "only high-severity" filters too faithfully
- **Design steering**: "Propose 4 directions first" pattern breaks the default

### Claude Opus 4.6
- **Adaptive thinking**: Replaces budget_tokens; effort controls depth
- **Overthinking risk**: Excessive upfront exploration; may gather extensive context without prompting
- **Subagent predilection**: Strong tendency to spawn subagents; may overuse
- **Better vision**: Improved multi-image processing, computer use
- **Prefilled responses deprecated**: Last assistant turn prefill returns 400 on Mythos Preview

### Claude Sonnet 4.6
- **Effort default**: `high` (was no effort parameter in Sonnet 4.5)
- **Recommended settings**: `medium` for most apps, `low` for latency-sensitive
- **Adaptive thinking**: Best for autonomous multi-step agents, computer use, bimodal workloads
- **64k max_tokens recommended** at medium/high effort

## General Principles (All Models)

### Prompt Structure
- **XML tags preferred**: `<instructions>`, `<context>`, `<examples>`, `<input>` — unambiguous parsing
- **Long content at top, query at bottom**: Up to 30% quality improvement
- **Role setting**: Even single sentence makes difference
- **Examples in `<example>` tags**: 3-5 examples; diverse, structured
- **Be clear and direct**: "Golden rule — show prompt to colleague; if they'd be confused, Claude will be too"
- **Provide context/why**: Explaining motivation helps understanding
- **Prefer general instructions over prescriptive steps**: Claude's reasoning exceeds human-prescribed steps

### Tool Use
- **Explicit direction needed**: "can you suggest" vs "implement" distinction
- **Proactive action default**: `<default_to_action>` block for autonomous behavior
- **Conservative action default**: `<do_not_act_before_instructions>` for safety-critical
- **Parallel tool calling**: Maximize by default, steerable
- **Older aggressive prompts cause overtriggering**: Dial back "CRITICAL: You MUST" language

### Thinking & Reasoning
- **Adaptive thinking**: Dynamic calibration; higher effort = more thinking
- **Steerable**: "Thinking adds latency; only use when it will meaningfully improve quality"
- **Self-check**: "Before you finish, verify your answer against [criteria]"
- **Multishot with `<thinking>` tags**: Show reasoning pattern in examples

### Agentic Systems
- **Context awareness**: Model tracks remaining context window tokens
- **State tracking across windows**: Save progress to files, use git, structured formats
- **Multi-window workflows**: First window sets up framework, future windows iterate
- **Balancing autonomy/safety**: Reversible actions OK, destructive actions need confirmation
- **Research mode**: Competing hypotheses, confidence tracking, hypothesis trees

### Output Control
- **Tell what to do, not what not to do**: "Write in flowing prose" not "Don't use markdown"
- **Match prompt style to desired output**: Remove markdown from prompt to reduce markdown in output
- **XML format indicators**: `<smoothly_flowing_prose_paragraphs>` tags
- **Avoid overengineering**: Don't add features, refactors, or abstractions beyond what was asked
- **Minimize hallucinations**: `<investigate_before_answering>` block

### Frontend Design
- **Don't settle for "AI slop"**: Distinctive typography, cohesive themes, purposeful motion
- **Opus 4.7 default**: Warm cream + serif + terracotta; steer via concrete specs or option proposal
- **Frontend aesthetics block**: Explicit guidance against generic patterns
