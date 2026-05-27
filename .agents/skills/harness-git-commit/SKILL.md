---
name: harness-git-commit
description: Commit staged git changes with configurable message format and Co-authored-by trailer from .pi/auto-commit.json. Use when the user asks to commit, when /harness-auto or harness run completion requires a commit, or before any git commit — never use raw git commit -m.
---

# harness-git-commit

Deterministic commits via bundled CLI. Config merges **project** `.pi/auto-commit.json` over **package** defaults (`$UP_PKG/.pi/auto-commit.json`). Project `coAuthor` fully replaces the package default after merge.

## When to use

- User explicitly asks to create a git commit
- Harness pipeline step says commit after review pass
- You are about to run `git commit`, `git commit -m`, or `git commit --amend`

## Forbidden

- **Do not** run raw `git commit` / `git commit -m` / `git commit --amend` in shell
- **Do not** hardcode `Co-authored-by:` lines in shell or HEREDOC — use this skill's CLI instead of HEREDOC `git commit` when committing harness work
- **Do not** `git push` unless the user asked
- **Do not** commit unless the user asked (or harness-auto locked gate explicitly requires it)

## Workflow

1. Resolve `UP_PKG` — see [`$UP_PKG/.pi/scripts/README.md`](../../.pi/scripts/README.md) (`harness-resolve-up-pkg.mjs`).
2. From **project root** (repo that owns `.pi/auto-commit.json`, not a submodule):
   ```bash
   node "$UP_PKG/.pi/scripts/harness-auto-commit-bootstrap.mjs"
   ```
3. Stage files: `git add …` (CLI does not stage).
4. Commit via CLI (examples):
   ```bash
   # Conventional subject from config template
   node "$UP_PKG/.pi/scripts/harness-git-commit.mjs" \
     --type fix --scope my-app --subject "short description"

   # Full message override (--message wins over --subject)
   node "$UP_PKG/.pi/scripts/harness-git-commit.mjs" \
     --message "chore(release): bump version" --body "- detail lines"

   # Amend: preserve body, ensure trailer
   node "$UP_PKG/.pi/scripts/harness-git-commit.mjs" --amend --message "$(git log -1 --format=%B)"

   # Preview only
   node "$UP_PKG/.pi/scripts/harness-git-commit.mjs" --dry-run --subject "preview"
   ```

## Config (project `.pi/auto-commit.json`)

| Field | Purpose |
|-------|---------|
| `message.template` | `{type}({scope}): {subject}` when scope set |
| `message.templateNoScope` | `{type}: {subject}` when scope empty |
| `message.typeDefault` / `scopeDefault` | Defaults for omitted CLI flags |
| `message.coAuthorTrailer` | `Co-authored-by: {login} <{email}>` |
| `coAuthor.login` / `coAuthor.email` | Attribution (project overrides package) |
| `coAuthor.required` | When false, skip trailer (default true) |

Edit project file to change format or co-author for external repos.

## Limitations

- Skill + CLI only — humans or bypassing agents can still run raw `git commit`
- Submodule/nested repos: commit from the root that owns `.pi/auto-commit.json`
- Squash/rebase on GitHub may drop co-author trailers — not fixable here
- Signed commits: pass `--signoff` on CLI if needed; GPG `-S` is caller responsibility

## References

- Auto-commit lifecycle policy: use bootstrap + commit CLI so co-author and message format stay consistent.
- Scripts — `harness-git-commit.mjs`, `harness-auto-commit-bootstrap.mjs`
- Library — `.pi/lib/harness-auto-commit-config.mjs`
