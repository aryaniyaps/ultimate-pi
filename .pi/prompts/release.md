---
description: Release a new version — bump version, generate changelog, tag, and push to trigger GitHub Actions CI/CD publish.
argument-hint: "[patch|minor|major] [--dry-run]"
---

# release — Version Bump + Changelog + Tag + Push

Releases a new version by bumping `package.json`, generating a `CHANGELOG.md` entry from commits since the last tag, committing, tagging, and pushing the tag. The push triggers `.github/workflows/publish-github-packages.yml` and `.github/workflows/publish-npm.yml`.

## Step 0 — Parse arguments

Read `$ARGUMENTS`. First positional arg is the bump type:

| Arg | Semver | When |
|-----|--------|------|
| `patch` | 0.1.X → 0.1.(X+1) | Bug fixes, small changes, chores |
| `minor` | 0.X.0 → 0.(X+1).0 | New features, dep additions |
| `major` | X.0.0 → (X+1).0.0 | Breaking changes |

If no bump type given: scan commits since last tag for conventional commit prefixes to infer:

```bash
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD --format="%s" 2>/dev/null
```

Inference rules:
- Any `feat!:` or `BREAKING CHANGE` → **major**
- Any `feat:` → **minor**
- Everything else (`fix:`, `chore:`, `docs:`, `refactor:`, etc.) → **patch**

If no commits since last tag, warn: "No commits since last tag. Nothing to release." and stop.

Present the inferred bump type to user. If they passed one explicitly, use that. If `--dry-run`, show what would happen without making changes.

## Step 1 — Read current version

```bash
node -e "console.log(require('./package.json').version)"
```

Store as `$CURRENT_VERSION`.

Compute `$NEW_VERSION`:

```bash
# Pseudo-code — use node for precision
NEW_VERSION=$(node -e "
const [maj,min,pat] = '$CURRENT_VERSION'.split('.').map(Number);
const bump = '$BUMP_TYPE';
if (bump === 'major') console.log((maj+1)+'.0.0');
else if (bump === 'minor') console.log(maj+'.'+(min+1)+'.0');
else console.log(maj+'.'+min+'.'+(pat+1));
")
```

## Step 2 — Pre-flight checks

```bash
# Must be in a git repo
git rev-parse --is-inside-work-tree || { echo "Not a git repo. Abort."; exit 1; }

# Must have a remote
git remote -v | grep -q origin || { echo "No origin remote. Abort."; exit 1; }

# Must be on a clean working tree
git diff --quiet && git diff --cached --quiet || { echo "Working tree is dirty. Commit or stash changes first."; exit 1; }

# Must be on a branch that can push (not detached HEAD)
git symbolic-ref -q HEAD || { echo "Detached HEAD. Switch to a branch first."; exit 1; }
```

## Step 3 — Generate changelog

Gather commits since last tag:

```bash
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -z "$LAST_TAG" ]; then
  COMMITS=$(git log --oneline --no-merges HEAD)
else
  COMMITS=$(git log --oneline --no-merges ${LAST_TAG}..HEAD)
fi
```

Parse conventional commit prefixes to group:

| Prefix | Changelog Section |
|--------|-------------------|
| `feat!:` | ⚠️ Breaking Changes |
| `feat:` | ✨ Features |
| `fix:` | 🐛 Fixes |
| `perf:` | ⚡ Performance |
| `refactor:` | ♻️ Refactoring |
| `docs:` | 📖 Documentation |
| `style:` | 🎨 Style |
| `test:` | ✅ Tests |
| `chore:` | 🔧 Chores |
| `ci:` | 🔄 CI/CD |
| `build:` | 📦 Build |
| everything else | 🔧 Chores |

Generate the changelog entry:

```markdown
## [v$NEW_VERSION] — $(date +%Y-%m-%d)

### $SECTION_NAME

- $commit_message (no prefix, just the description)

...
```

