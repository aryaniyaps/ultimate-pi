---
type: source
source_type: documentation
title: "GitHub Sub-Issues — Official Documentation"
author: GitHub Docs
date_published: 2025-04-11
url: https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues
confidence: high
key_claims:
  - "Sub-issues allow breaking larger issues into smaller tasks, available since April 2025"
  - "Up to 100 sub-issues per parent issue and up to 8 levels of nested sub-issues"
  - "Parent issues and sub-issue progress is available in GitHub Projects (filter, group, views)"
  - "Sub-issues can themselves contain sub-issues (full hierarchies)"
  - "Cross-repository sub-issues supported"
  - "Requires at least triage permissions"
tags:
  - github
  - issues
  - sub-issues
  - project-management
related:
  - "[[Research: GitHub Issues as Harness Spec Storage]]"
---

# GitHub Sub-Issues — Official Documentation

GitHub's official documentation for the sub-issues feature, launched in April 2025.

## Key Capabilities

- **Parent-child hierarchies**: Break larger issues into manageable tasks
- **Depth**: Up to 8 levels of nesting
- **Breadth**: Up to 100 sub-issues per parent
- **Cross-repo**: Sub-issues can live in different repositories
- **Projects integration**: Progress fields, filters, grouping by parent issue
- **Two creation modes**: Create new sub-issue inline, or add existing issue as child

## API Layer

Sub-issues are exposed through GitHub's GraphQL API with dedicated fields:
- `subIssues` — list of child issues
- `parent` — parent issue reference
- `subIssuesSummary` — aggregate progress (total, completed, not_planned)

The REST API also supports sub-issue relationships through the issues endpoint with parent/child fields.

## Relevance to Harness

This is the canonical cloud storage mechanism for spec decomposition. Each hardened spec (L1) becomes a parent issue; each task from structured planning (L2) becomes a sub-issue. Progress auto-rolls up from children to parent.
