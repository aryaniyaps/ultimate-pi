---
type: source
status: ingested
source_type: architecture-analysis
title: "Build-Time Prompt Compilation Architecture"
author: "Synthesis of multiple real sources"
date_published: 2026-05-02
url: "https://github.com/microsoft/prompt-engine"
confidence: high
tags:
  - prompt-compilation
  - build-tools
  - yaml-to-json
  - template-engine
related:
  - "[[Research: Prompt Renderer for Multi-Model Agent Harness]]"
key_claims:
  - "Build-time prompt compilation is a valid architectural pattern but no mature off-the-shelf npm package exists"
  - "Microsoft prompt-engine (2.8K stars, MIT) validates the YAML-based prompt management pattern"
  - "PromptWeaver (@iqai/prompt-weaver, MIT, Dec 2025) provides template compilation + Zod validation for production use"
  - "The DIY approach (js-yaml + @iqai/prompt-weaver + per-model renderer plugins) is the correct implementation path"
  - "Deterministic builds: same spec + same renderer version → identical output with hash verification"
created: 2026-05-02
updated: 2026-05-02

---

# Build-Time Prompt Compilation — Real Tools & Architecture

> [!correction] Previous research cited "PromptKit PackC" (npm, v1.4.6, 48 versions) which does not exist. This page documents the real tools and architecture.

## What Exists

### Microsoft prompt-engine
- **Package**: `prompt-engine` (npm)
- **Stars**: 2.8K | **License**: MIT | **Language**: TypeScript
- **Status**: Last updated Oct 2022 (abandoned)
- **What it does**: YAML-based prompt management with description + examples + dialog pattern. Builds prompts programmatically from YAML specs.
- **Relevance**: Validates the YAML→prompt pattern. Code engine (NL→Code) and Chat engine (dialogs). Shows the pattern works but project is dormant.
- **URL**: https://github.com/microsoft/prompt-engine

### PromptWeaver
- **Package**: `@iqai/prompt-weaver` (npm)
- **Stars**: 4 | **License**: MIT | **Language**: TypeScript 100%
- **Status**: Active (Dec 2025, v1.1.1, 104 commits, 7 releases)
- **What it does**: Handlebars-based template engine with Zod/Valibot/ArkType validation schema support. Built-in 60+ transformers (dates, currency, strings, collections). Supports template compilation caching, reusable partials, Fluent Builder API, and composition.
- **Relevance**: Production-ready template engine for prompts. Handlebars syntax for control flow (loops, conditionals, switch/case). Template compilation caching gets us 90% of the way to "build-time compilation." The Fluent Builder API enables dynamic prompt construction.
- **URL**: https://github.com/IQAIcom/prompt-weaver

### What Does NOT Exist
- No npm package called "PromptKit PackC" exists
- No npm package called `@altairalabs/packc` exists
- No npm package `prompt-kit` exists (only `promptkit@0.0.1` — unrelated template scaffolding tool)
- No mature, maintained build-time YAML→JSON prompt compiler exists on npm

## Recommended Implementation

### DIY Build Pipeline

The architecture is sound. Instead of looking for a mythical off-the-shelf package, build the compiler ourselves:

```
prompts/*.yaml (base specs)
    ↓ js-yaml (parse)
SpecConfig[] (validated)
    ↓ @iqai/prompt-weaver (template engine)
    ↓ Per-model renderer plugins (apply provider conventions)
    ↓ zod (validate schema)
compiled prompts: dist/prompts/{gpt,claude,gemini}/*.json
    ↓ SHA-256 (hash)
manifest.json (deterministic build record)
```

### Stack
| Component | Library | Purpose |
|-----------|---------|---------|
| YAML parsing | `js-yaml` (mature, 2.7K stars) | Parse base spec YAML files |
| Template engine | `@iqai/prompt-weaver` | Handlebars-based template compilation with Zod validation |
| Schema validation | `zod` | Type-safe spec validation, compile-time checking |
| Deterministic builds | `crypto.createHash('sha256')` | Hash source specs + renderer version for reproducibility |
| Per-model renderers | Custom TypeScript plugins | Apply each provider's official conventions |

### Why Not Microsoft prompt-engine Directly?
- Abandoned since 2022 (80 commits total)
- No per-model rendering support
- Limited to Code/Chat engines — not general-purpose prompt specs
- Pattern is valid; codebase is stale

### Why PromptWeaver?
- Active development (Dec 2025)
- Handlebars → familiar syntax for template authors
- Zod integration → type-safe, validated prompts
- Template compilation caching → same spec = cached compiled output
- Reusable partials → DRY prompt fragments
- Fluent Builder API → dynamic prompt construction when needed

## Relevance to ultimate-pi Prompt Renderer

The build-time compilation architecture should:

1. **Accept a base prompt spec (YAML)** as input: `prompts/base/system.yaml`
2. **Use PromptWeaver as the template engine**: Handlebars syntax, Zod validation, template caching
3. **Apply per-model renderer plugins**: Each plugin knows its provider's official conventions (OpenAI constraints-first, Anthropic XML tags, Google constraints-last)
4. **Compile at build time** via `npm run compile-prompts` → outputs `dist/prompts/{model}/*.json`
5. **Ship compiled JSON in npm package** — no template engine at runtime
6. **Runtime just does JSON.parse + string replace**: `__VAR_name__` placeholders for runtime variables
7. **Deterministic builds**: Same YAML + same renderer version → identical compiled output (hash-verified)