If `CHANGELOG.md` exists, prepend the new entry after the `# Changelog` heading. If not, create it:

```markdown
# Changelog

All notable changes to this project are documented in this file.

## [v$NEW_VERSION] — $(date +%Y-%m-%d)

### $SECTION

- $entry

...
```

## Step 4 — Bump version in package.json

```bash
npm pkg set version="$NEW_VERSION"
```

Verify:
```bash
node -e "const v = require('./package.json').version; console.log(v === '$NEW_VERSION' ? '✓ version bumped to $NEW_VERSION' : '✗ version mismatch')"
```

## Step 5 — Dry run check

If `--dry-run` flag: print summary and stop. Do NOT commit, tag, or push.

```
DRY RUN — no changes made.
  Version: $CURRENT_VERSION → $NEW_VERSION
  Bump: $BUMP_TYPE
  Commits since $LAST_TAG: $COMMIT_COUNT
  Files that would change:
    - package.json (version)
    - CHANGELOG.md (new entry)
  Tag that would be created: v$NEW_VERSION
```

## Step 6 — Commit version bump + changelog

```bash
git add package.json CHANGELOG.md

git commit -m "chore(release): bump to v$NEW_VERSION" -m "- Bump version in package.json
- Add changelog entry for v$NEW_VERSION

Commits included:
$(echo "$COMMITS" | sed 's/^/- /')" -m "Co-authored-by: pi-mono <261679550+pi-mono@users.noreply.github.com>"
```

Use the co-author from `.pi/auto-commit.json` if available, otherwise use the default pi-mono co-author.

## Step 7 — Create and push tag

```bash
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION — $BUMP_TYPE bump

$(echo "$COMMITS" | sed 's/^/- /')"

git push origin "v$NEW_VERSION"
```

**Important**: Push only the tag, not the branch. The workflows trigger on `v*` tag push.
- `publish-github-packages.yml` → publishes `@aryaniyaps/ultimate-pi` to GitHub Packages
- `publish-npm.yml` → publishes `ultimate-pi` to npm registry

Optionally also push the commit if user wants the branch updated:
```bash
git push origin $(git branch --show-current)
```

Ask user: "Push the version-bump commit to the current branch too? [Y/n]"

## Step 8 — Report

```
✓ Released v$NEW_VERSION ($BUMP_TYPE)
  Tag: v$NEW_VERSION — pushed to origin
  Workflows triggered:
    - .github/workflows/publish-github-packages.yml
    - .github/workflows/publish-npm.yml
  Commit: $(git rev-parse --short HEAD)
  Changelog: CHANGELOG.md updated
  Monitor: https://github.com/aryaniyaps/ultimate-pi/actions
```

## Guard Rails

- **Clean tree required**: Block if uncommitted changes exist.
- **No duplicate tags**: Block if `v$NEW_VERSION` tag already exists locally or on remote.
- **No empty releases**: Block if no commits since last tag.
- **Valid semver only**: Block if current version doesn't parse as `X.Y.Z`.
- **Dry run safe**: `--dry-run` prints planned changes without modifying anything.
- **Manual workflow dispatch**: If workflows support `workflow_dispatch`, user can re-trigger manually from GitHub Actions UI if push fails.
- **Co-author idempotent**: Falls back to default pi-mono if `.pi/auto-commit.json` is missing.

## Error Handling

| Error | Action |
|-------|--------|
| No commits since last tag | Report, suggest making changes first. Stop. |
| Dirty working tree | Report dirty files. Suggest `git stash` or commit. Stop. |
| Tag already exists | Report conflict. User must delete old tag or bump differently. Stop. |
| No origin remote | Report. Suggest `git remote add origin <url>`. Stop. |
| Detached HEAD | Report. Suggest `git checkout main`. Stop. |
| Invalid semver | Report current version string. Stop. |
| npm pkg set fails | Check Node.js and npm version. Report error. Stop. |
| git push fails | Check auth. Report error. Suggest manual push. |
