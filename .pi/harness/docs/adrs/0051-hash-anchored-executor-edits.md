# ADR 0051: Hash-anchored read/edit (Dirac-inspired)

- **Status:** Accepted
- **Date:** 2026-05-26

## Context

Harness executor sessions used Pi’s `oldText`/`newText` `edit` tool. Line-number and fuzzy-match edits fail when files drift between read and edit, causing retries and token waste. [Dirac](https://github.com/dirac-run/dirac) demonstrates stable **hash-anchored** line targeting with Myers-diff anchor reconciliation; user evaluation chose adoption for the harness.

We already own adjacent concerns: **harness-lens** (LSP, indentation autopatch, format), **shell `sg`** (structural search per ADR 0045), **Sentrux** (architecture gate). We must not duplicate those layers.

## Decision

1. **First-class tools** — [`.pi/extensions/harness-anchored-edit.ts`](../../../extensions/harness-anchored-edit.ts) registers harness `read` and `edit`. No env toggle.
2. **Vendored core** in [`.pi/lib/harness-anchored-edit/`](../../../lib/harness-anchored-edit/) (Apache-2.0 subset from Dirac: anchor state, line protocol, resolve/apply).
3. **`read`** output: `AnchorWord§line` per line; anchor state scoped per session/task id.
4. **`edit`** input: `anchor`, optional `end_anchor` (defaults to `anchor` for single-line replace), `edit_type`, `text`; batch `edits[]` per file.
5. **Native apply** — `applyAnchoredEditsToFile` writes disk directly (Pi `edit-diff` for unified diff in tool result). No `resolve-to-pi-edit` / no delegation to `createEditTool`.
6. **Lens** — `tool_call` autopatch corrects indentation on anchored `edits[].text` only ([`anchored-edit-autopatch.ts`](../../../lib/harness-lens/clients/anchored-edit-autopatch.ts)). Legacy `oldText` autopatch remains for non-harness agents that still use Pi edit.
7. **Executor subprocess bundle** — `kinds.executor.extension_bundle: executor` loads `--no-extensions` plus curated `-e` modules only: `subagent-governance.ts`, `harness-anchored-edit.ts`, `harness-lens.ts` ([`resolveExtensionBundlePaths`](../../../lib/agents-policy.mjs)). Avoids loading the full `.pi/extensions` tree (parent orchestration, run-context phase hooks) while still providing hash-anchored read/edit and lens format-on-result.
8. **Builtin suppression** — Executor subprocesses use `--no-builtin-tools` + tool allowlist ([`agents.policy.yaml`](../agents.policy.yaml) via `noBuiltinTools` when `extension_bundle` or full extensions apply).
9. **Executor policy** (prompt + practice-map): batching discipline, post-edit verification before `submit_executor_handoff`, structural refactor via `sg -p` → anchored edit — **no** `replace_symbol` Pi tools.
10. **Remove** `grep`/`find` from executor tool policy; use `bash` + `sg` for code search.

## Consequences

### Positive

- More stable edits across multi-step executor and steer repair loops.
- Single anchored edit surface; no Pi text-match shim on the hot path.

### Negative

- Models must learn anchor `§` protocol.
- Vendored Dirac code must be kept in sync for security fixes (small surface).

## References

- [practice-map.md](../practice-map.md) — Executor edit discipline
- [ADR 0045](0045-harness-lens-minimal-contract.md) — lens vs sg vs Sentrux
- [ADR 0044](0044-harness-steer-loop.md) — repair mode uses same edit rules
