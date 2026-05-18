---
name: ast-grep
description: "Structural code search using AST patterns via the `sg` CLI. Use when searching for code patterns, finding all call sites, locating function/class definitions, matching import structures, or any task where code shape matters not just text. Triggers on: find all usages, where is X called, find functions that, pattern search, structural search, AST search, find imports of, find class definitions, find methods with, codemod, rewrite code, refactor pattern, sg, ast-grep."
allowed-tools:
  - Bash(sg *)
  - Bash(npm install -g @ast-grep/cli)
---

# ast-grep: Structural Code Search

Search code by structure, not text. `sg` uses tree-sitter to parse code into ASTs, then matches patterns against the tree. It understands code semantics — not just string matching.

## Install

```bash
npm install -g @ast-grep/cli
```

Verifies with `sg --version`.

## When to Use

| Task | Tool | Why |
|------|------|-----|
| Find code by structure/pattern | **ast-grep** (`sg`) | AST-aware — knows what is a function call vs a string |
| Find code by concept/meaning | graphify / `ccc search` | Architecture (graphify) vs implementation chunks (`ccc`) |
| Find exact literal string | `grep` | Only tool for non-code files or exact byte match |
| Explore architecture | graphify | Call graph, community detection |

**Rule:** For any code search involving patterns, signatures, or structure — use `sg` first. Reserve `grep` for exact literal strings in non-code files (configs, logs, markdown).

## Pattern Syntax

Patterns match code structure. Write code like you'd write it — `sg` parses it as AST.

### Metavariables

Prefix with `$` to match any expression, type, or identifier:

| Pattern | Matches |
|---------|---------|
| `$X` | Any single expression, identifier, or type |
| `$NAME` | Captures and names the match (use in rewrites) |
| `...` | Matches zero or more of anything (statements, args, etc.) |
| `$$...ARGS` | Captures multiple items as a list |

### Examples

```
# Any function call to `fetch` with any arguments
fetch($ARGS)

# Any function definition named `handle`
function handle($PARAMS) { ... }

# Any import from `react`
import $X from 'react'

# Any method call on `console`
console.$METHOD($ARGS)

# Any try-catch block
try { ... } catch ($ERR) { ... }

# Any class extending something
class $NAME extends $BASE { ... }
```

### Language Specification

`sg` auto-detects language from file extensions. Override explicitly:

```bash
sg -p 'pattern' -l ts      # TypeScript
sg -p 'pattern' -l python  # Python
sg -p 'pattern' -l go      # Go
sg -p 'pattern' -l rust    # Rust
sg -p 'pattern' -l java    # Java
sg -p 'pattern' -l cpp     # C++
```

Supported languages: TypeScript, JavaScript, Python, Go, Rust, Java, C, C++, C#, Ruby, Swift, Kotlin, Scala, PHP, HTML, CSS, JSON, YAML, and more (full tree-sitter grammar set).

## Quick Reference

```bash
# Search by pattern (auto-detects language)
sg -p 'pattern'

# Search with language explicit
sg -p 'pattern' -l ts

# Search specific directory
sg -p 'pattern' src/

# Search with glob filter
sg -p 'pattern' --include '*.ts'

# Show context lines
sg -p 'pattern' -A 3    # 3 lines after
sg -p 'pattern' -B 3    # 3 lines before
sg -p 'pattern' -C 3    # 3 lines before and after

# List matching files only
sg -p 'pattern' --json | jq -r '.[].file' | sort -u

# Count matches
sg -p 'pattern' | wc -l

# Interactive selection (fuzzy picker)
sg -p 'pattern' --interactive
```

## Common Patterns

### Find all call sites of a function

```bash
# Who calls `processPayment`?
sg -p 'processPayment($ARGS)'

# Who calls `console.log`?
sg -p 'console.log($ARGS)'

# Who calls any method on `db`?
sg -p 'db.$METHOD($ARGS)'
```

### Find function/method definitions

```bash
# All async function definitions
sg -p 'async function $NAME($PARAMS) { ... }'

# All method definitions in a class (TS)
sg -p '$VISIBILITY $NAME($PARAMS) { ... }' -l ts

# All arrow functions assigned to const
sg -p 'const $NAME = ($PARAMS) => $BODY'
```

### Find imports

```bash
# Default import from specific module
sg -p 'import $X from "lodash"'

# Named imports
sg -p 'import { $NAMES } from "react"'

# Any import from a module
sg -p 'import * from "axios"'

# Dynamic imports
sg -p 'import($MODULE)'
```

### Find class definitions

```bash
# All class definitions
sg -p 'class $NAME { ... }'

# Classes extending a specific base
sg -p 'class $NAME extends Error { ... }'

# Classes with specific decorator
sg -p '@$DECORATOR(...) class $NAME { ... }'
```

### Find specific patterns

