---
type: concept
title: "Prompt Renderer"
created: 2026-05-02
updated: 2026-05-02
tags:
  - prompt-renderer
  - multi-model
  - build-time-compilation
  - harness
status: developing
related:
  - "[[provider-native-prompting]]"
  - "[[model-adaptive-harness]]"
  - "[[research: Prompt Renderer for Multi-Model Agent Harness]]"
sources:
  - "[[Source: Build-Time Prompt Compilation Architecture]]"
  - "[[Source: AgentBus Jinja2 Prompt Pipelines]]"

---# Prompt Renderer

A build-time prompt compilation system that takes a **base prompt spec** (model-agnostic) and renders **per-model optimized prompts** by applying each model's official prompting conventions, substituting variables, and caching compiled output.

## Architecture

```
Base Prompt Spec (JSON/YAML)
        ↓
  [Compile-time Renderer]
        ↓
┌───────┼───────┬─────────┐
│ GPT   │Claude │Gemini   │  ← Per-model compiled prompts
│.json  │.json  │.json    │
└───────┴───────┴─────────┘
        ↓
  [npm package]              ← Shipped in lib
        ↓
  [Runtime] → load pre-compiled prompt → substitute runtime vars → send to LLM
```

## Key Properties

- **Build-time, not runtime**: Compiler runs during `npm run build`, output shipped as JSON in npm package
- **Base spec is model-agnostic**: Single source of truth that describes WHAT the prompt should do, not HOW
- **Per-model renderers**: Each model gets a plugin that knows its official prompting conventions
- **Variable system**: Two-phase — compile-time variables (resolved at build) vs runtime variables (resolved at call time)
- **Caching layer**: Pre-compiled prompts are the cache — no runtime compilation, no warmup needed
- **Deterministic**: Same spec + same renderer version → identical output (hash-verifiable)

## Rendering Pipeline

1. **Parse base spec**: Validate structure, required fields, variable declarations
2. **Select model renderer**: Load per-model plugin (GPT, Claude, Gemini, etc.)
3. **Apply model conventions**: XML tags for Claude, constraints-first for GPT, constraints-last for Gemini
4. **Substitute compile-time variables**: Resolve all vars marked `compile: true`
5. **Validate output**: Check token count, syntax, caching thresholds
6. **Serialize**: Write compiled prompt to JSON with hash + metadata
7. **Cache**: Store hash → compiled output for incremental builds

## Model-Specific Rendering Rules

| Convention | GPT (OpenAI) | Claude (Anthropic) | Gemini (Google) |
|-----------|-------------|-------------------|-----------------|
| System prompt | `system` role message | `system` parameter | `systemInstruction` |
| Structure | Constraints-first, flat | XML tags, nesting OK | Constraints-last, plain text |
| Instruction style | Outcome-first, shorter | Long-form, detailed | Multimodal-friendly |
| Cache control | Auto (no code) | `cache_control: {type: "ephemeral"}` | Explicit context cache |
| Output format | Function calling | Structured output API | Controlled generation |
| Best practice source | platform.openai.com/docs/guides/prompt-engineering | docs.anthropic.com + interactive tutorial | cloud.google.com/vertex-ai/docs |

## Variable Substitution

Two-phase variable system:

```yaml
variables:
  model_name: { type: string, compile: true }   # Resolved at build
  user_query: { type: string, compile: false }   # Resolved at runtime
  max_tokens: { type: number, compile: true, default: 4096 }
```

Compile-time variables produce multiple compiled variants if multiple values are specified (e.g., `model_name: [gpt-5.2, claude-sonnet-4.5]`).

## Caching Strategy

- **Build cache**: Incremental — only recompile prompts whose spec hash changed
- **Output cache**: Compiled prompts stored by `{spec_hash}-{model}-{var_hash}.json`
- **Runtime**: Zero cost — load pre-compiled JSON, substitute runtime vars, send
- **npm distribution**: Compiled prompts are regular files in the package — no compilation code shipped
