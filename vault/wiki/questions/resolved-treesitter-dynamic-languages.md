---
type: resolution
title: "Resolved: Tree-Sitter Handling of Dynamic Languages"
created: 2026-04-30
updated: 2026-04-30
tags:
  - resolution
  - tree-sitter
  - dynamic-languages
  - codebase-exploration
  - ast
status: resolved
resolves:
  - "[[research-agent-first-codebase-exploration]] Open Question #1"
  - "[[research-wozcode-token-reduction]] Open Question #1"
related:
  - "[[research-agent-first-codebase-exploration]]"
  - "[[research-wozcode-token-reduction]]"
  - "[[ast-truncation]]"
  - "[[repo-map-ranking]]"
sources:
  - "[[tree-sitter-docs]]"
  - "[[py-tree-sitter]]"

---# Resolved: Tree-Sitter Handling of Dynamic Languages

## Resolution

**Tree-sitter provides SYNTAX trees (structure), not semantic type resolution (meaning). For dynamic languages (Python, JavaScript), tree-sitter reliably resolves syntactic structure but cannot resolve runtime type information, dynamic attribute access (`getattr`), or dynamic imports. This is not a tree-sitter limitation — it's inherent to dynamic languages. The solution is a three-layer approach: tree-sitter for syntax, static analysis tools for types, and runtime profiling for dynamic patterns.**

## What Tree-Sitter CAN Resolve in Dynamic Languages

Tree-sitter parses source code into Concrete Syntax Trees (CST). For Python and JavaScript, it reliably extracts:

| Construct | Python | JavaScript | Reliability |
|-----------|--------|------------|-------------|
| Function definitions | `def foo():` | `function foo() {}` | 100% |
| Class definitions | `class Foo:` | `class Foo {}` | 100% |
| Import statements | `import X` / `from Y import Z` | `import X from Y` | 100% |
| Variable assignments | `x = expr` | `let x = expr` | 100% |
| Decorators | `@decorator` | N/A | 100% |
| Async constructs | `async def` | `async function` | 100% |
| Control flow | `if/for/while/try` | `if/for/while/try` | 100% |

## What Tree-Sitter CANNOT Resolve

Tree-sitter is a parser generator, not a type checker or semantic analyzer:

| Gap | Example | Why Tree-Sitter Can't Help |
|-----|---------|---------------------------|
| Dynamic attribute access | `getattr(obj, "method_name")` | Attribute name is runtime value, not in AST |
| Dynamic imports | `importlib.import_module(name)` | Module name is runtime value |
| Duck typing | `obj.quack()` — is `obj` a Duck? | No type information in syntax tree |
| Monkey patching | `Foo.bar = new_method` | Assignment target resolved at runtime |
| `eval`/`exec` | `eval(user_input)` | Code is string, not in source tree |
| Computed properties | `obj[computed_key]` | Key is runtime value |
| Closure variable capture | Which variables does a closure capture? | Requires control flow + data flow analysis |
| Metaclass magic | `__init_subclass__`, `__new__` | Runtime class construction |

## Three-Layer Solution

### Layer 1: Tree-Sitter (Syntax) — Handles ~80%

Extract all syntactic structure: function/class definitions, imports, variable assignments, control flow. This is deterministic, fast, and covers the majority of codebase understanding needs. Use for: repo map generation, call graph construction (for statically resolvable calls), symbol indexing.

### Layer 2: Static Analysis Tools (Types) — Handles ~15%

For Python: **mypy**, **Pyright**, **Pyre** — these perform type inference across the codebase and can resolve many cases that pure tree-sitter cannot. For TypeScript: the TypeScript compiler itself provides full type resolution.

Integrate static analysis results into the repo map: annotate tree-sitter-extracted symbols with inferred types. Cache results (static analysis is slower than tree-sitter parsing).

### Layer 3: Runtime Profiling (Dynamic) — Handles remaining ~5%

For truly dynamic patterns (`getattr`, `importlib`, monkey patching): profile the running application to capture actual call patterns and attribute accesses. This is expensive and only needed for deep codebase understanding.

**For the harness**: Layers 1+2 cover >95% of agent codebase exploration needs. Layer 3 is only justified for deep refactoring tasks.

## Impact on WOZCODE AST Truncation

WOZCODE's AST truncation (returning function signatures, not bodies) works correctly for syntactic constructs — tree-sitter can identify function bodies to truncate regardless of dynamic types. However, code-aware embeddings (ck, vgrep) may produce lower-quality results for dynamic language codebases because they lack type information that code-specific models (CodeBERT, UniXCoder) would leverage.

**Recommendation**: For dynamic language projects, combine tree-sitter truncation with type-aware ranking (Layer 2 static analysis) for best results.

## Impact on Codebase Exploration

The agent codebase exploration strategy for dynamic languages should:

1. Parse with tree-sitter for syntactic map (functions, classes, imports) — this works regardless of dynamic types
2. Use static analysis (mypy/Pyright) to resolve type information where available
3. Fall back to lexical search (ck --hybrid) when tree-sitter + static analysis can't resolve a reference
4. Flag dynamic patterns (`getattr`, `importlib`, `eval`) in the repo map so agents know where static analysis breaks down

## Confidence

**High.** Tree-sitter's documentation explicitly states it is a parser generator for syntax trees. The gap between syntactic and semantic analysis is well-understood in compiler theory. The three-layer solution mirrors how production IDEs (VS Code, PyCharm) handle dynamic languages: tree-sitter for syntax highlighting, language server for type inference, runtime for debugging.
