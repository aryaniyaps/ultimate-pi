---
type: concept
title: "Build-Time Prompt Compilation"
created: 2026-05-02
updated: 2026-05-02
tags:
  - prompt-compilation
  - build-time
  - deterministic-builds
  - npm-packaging
status: developing
related:
  - "[[Prompt Renderer]]"
  - "[[research: Prompt Renderer for Multi-Model Agent Harness]]"
sources:
  - "[[Source: Build-Time Prompt Compilation Architecture]]"

---# Build-Time Prompt Compilation

The practice of compiling prompts from a base specification into validated, model-specific output at **build time** (not runtime), then shipping the compiled output as static assets in an npm package.

## Why Build-Time?

| Aspect | Build-Time | Runtime |
|--------|-----------|---------|
| **Latency** | Zero at runtime | Template parse + render per request |
| **Caching** | Built-in (compiled output IS the cache) | Requires cache warming, TTL management |
| **Validation** | Syntax errors caught at build | Errors at request time |
| **npm distribution** | Static JSON files | Ship template engine + templates |
| **Determinism** | Hash-verifiable output | Runtime variables may differ |
| **Dependency weight** | None (compiled JSON is raw data) | Must ship template engine in bundle |
| **Real-world tools** | Microsoft prompt-engine (abandoned, 2.8K stars), PromptWeaver (active, MIT) | Jinja2, Handlebars runtime rendering |

## Pipeline Design

```
Source: prompts/*.yaml (base specs)
   ↓ [parser]
PromptConfig[] (validated AST)
   ↓ [model-renderers]
Per-model output: prompts/gpt/*.json, prompts/claude/*.json, prompts/gemini/*.json
   ↓ [validator]
Check: syntax, token thresholds, variable completeness
   ↓ [serializer]
Deterministic JSON (sorted keys, fixed formatting, hash manifest)
   ↓ [packager]
Included in npm package as static assets
```

## Deterministic Build Requirements

1. **Version-locked renderer**: Pinned compiler version in build manifest
2. **Input hashing**: `sha256sum` over all source spec files
3. **Build manifest**: Records compiler version, source files, file hashes, build time
4. **Same input → same output**: Guaranteed identical compiled prompts for same spec + version

## Incremental Compilation

Only recompile prompts whose spec hash changed:
1. Hash each source spec file
2. Compare against previous build manifest
3. Only recompile changed specs + specs that depend on changed fragments
4. Full compilation only for release builds

## Two-Phase Variable Model

```yaml
# Compile-time vars: resolved at build, produce multiple variants
model_name: { compile: true, values: [gpt-5.2, claude-sonnet-4.5] }
# → generates 2 compiled prompts per spec

# Runtime vars: resolved at call time, injected into compiled template
user_query: { compile: false }
# → placeholder left in compiled output for runtime substitution
```

## Token Budget Awareness

Compiled prompts must be validated against model-specific constraints:
- **Minimum cache threshold**: 1,024 tokens (OpenAI/Anthropic), 4,096 (Google)
- **Maximum context window**: Model-specific (e.g., 200K for Claude)
- **Cost estimate**: Embedded in compiled output metadata

## Integration with npm

```
ultimate-pi/
├── prompts/              # Source specs (committed to git)
│   ├── base/
│   │   ├── system.yaml
│   │   ├── spec-hardening.yaml
│   │   └── verify.yaml
│   └── fragments/
│       └── code-context.yaml
├── dist/
│   └── prompts/          # Compiled output (shipped in npm)
│       ├── gpt/
│       │   ├── system.json
│       │   └── verify.json
│       ├── claude/
│       │   └── system.json
│       └── gemini/
│           └── system.json
│       └── manifest.json  # Build manifest with hashes
└── scripts/
    └── compile-prompts.ts  # Build script
```