```bash
# All try-catch blocks
sg -p 'try { ... } catch ($E) { ... }'

# All useEffect calls (React)
sg -p 'useEffect(() => { ... }, [$DEPS])'

# All await expressions
sg -p 'await $EXPR'

# All error throws
sg -p 'throw new $ERR($ARGS)'

# All object destructuring
sg -p 'const { $PROPS } = $OBJ'
```

### Find and replace (codemods)

```bash
# Preview rewrite (dry run)
sg -p 'oldPattern($X)' --rewrite 'newPattern($X)' --dry-run

# Execute rewrite
sg -p 'oldPattern($X)' --rewrite 'newPattern($X)'

# Rewrite with language explicit
sg -p 'console.log($MSG)' --rewrite 'logger.info($MSG)' -l ts

# Rewrite across project using rules (see sgconfig.yml below)
sg scan
```

## Project Rules with sgconfig.yml

For project-wide pattern enforcement, create `sgconfig.yml` at project root:

```yaml
# sgconfig.yml
ruleDirs:
  - .sg/rules
```

Then create rule files in `.sg/rules/`:

```yaml
# .sg/rules/no-console-log.yml
id: no-console-log
language: TypeScript
severity: warning
rule:
  pattern: console.log($ARGS)
fix: logger.debug($ARGS)
message: "Use logger.debug instead of console.log"
```

```yaml
# .sg/rules/require-await.yml
id: no-floating-promises
language: TypeScript
severity: error
rule:
  pattern: $FUNC($ARGS)
  not:
    pattern: await $FUNC($ARGS)
  inside:
    kind: function_declaration
    stopBy: end
message: "Promise returned by $FUNC is not awaited"
```

```yaml
# .sg/rules/no-any.yml
id: no-explicit-any
language: TypeScript
severity: warning
rule:
  pattern: any
message: "Avoid using 'any' type — use unknown or a specific type"
```

Run rules:

```bash
# Scan all rules in sgconfig.yml
sg scan

# Scan specific rule
sg scan --rule .sg/rules/no-console-log.yml

# Scan specific directory
sg scan src/
```

### Rule Structure

Every rule file is YAML with these fields:

| Field | Required | Purpose |
|-------|----------|---------|
| `id` | Yes | Unique rule identifier (kebab-case) |
| `language` | Yes | Language to match (TypeScript, Python, Go, etc.) |
| `severity` | Yes | `error`, `warning`, `hint`, `info` |
| `rule` | Yes | The pattern to match (supports `pattern`, `not`, `inside`, `has`, `follows`, `all`, `any`) |
| `message` | Yes | Human-readable explanation |
| `fix` | No | Rewrite template (uses same metavariables) |

### Composite Rule Matchers

```yaml
# Match ALL conditions
rule:
  all:
    - pattern: console.log($X)
    - inside:
        kind: function_declaration

# Match ANY condition
rule:
  any:
    - pattern: console.log($X)
    - pattern: console.warn($X)

# Exclude matches
rule:
  pattern: fetch($URL)
  not:
    pattern: fetch($URL, { init: $INIT })

# Must be inside specific AST node
rule:
  pattern: $CALL($ARGS)
  inside:
    kind: try_statement

# Must follow another pattern
rule:
  pattern: $X.close()
  follows:
    pattern: $X.open()
```

## Search Decision Flow

```
Need to find code
  ├─ Structural pattern (function calls, imports, classes)? → sg -p 'pattern'
  ├─ Rewrite/codemod needed? → sg -p 'old' --rewrite 'new'
  ├─ Project-wide lint rule? → sg scan (with sgconfig.yml)
  ├─ Conceptual/semantic search? → graphify query (architecture) or ccc search (implementation)
  ├─ Explore architecture? → graphify
  └─ Exact literal string in non-code? → grep
```

## Output Formats

```bash
# Default (grep-compatible): file:line:column: match
sg -p 'pattern'

# JSON (for piping/automation)
sg -p 'pattern' --json

# Only file paths (deduplicated)
sg -p 'pattern' --json | jq -r '.[].file' | sort -u
```

## Tips

- **Metavariables are greedy by default.** `$X` matches the smallest valid AST node. Use `$$$X` to match multiple nodes.
- **`...` matches zero or more.** Inside function body `{ ... }` matches any statements. In call args `fn(...)` matches any number of arguments.
- **Pattern must be valid code for the target language.** `sg` parses the pattern itself as AST.
- **Use `--json` for automation.** Parse results programmatically instead of grepping output.
- **Combine with find for scoped searches.** `find src/ -name '*.ts' -exec sg -p 'pattern' {} +`
- **Rules compose.** Multiple rules in `sgconfig.yml` run together with `sg scan`.

## Integration with Pi Workflow

1. **Before grep on code files** — consider if `sg -p` would be more precise.
2. **After graphify identifies a node** — use `sg` to find all call sites or definitions.
3. **For refactoring tasks** — use `sg -p ... --rewrite ...` for safe structural rewrites.
4. **For code review** — run `sg scan` with project rules to catch anti-patterns.
