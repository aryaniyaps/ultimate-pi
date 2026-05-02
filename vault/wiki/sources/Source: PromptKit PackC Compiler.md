---
type: source
source_type: official-docs
title: "PromptKit PackC Compiler — Compilation Architecture"
author: "Altaira Labs"
date_published: 2025-01-16
url: "https://promptkit.altairalabs.ai/packc/explanation/compilation/"
confidence: high
tags:
  - prompt-compilation
  - build-tools
  - yaml-to-json
related:
  - "[[Research: Prompt Renderer for Multi-Model Agent Harness]]"
key_claims:
  - "PackC transforms YAML configurations into validated JSON packs through a 5-stage compilation pipeline"
  - "Deterministic builds: same input + same version → identical output with sorted keys and consistent whitespace"
  - "Template validation at compile time (syntax check) but execution deferred to runtime (no runtime data available)"
  - "Fragment handling: inline (faster execution, larger) vs reference (smaller size, runtime lookup)"
  - "Build reproducibility via version locking, input hashing, and build manifest"
  - "Modular compiler architecture: Parser → Validator → Assembler → Serializer, each independently testable"
---

# PromptKit PackC — Compilation Architecture

**Package**: `@altairalabs/packc` (npm, v1.4.6, 48 versions)
**Language**: Go (compiled CLI)
**Repository**: github.com/AltairaLabs/PromptKit

## Summary

PackC is a purpose-built **prompt compiler** that transforms human-friendly YAML configurations into validated, deterministic JSON packs for LLM applications. It is part of the larger PromptKit ecosystem (Arena for testing, SDK for runtime, Runtime for pipelines).

The key insight is that PackC treats prompts as **compilation artifacts** — compile once at build time, ship validated JSON in the npm package. This is the pattern the ultimate-pi prompt renderer should adopt.

## 5-Stage Compilation Pipeline

1. **Configuration Loading**: Read `arena.yaml` → resolve file paths → load prompt YAMLs → parse into `PromptConfig` structs
2. **Prompt Registry**: Central repository with deduplication by `task_type`, fast lookup by ID, validation on registration
3. **Validation**: Required fields check, template syntax check, parameter type check, tool reference validation, media file existence
4. **Pack Assembly**: Create pack structure → add prompts to map → add fragments → add metadata (compiler version, timestamp) → assign pack ID
5. **JSON Serialization**: `json.MarshalIndent` with 2-space indent, sorted keys, deterministic ordering

## Template Processing

- **Default engine**: Go templates (`{{.Variable}}` syntax)
- **Syntax validated at compile time**: `template.New("test").Parse(tmpl)` — no execution
- **Runtime execution deferred**: SDK handles actual template rendering with live variables
- **Why not pre-compile?** Templates need runtime data; packs stay language-agnostic; SDK handles execution

## Fragment Handling

Two strategies for reusable prompt fragments:
- **Inline** (default): Fragment content embedded directly in prompt — faster execution, larger pack size
- **Reference**: Fragment stored separately, referenced by key — smaller size, runtime lookup overhead

## Deterministic Builds

- **Version locking**: `.packc-version` file pins compiler version
- **Input hashing**: `sha256sum` over all source files
- **Build manifest**: Records version, source files, hashes, timestamp, machine
- **Guarantee**: Same source + same version + same flags → identical pack.json (same checksums)

## Compiler Architecture

```
PackCompiler
├── Parser (YAML → PromptConfig)
├── Validator (checks)
├── Assembler (build pack)
└── Serializer (write JSON)
```

Each component is independent, testable, and replaceable. Extension points for custom parsers, validators, and serializers.

## Memory Management

- Streaming YAML parsing (process files one at a time)
- Lazy loading (load prompts on demand)
- Garbage collection (release after compilation)
- No caching (don't hold data post-compile)
- For 100+ prompts: single-prompt compilation for testing, subsets for development, full only for releases

## Relevance to ultimate-pi Prompt Renderer

PackC validates the **build-time compilation** pattern for prompts. The ultimate-pi renderer should:
1. Accept a base prompt spec (YAML/JSON) as input
2. Compile per-model variants at build time (not runtime)
3. Validate template syntax at compile time
4. Ship compiled JSON in the npm package
5. Use deterministic builds for reproducible output
6. Separate compilation from execution: compiler validates, runtime renders with live variables
