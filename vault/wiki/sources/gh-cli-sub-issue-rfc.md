---
type: source
source_type: github-issue
title: "gh CLI Feature Request: Parent Issues / Sub-Tasks Support"
author: premun (cli/cli)
date_published: 2025-01-23
url: https://github.com/cli/cli/issues/10298
confidence: high
key_claims:
  - "`gh` CLI does not currently support setting parent issues / sub-tasks on issue create/edit"
  - "Feature request: --set-parent [ID] and --unset-parent [ID] flags on gh issue"
  - "Linked to PR #13057 (in progress as of April 2026)"
  - "Labeled: core (not accepting outside PRs), enhancement, gh-issue, needs-product"
tags:
  - github
  - cli
  - feature-request
  - sub-issues
related:
  - "[[Research: GitHub Issues as Harness Spec Storage]]"
  - "[[gh-sub-issue-extension]]"
---

# gh CLI Feature Request: Parent Issues / Sub-Tasks

Official feature request on `cli/cli` repo (44.2k stars) requesting native sub-issue support in `gh issue create` and `gh issue edit`.

## Status

- **Opened**: January 23, 2025
- **Status**: Open (as of April 2026)
- **Labels**: `core` (not accepting PRs from outside contributors), `enhancement`, `gh-issue`, `needs-product`
- **PR**: [#13057](https://github.com/cli/cli/pull/13057) — linked, in development

## Proposed Solution

```bash
# Create issue with parent
gh issue create --title "..." --set-parent 123

# Edit existing issue
gh issue edit 456 --set-parent 123
gh issue edit 456 --unset-parent
```

## Harness Impact

When native support lands in `gh` CLI, the harness can drop the `gh-sub-issue` extension dependency and use `gh issue create --parent` directly. Until then, the extension or raw `gh api` GraphQL calls are required.
