#!/usr/bin/env bash
#
# release.sh — Version bump, changelog, tag, and push
# Usage: ./.pi/scripts/release.sh [patch|minor|major] [--dry-run]
#
set -euo pipefail

# ─── Helpers ──────────────────────────────────────────────────────────────────
warn()  { echo "⚠ $*" >&2; }
abort() { echo "✗ $*" >&2; exit 1; }
ok()    { echo "✓ $*"; }

# ─── Step 0 — Parse arguments ─────────────────────────────────────────────────
BUMP_TYPE=""
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    patch|minor|major) BUMP_TYPE="$arg" ;;
    --dry-run)         DRY_RUN=true ;;
    *)                 abort "Unknown argument: $arg" ;;
  esac
done

# ─── Step 1 — Infer bump type from commits if not provided ────────────────────
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$BUMP_TYPE" ]; then
  ok "No bump type provided. Scanning commits since last tag…"

  if [ -z "$LAST_TAG" ]; then
    COMMIT_LOG=$(git log --format="%s" HEAD 2>/dev/null || true)
  else
    COMMIT_LOG=$(git log --format="%s" "${LAST_TAG}..HEAD" 2>/dev/null || true)
  fi

  if [ -z "$COMMIT_LOG" ]; then
    abort "No commits since last tag. Nothing to release."
  fi

  # Inference rules
  if echo "$COMMIT_LOG" | grep -qE '^feat!:|BREAKING CHANGE'; then
    BUMP_TYPE="major"
  elif echo "$COMMIT_LOG" | grep -qE '^feat:'; then
    BUMP_TYPE="minor"
  else
    BUMP_TYPE="patch"
  fi

  ok "Inferred bump type: $BUMP_TYPE"
fi

# ─── Step 2 — Read current version and validate semver ────────────────────────
CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null) \
  || abort "Failed to read version from package.json"

if ! [[ "$CURRENT_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  abort "Invalid semver in package.json: $CURRENT_VERSION"
fi

NEW_VERSION=$(node -e "
const [maj, min, pat] = '$CURRENT_VERSION'.split('.').map(Number);
const bump = '$BUMP_TYPE';
if (bump === 'major') console.log((maj + 1) + '.0.0');
else if (bump === 'minor') console.log(maj + '.' + (min + 1) + '.0');
else console.log(maj + '.' + min + '.' + (pat + 1));
")

ok "Version: $CURRENT_VERSION → $NEW_VERSION"

# ─── Step 3 — Pre-flight checks ───────────────────────────────────────────────

# Must be in a git repo
git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || abort "Not a git repository."

# Must have origin remote
git remote -v | grep -q origin \
  || abort "No 'origin' remote configured."

# Must be on a branch (not detached HEAD)
BRANCH=$(git symbolic-ref -q HEAD 2>/dev/null | sed 's|^refs/heads/||') \
  || abort "Detached HEAD. Switch to a branch first."

# Must have clean working tree (warn only in dry-run)
git diff --quiet && git diff --cached --quiet
if [ $? -ne 0 ]; then
  if [ "$DRY_RUN" = true ]; then
    warn "Working tree is dirty — actual release would be blocked."
  else
    abort "Working tree is dirty. Commit or stash changes first."
  fi
fi

# No duplicate tag locally or on remote
if git rev-parse "v$NEW_VERSION" >/dev/null 2>&1; then
  abort "Tag v$NEW_VERSION already exists locally."
fi
if git ls-remote --tags origin "refs/tags/v$NEW_VERSION" >/dev/null 2>&1; then
  abort "Tag v$NEW_VERSION already exists on remote."
fi

# ─── Step 4 — Gather commits since last tag ───────────────────────────────────
if [ -z "$LAST_TAG" ]; then
  COMMITS=$(git log --oneline --no-merges HEAD)
else
  COMMITS=$(git log --oneline --no-merges "${LAST_TAG}..HEAD")
fi

COMMIT_COUNT=$(echo "$COMMITS" | grep -c '^' || echo 0)

if [ "$COMMIT_COUNT" -eq 0 ]; then
  abort "No commits since last tag. Nothing to release."
fi

# ─── Step 5 — Generate changelog entry ────────────────────────────────────────

# Map conventional commit prefix → section
map_prefix() {
  local msg="$1"
  case "$msg" in
    feat!:*|*"BREAKING CHANGE"*) echo "breaking" ;;
    feat:*)                      echo "features" ;;
    fix:*)                      echo "fixes" ;;
    perf:*)                     echo "perf" ;;
    refactor:*)                 echo "refactor" ;;
    docs:*)                     echo "docs" ;;
    style:*)                    echo "style" ;;
    test:*)                     echo "tests" ;;
    chore:*)                    echo "chores" ;;
    ci:*)                       echo "ci" ;;
    build:*)                    echo "build" ;;
    *)                          echo "chores" ;;
  esac
}

