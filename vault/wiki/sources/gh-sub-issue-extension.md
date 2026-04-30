---
type: source
source_type: github-repo
title: "gh-sub-issue: GitHub CLI Extension for Sub-Issues"
author: yahsan2
date_published: 2025
url: https://github.com/yahsan2/gh-sub-issue
confidence: high
key_claims:
  - "Community `gh` CLI extension for managing sub-issues (parent-child relationships)"
  - "Supports add, create, list, remove operations on sub-issues"
  - "Uses GitHub GraphQL API under the hood, not custom reference schemes"
  - "Cross-repository support"
  - "JSON output for machine readability"
  - "110 stars, 35 commits, MIT license"
  - "Non-destructive: links existing issues without closing or recreating them"
tags:
  - github
  - cli
  - sub-issues
  - gh-extension
related:
  - "[[Research: GitHub Issues as Harness Spec Storage]]"
  - "[[gh-cli-sub-issue-rfc]]"
---

# gh-sub-issue: GitHub CLI Extension for Sub-Issues

Community `gh` CLI extension (110 stars, MIT) bridging the gap where `gh` CLI lacks native sub-issue support.

## Commands

| Command | Purpose |
|---------|---------|
| `gh sub-issue add <parent> <child>` | Link existing issue as child of parent |
| `gh sub-issue create --parent <id> --title "..."` | Create new child issue |
| `gh sub-issue list <parent>` | List all children of a parent |
| `gh sub-issue remove <parent> <child>` | Unlink child from parent |

## Key Features

- **JSON output**: `--json number,title,state,labels` for machine parsing
- **Cross-repo**: `--repo owner/repo` to work across repositories
- **Force remove**: `--force` to skip confirmation prompts
- **Output formats**: TTY (colored), plain text, JSON
- **Non-destructive**: Uses native GitHub sub-issue relationships, not custom reference schemes

## Installation

```bash
gh extension install yahsan2/gh-sub-issue
```

Requirements: `gh` CLI 2.0.0+, GitHub account with repo write access.

## Harness Integration

This extension is the primary CLI tool for creating harness task sub-issues from L2 structured planning. Example harness workflow:

```bash
# Create spec issue
SPEC_ID=$(gh issue create --title "Spec: Add user auth" --body "..." --label harness-spec,layer-1 --json number -q .number)

# Create task sub-issues
gh sub-issue create --parent $SPEC_ID --title "P1: Design DB schema" --label harness-task
gh sub-issue create --parent $SPEC_ID --title "P2: Implement JWT tokens" --label harness-task

# Check progress
gh sub-issue list $SPEC_ID --json number,title,state
```
