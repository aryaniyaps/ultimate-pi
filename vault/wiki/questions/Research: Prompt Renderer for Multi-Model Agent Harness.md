---
type: synthesis
title: "Research: Prompt Renderer for Multi-Model Agent Harness"
created: 2026-05-02
updated: 2026-05-02
tags:
  - research
  - prompt-renderer
  - multi-model
  - build-time-compilation
  - caching
  - harness
status: developing
related:
  - "[[Prompt Renderer]]"
  - "[[Build-Time Prompt Compilation]]"
  - "[[provider-native-prompting]]"
  - "[[model-adaptive-harness]]"
  - "[[harness-configuration-layers]]"
  - "[[harness-implementation-plan]]"
sources:
  - "[[Source: Build-Time Prompt Compilation Architecture]]"
  - "[[Source: AgentBus Jinja2 Prompt Pipelines]]"
  - "[[Source: TianPan Prompt Caching Architecture]]"
  - "[[Source: Arxiv — Don't Break the Cache]]"
  - "[[openai-prompt-guidance]]"
  - "[[anthropic-prompt-best-practices]]"
  - "[[gemini-3-prompting-guide]]"

---# Research: Prompt Renderer for Multi-Model Agent Harness

## Overview

Design a custom prompt renderer for the ultimate-pi agentic harness that takes a **base prompt spec** (model-agnostic), applies **per-model prompting best practices**, substitutes variables, uses a **caching layer** for cost optimization, and compiles rendered prompts at **build time** (not runtime) — shipped as compiled assets inside the npm library. This extends the existing [[provider-native-prompting]] concept with compilation, caching, and a two-phase variable system.

## Key Findings

1. **Build-time compilation is a proven architectural pattern but no mature off-the-shelf npm package exists.** The pattern is validated by Microsoft prompt-engine (2.8K stars, MIT — YAML-based prompt management, abandoned 2022) and PromptWeaver (`@iqai/prompt-weaver`, MIT, active Dec 2025 — Handlebars template compilation with Zod validation). The implementation is a DIY build pipeline: `js-yaml` (parse specs) + `@iqai/prompt-weaver` (template engine) + per-model renderer plugins → compiled JSON shipped in npm. No runtime template engine needed.