declare -A SECTIONS=(
  [breaking]="⚠️ Breaking Changes"
  [features]="✨ Features"
  [fixes]="🐛 Fixes"
  [perf]="⚡ Performance"
  [refactor]="♻️ Refactoring"
  [docs]="📖 Documentation"
  [style]="🎨 Style"
  [tests]="✅ Tests"
  [chores]="🔧 Chores"
  [ci]="🔄 CI/CD"
  [build]="📦 Build"
)

# Build per-section entries
entries_breaking=""
entries_features=""
entries_fixes=""
entries_perf=""
entries_refactor=""
entries_docs=""
entries_style=""
entries_tests=""
entries_chores=""
entries_ci=""
entries_build=""

while IFS= read -r line; do
  [ -z "$line" ] && continue
  # Strip the short sha prefix (first word)
  msg="${line#* }"
  # Strip conventional commit prefix for display
  display="$msg"
  display=$(echo "$display" | sed -E 's/^[a-z]+(\([a-z0-9_-]+\))?!?:\s*//')
  prefix=$(map_prefix "$msg")
  case "$prefix" in
    breaking) entries_breaking="${entries_breaking}- $display
" ;;
    features) entries_features="${entries_features}- $display
" ;;
    fixes)    entries_fixes="${entries_fixes}- $display
" ;;
    perf)     entries_perf="${entries_perf}- $display
" ;;
    refactor) entries_refactor="${entries_refactor}- $display
" ;;
    docs)     entries_docs="${entries_docs}- $display
" ;;
    style)    entries_style="${entries_style}- $display
" ;;
    tests)    entries_tests="${entries_tests}- $display
" ;;
    ci)       entries_ci="${entries_ci}- $display
" ;;
    build)    entries_build="${entries_build}- $display
" ;;
    *)        entries_chores="${entries_chores}- $display
" ;;
  esac
done <<< "$COMMITS"

# Assemble the changelog block
TODAY=$(date +%Y-%m-%d)
CHANGELOG_BLOCK="## [v$NEW_VERSION] — $TODAY
"

for key in breaking features fixes perf refactor docs style tests ci build chores; do
  eval "content=\"\$entries_$key\""
  if [ -n "$content" ]; then
    CHANGELOG_BLOCK="${CHANGELOG_BLOCK}
### ${SECTIONS[$key]}

$content"
  fi
done

# ─── Step 6 — Dry run check ───────────────────────────────────────────────────
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "  DRY RUN — no changes made"
  echo "═══════════════════════════════════════════════════════════════"
  echo "  Version:  $CURRENT_VERSION → $NEW_VERSION"
  echo "  Bump:     $BUMP_TYPE"
  echo "  Commits:  $COMMIT_COUNT since ${LAST_TAG:-<none>}"
  echo "  Branch:   $BRANCH"
  echo ""
  echo "  Files that would change:"
  echo "    - package.json  (version → $NEW_VERSION)"
  echo "    - CHANGELOG.md  (new entry below)"
  echo ""
  echo "  Tag that would be created: v$NEW_VERSION"
  echo ""
  echo "  Changelog entry:"
  echo "───────────────────────────────────────────────────────────────"
  echo "$CHANGELOG_BLOCK"
  echo "───────────────────────────────────────────────────────────────"
  exit 0
