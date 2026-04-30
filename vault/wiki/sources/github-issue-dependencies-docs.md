---
type: source
source_type: documentation
title: "GitHub Issue Dependencies — Official Documentation"
author: GitHub Docs
date_published: 2025-04
url: https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies
confidence: high
key_claims:
  - "Issue dependencies define blocked-by and blocking relationships between issues"
  - "Dependencies are distinct from sub-issues — they define execution order, not decomposition"
  - "Blocked issues show a Blocked icon on project boards and Issues page"
  - "Available on Free, Pro, Team, and Enterprise Cloud plans"
  - "Requires at least triage permissions"
tags:
  - github
  - issues
  - dependencies
  - project-management
related:
  - "[[Research: GitHub Issues as Harness Spec Storage]]"
  - "[[github-sub-issues-docs]]"
---

# GitHub Issue Dependencies — Official Documentation

GitHub's official documentation for issue dependencies (blocked-by / blocking relationships).

## Key Capabilities

- **Blocked by**: Mark an issue as dependent on another issue's completion
- **Blocking**: Mark an issue as preventing another from progressing
- **Visual indicators**: Blocked icon on project boards and Issues list
- **Multiple dependencies**: An issue can be blocked by multiple issues, and block multiple issues

## Distinction from Sub-Issues

| Feature | Sub-Issues | Dependencies |
|---------|------------|--------------|
| Relationship | Parent-child (decomposition) | Blocked-by / blocking (ordering) |
| Progress roll-up | Automatic (parent shows child completion %) | Manual (no auto-status from deps) |
| Hierarchical limit | 8 levels deep | No depth limit (graph) |
| Per-parent limit | 100 children | No limit |

## Relevance to Harness

L2 Structured Planning produces a task DAG. Dependencies map the DAG edges — "Task B cannot start until Task A completes." Sub-issues map the tree structure — "Spec S decomposes into Tasks A, B, C." Both are needed for full task topology.