2. **Strategic cache boundary control is essential** (Source: [[Source: Arxiv — Don't Break the Cache]]). Across 500 agent sessions and 4 flagship models, system prompt only caching provides the most consistent benefits (41-80% cost reduction, 13-31% TTFT improvement). Full context caching can paradoxically increase latency. The golden rule: static content first, dynamic content last. Compile-time rendering makes this trivial — all static content is in the compiled prompt, runtime vars are appended at the end.

3. **Multi-tier caching architecture is well understood** (Source: [[Source: TianPan Prompt Caching Architecture]]). Three tiers: Semantic cache (100% savings for exact/near-duplicate queries), Prefix cache (50-90% savings for shared static context), Full inference (0% savings). Build-time compilation eliminates the need for runtime prefix caching entirely — compiled prompts ARE the cache. The "parallel execution trap" (4% cache hit rate without warming) is irrelevant when prompts are pre-compiled.

4. **Each model has fundamentally different prompting conventions** (Sources: [[openai-prompt-guidance]], [[anthropic-prompt-best-practices]], [[gemini-3-prompting-guide]]). OpenAI says constraints-first and outcome-first. Anthropic mandates XML tags and long-form reasoning. Google says constraints-LAST with plain text. A single canonical prompt relaxed per model is WRONG — each model needs a purpose-built renderer that applies its official conventions from a shared semantic spec.

5. **Jinja2 template patterns are production-ready but runtime-only** (Source: [[Source: AgentBus Jinja2 Prompt Pipelines]]). The Jinja2 pattern (FileSystemLoader, template inheritance, conditionals, loops, pipeline runner) is excellent for prompt structure but designed for runtime. We adapt the pattern to build-time: templates are compiled to static JSON with placeholders for runtime variables, not rendered at request time.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   BUILD TIME                          │
│                                                       │
│  Base Prompt Spec (prompts/*.yaml)                    │
│       │                                               │
│       ▼                                               │
│  ┌─────────────────┐                                  │
│  │ Prompt Compiler  │  ← TypeScript build script      │
│  │                  │                                  │
│  │ • Parse YAML     │                                  │
│  │ • Validate spec   │                                  │
│  │ • Per-model       │  ← Renderer plugins             │
│  │   renderers       │    (GPT, Claude, Gemini)        │
│  │ • Substitute      │                                  │
│  │   compile vars    │                                  │
│  │ • Hash + cache    │                                  │
│  └──────┬───────────┘                                  │
│         │                                              │
│         ▼                                              │
│  Compiled Prompts (dist/prompts/*.json)                │
│  ✓ Per-model variants                                  │
│  ✓ Syntax-validated                                    │
│  ✓ Token-count checked                                 │
│  ✓ Hash-verified                                       │
│  ✓ Shipped in npm package                              │
│                                                       │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│                   RUNTIME                             │
│                                                       │
│  Load compiled prompt by {spec, model}                │
│       │                                               │
│       ▼                                               │
│  Substitute runtime variables                         │
│  (user_query, context, etc.)                         │
│       │                                               │
│       ▼                                               │
│  Send to LLM API                                      │
│  (no template engine, no compilation, no cache warmup)│
└──────────────────────────────────────────────────────┘
```

## Caching Layer Design

### Build Cache (incremental compilation)
```
cache/
└── compile-cache.json    # { spec_hash → compiled_output_hash }
```
Only recompile prompts whose spec hash changed since last build.

### Output Cache (compiled prompts)
```
dist/prompts/manifest.json  # { spec → { model → { hash, path, build_time } } }
```
Each compiled prompt is content-hashed for deterministic verification.

### Runtime Cache (not needed)
No runtime cache required — compiled prompts are static files loaded directly. Zero compilation latency, zero cache warming, zero parallel-execution traps.

## Per-Model Rendering Rules

| Dimension | GPT (OpenAI) | Claude (Anthropic) | Gemini (Google) |
|-----------|-------------|-------------------|-----------------|
| **System prompt** | `messages[0].role="system"` | `system` parameter | `systemInstruction` config |
| **Structure** | Flat, constraints-first | XML tags (`<instructions>`) | Plain text, constraints-last |
| **Instruction ordering** | Outcome → Constraints → Context | Role → Context → Task → XML | Context → Task → Constraints |
| **Output format** | Function calling / JSON mode | Structured output API | Controlled generation / JSON |
| **Cache mechanism** | Auto (prefix match) | `cache_control: {type: "ephemeral"}` | Explicit context cache |
| **Best practice source** | platform.openai.com/docs/guides/prompt-engineering | docs.anthropic.com + interactive tutorial | cloud.google.com/vertex-ai/docs |
| **Examples preference** | Few-shot inline | Few-shot with XML wrappers | Few-shot with clear separation |
| **Token threshold** | 1,024 (cache min) | 1,024 (cache min) | 4,096 (cache min) |

## Variable System

Two-phase variable resolution:

```typescript
interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  phase: 'compile' | 'runtime';
  default?: unknown;
  required: boolean;
}
```

- **Compile-time vars** (`phase: 'compile'`): Resolved at build time. Multiple values produce multiple compiled variants. Example: `model_name: [gpt-5.2, claude-sonnet-4.5]` → 2 compiled prompts.
- **Runtime vars** (`phase: 'runtime'`): Resolved at call time. Left as `{{PLACEHOLDER}}` in compiled output. Substituted by a lightweight runtime function (no template engine needed — simple string replace).

## npm Package Structure

```
@ultimate-pi/harness/
├── dist/
│   ├── prompts/
│   │   ├── gpt/
│   │   │   ├── system.json        # Compiled system prompt for GPT
│   │   │   ├── spec-hardening.json
│   │   │   └── verify.json
│   │   ├── claude/
│   │   │   ├── system.json        # Compiled system prompt for Claude
│   │   │   └── ...
│   │   └── gemini/
│   │       └── ...
│   ├── manifest.json              # Build manifest
│   └── renderers/
│       ├── gpt-renderer.js        # Renderer plugins (only if runtime rendering needed)
│       └── ...
├── prompts/                       # Source specs (for development)
│   ├── base/
│   │   ├── system.yaml
│   │   └── verify.yaml
│   └── fragments/
│       └── common.yaml
├── scripts/
│   └── compile-prompts.ts         # Build script
└── src/
    └── runtime/
        └── prompt-loader.ts       # Runtime loader (reads compiled JSON)
```

## Implementation Plan (integrated into harness)

### Phase 1: Compiler Core
- TypeScript build script that reads YAML specs → validates → applies per-model renderers → outputs compiled JSON
- Supported models: GPT-5.2, Claude Sonnet 4.5, Gemini 2.5 Pro (extensible plugin system)
- Deterministic builds with SHA-256 manifest
- Integration: `npm run compile-prompts` as build step

### Phase 2: Per-Model Renderers
- GPT renderer: constraints-first, flat structure, outcome-first ordering, system role message
- Claude renderer: XML tags, long-form structure, cache_control markers, system parameter
- Gemini renderer: constraints-last, plain text, systemInstruction, context cache config

### Phase 3: Variable System
- Two-phase variable resolution with type checking
- Compile-time multi-value expansion
- Runtime placeholder format: `__VAR_name__` (avoid collision with any template syntax)

### Phase 4: Caching
- Incremental build cache (recompile only changed specs)
- Compiled prompts shipped as static JSON in npm (no runtime compilation)
- Content-hash verification for deterministic builds

### Phase 5: Runtime Integration
- `loadPrompt(specName, model, runtimeVars)` function
- Zero-dependency runtime (just JSON.parse + string replace)
- Type-safe with TypeScript types for all compiled prompts

## Contradictions

- [[Source: AgentBus Jinja2 Prompt Pipelines]] advocates runtime template rendering with Jinja2 (Python). Our design deliberately avoids this — pre-compiling at build time eliminates template engine dependency, reduces runtime overhead to zero, and makes prompts auditable static assets. The contradiction is resolved by recognizing that Jinja2's patterns (inheritance, blocks, pipelines) are excellent for prompt STRUCTURE but should be resolved at build time, not runtime.
- [[Source: TianPan Prompt Caching Architecture]] describes runtime prefix caching with cache warming. Our design makes this mostly irrelevant — when prompts are pre-compiled and shipped in npm, there is no runtime prefix to cache. However, the multi-tier caching insight (semantic → prefix → full) remains valuable for the broader harness caching strategy beyond prompt rendering.

## Open Questions

1. **What template syntax for base specs?** YAML with JSON Schema validation is the practical choice. PromptWeaver's Handlebars syntax provides the template layer. Microsoft prompt-engine validated the YAML pattern. JSON Schema (or Zod, integrated with PromptWeaver) provides better validation than raw YAML parsing alone. YAML stays human-friendly for spec authors.
2. **How to handle prompt versioning across npm releases?** Compiled prompts must be versioned with the harness. Semantic versioning for prompts: major = breaking spec change, minor = new prompt added, patch = rendering tweak. The build manifest provides traceability.
3. **What about custom/fine-tuned models?** The renderer plugin system should support user-defined renderers for custom models. Default: fall back to "generic" renderer that produces a neutral format.
4. **How to test compiled prompts?** Each compiled variant needs automated testing. PromptWeaver's Zod schema validation checks structure and types at compile time. Token thresholds checked against model-specific limits. Semantic testing (does the compiled prompt produce expected behavior?) requires sending to the target model — this is a separate integration test concern.
5. **What happens when a provider changes its API format?** Compiled prompts for that provider become stale. The build manifest tracks renderer version — recompilation produces updated prompts. A CI check should flag prompts compiled with outdated renderer versions.
6. **Where does token budget allocation fit?** The base spec should declare expected token budgets. The compiler validates that compiled prompts don't exceed model limits. Budget allocation is a prompt design concern, not a renderer concern — but the renderer enforces it.
7. **Does the renderer need to support chat message arrays (multi-turn)?** Yes — the base spec should support defining multi-message prompts (system + examples + user template). The renderer compiles the full message array structure per model's expected format.