fi

# ─── Step 7 — Bump version in package.json ────────────────────────────────────
npm pkg set version="$NEW_VERSION"

node -e "
const v = require('./package.json').version;
if (v !== '$NEW_VERSION') {
  console.error('✗ version mismatch: expected $NEW_VERSION, got ' + v);
  process.exit(1);
}
console.log('✓ version bumped to $NEW_VERSION');
"

# ─── Step 8 — Write CHANGELOG.md ──────────────────────────────────────────────
if [ -f CHANGELOG.md ]; then
  # Prepend after the first heading line
  {
    head -n 1 CHANGELOG.md
    echo ""
    echo "$CHANGELOG_BLOCK"
    tail -n +2 CHANGELOG.md
  } > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
else
  {
    echo "# Changelog"
    echo ""
    echo "All notable changes to this project are documented in this file."
    echo ""
    echo "$CHANGELOG_BLOCK"
  } > CHANGELOG.md
fi

ok "CHANGELOG.md updated"

# ─── Step 9 — Read co-author config ───────────────────────────────────────────
CO_AUTHOR="pi-mono <261679550+pi-mono@users.noreply.github.com>"
if [ -f .pi/auto-commit.json ]; then
  CO_AUTHOR=$(node -e "
    const fs = require('fs');
    const cfg = JSON.parse(fs.readFileSync('.pi/auto-commit.json', 'utf8'));
    const ca = cfg.coAuthor || {};
    console.log((ca.login || 'pi-mono') + ' <' + (ca.email || '261679550+pi-mono@users.noreply.github.com') + '>');
  " 2>/dev/null) || true
fi

# ─── Step 10 — Commit ─────────────────────────────────────────────────────────
git add package.json CHANGELOG.md

COMMIT_BODY=$(cat <<EOF
- Bump version in package.json
- Add changelog entry for v$NEW_VERSION

Commits included:
$(echo "$COMMITS" | sed 's/^/- /')
EOF
)

git commit -m "chore(release): bump to v$NEW_VERSION" \
           -m "$COMMIT_BODY" \
           -m "Co-authored-by: $CO_AUTHOR"

ok "Committed version bump + changelog"

# ─── Step 11 — Create and push tag ────────────────────────────────────────────
TAG_BODY=$(cat <<EOF
Release v$NEW_VERSION — $BUMP_TYPE bump

$COMMITS
EOF
)

git tag -a "v$NEW_VERSION" -m "$TAG_BODY"
ok "Created tag v$NEW_VERSION"

git push origin "v$NEW_VERSION"
ok "Pushed tag v$NEW_VERSION to origin"

# ─── Step 12 — Optionally push branch commit ──────────────────────────────────
echo ""
read -rp "Push the version-bump commit to the current branch ($BRANCH) too? [Y/n] " PUSH_BRANCH
if [[ "$PUSH_BRANCH" =~ ^[Yy]?$ ]]; then
  git push origin "$BRANCH"
  ok "Pushed commit to $BRANCH"
else
  echo "Skipped branch push."
fi

# ─── Step 13 — Report ─────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ Released v$NEW_VERSION ($BUMP_TYPE)"
echo "═══════════════════════════════════════════════════════════════"
echo "  Tag:      v$NEW_VERSION — pushed to origin"
echo "  Commit:   $(git rev-parse --short HEAD)"
echo "  Branch:   $BRANCH"
echo ""
echo "  Workflows triggered:"
echo "    - .github/workflows/publish-github-packages.yml"
echo "    - .github/workflows/publish-npm.yml"
echo ""
echo "  Changelog: CHANGELOG.md updated"
echo "  Monitor:   https://github.com/aryaniyaps/ultimate-pi/actions"
echo "═══════════════════════════════════════════════════════════════"
