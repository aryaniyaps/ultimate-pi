---
name: ast-grep
description: "Structural code search and replacement using the sg CLI. Use for function calls, imports, class/method definitions, call sites, and codemods. Prefer LSP for definitions/references/types; use sg for structural patterns; reserve grep for exact literals, comments, URLs, or non-code files."
allowed-tools:
  - Bash(sg *)
  - Bash(npm install -g @ast-grep/cli)
---

# ast-grep: Structural Code Search (sg CLI)

Search code by structure, not text. ast-grep parses code into ASTs and matches code shape.

**Harness policy:** use the **`sg` shell CLI only**. harness-lens does not expose `ast_grep_search` / `ast_grep_replace` pi tools.

## Install CLI

```bash
npm install -g @ast-grep/cli
sg --version
```

`/harness-setup` installs global `sg` on the machine. That is a harness dev tool — it does not imply every target repo uses ast-grep rules.

## When to Use

| Task | Tool | Why |
|------|------|-----|
| Definitions, references, hover/types, symbol navigation | LSP (`lsp_navigation`) | Language server code intelligence |
| Type/error checks | LSP (`lsp_diagnostics`) | Active diagnostics |
| Find code by structure/pattern | `sg -p 'pattern'` | AST-aware matching |
| Safe structural replacement/codemod | `sg --rewrite` | Shape-preserving rewrites |
| Find code by concept/meaning | graphify / `ccc search` | Architecture vs implementation chunks |
| Architecture gate at review | Sentrux | Ship/promotion quality |
| Find exact literal string | `grep` | Non-code, comments, logs, generated text |

## Golden Rules

1. **Be specific** — `fetchMetrics($ARGS)` or `fetchMetrics($$$ARGS)`, not bare `fetchMetrics`.
2. **Scope it** — pass a directory or file to `sg` whenever possible.
3. **Retry once on zero matches** — simplify the pattern; then grep only if still empty.
4. **Dry-run replacements** — use `--dry-run` before applying rewrites.
5. **Valid code patterns** — `function $NAME($$$ARGS) { $$$BODY }`, not incomplete fragments.

## CLI Quick Reference

```bash
sg -p 'console.log($$$ARGS)' -l ts src/
sg -p 'import { $NAMES } from $PATH' -l go
sg -p 'pattern' --rewrite 'replacement' --dry-run
sg scan   # only when the target repo defines sg rules (not a harness default)
```

## Search Decision Flow

```text
Need to find code
  ├─ Definition, references, type, symbol? → lsp_navigation
  ├─ Diagnostics? → lsp_diagnostics
  ├─ Structural pattern? → sg -p 'pattern'
  ├─ Rewrite/codemod? → sg --rewrite
  ├─ Conceptual search? → graphify query or ccc search
  ├─ Architecture gate? → Sentrux
  └─ Exact literal in logs/text? → grep
```

## Integration with Pi Workflow

1. **Graph before grep** — graphify for architecture first.
2. **LSP before sg for code intelligence** — definitions, references, types.
3. **sg before grep on code** — structural patterns use AST matching.
4. **Project rules live in the target repo** — do not assume `.sg/rules/` from harness setup; Sentrux + project linters own gates.

Debug patterns: https://ast-grep.github.io/playground.html
