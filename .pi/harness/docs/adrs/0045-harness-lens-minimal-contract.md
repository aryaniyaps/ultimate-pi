# ADR 0045: Harness-lens minimal contract

## Status

Accepted — 2026-05-24

## Context

ultimate-pi previously shipped a trimmed fork of pi-lens with bundled YAML rules, ast-grep pi tools, and JS/TS-centric session scans. That overlapped Sentrux (architecture gate), shell `sg` (structural search), and graphify/ccc (recon). Target projects can be any stack (Go, Python, Rust, polyglot monorepos).

## Decision

Replace the fork with a **harness-native** extension at `.pi/extensions/lib/harness-lens/`:

| Concern | Owner |
|---------|--------|
| Recon | graphify, ccc |
| Structural search | shell `sg` only |
| Architecture gate | Sentrux |
| Edit autopatch, secrets block, deferred format, LSP | harness-lens |

### Runtime contract

- **Edit autopatch** — indentation-only oldText correction on `tool_call` (edit).
- **Secrets** — regex scanner blocks writes with credentials (stack-agnostic).
- **Deferred format** — queue on `tool_result`, run at `agent_end` (default). `--immediate-format` and `--no-autoformat` unchanged.
- **Formatters** — PATH binaries only when the **target project** declares config (`biome.json`, `ruff` in `pyproject.toml`, `.prettierrc`, `go.mod` + gofmt, `Cargo.toml` + rustfmt, etc.). No bundled biome/ruff config in lens; no lazy gem/rustup installs.
- **LSP** — `lsp_diagnostics`, `lsp_navigation`; auto-touch on read/write/edit; installer catalog is **LSP servers only** (no shadow-install of biome/ruff/sg).
- **Session bootstrap** — `project-profile.ts` detects FileKinds from tree + markers; pre-install at most 2–3 LSP defaults for detected kinds only.

### External projects

- **Detect, don't assume** — no JS/TS export guard, no default biome for Go-only repos.
- **Harness setup tools ≠ lens stack** — `/harness-setup` may install global `sg` and optional `biome` on the machine; lens does not require them for unrelated stacks.
- **Graceful degradation** — missing LSP or formatter on PATH → skip with debug log.

### Flags

`--no-lens`, `--no-lsp`, `--no-autoformat`, `--immediate-format`, `--lens-guard` (interactive commit block when blockers present).

### Removed

- Bundled `rules/` YAML corpus, ast-grep pi tools, upstream `UPSTREAM_PIN.md` sync, duplicate export guard, AgentBehaviorClient, rules-scanner injection, cosmetic todo/go/rust scans.

## Consequences

- Smaller npm payload and one quality story per concern.
- Agents on external repos get stack-appropriate LSP/format behavior without harness JS defaults.
- `harness-verify.mjs` asserts no `lib/lens`, no bundled rules, no `ast_grep_search` in index.
