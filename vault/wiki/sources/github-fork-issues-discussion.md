---
type: source
status: ingested
source_type: github-discussion
title: "GitHub Community: No Issues to Enable in Forked Repo"
author: guangli-dai, tarak6984, secretnamebasis
date_published: 2025-06-02
url: https://github.com/orgs/community/discussions/161368
confidence: high
key_claims:
  - "GitHub historically blocked enabling Issues on forked repositories independently"
  - "As of June 2025, users reported no Issues checkbox in fork Settings > General > Features"
  - "As of December 2025, a user confirmed Issues CAN be enabled on forks via Settings"
  - "Workaround for older/restricted forks: create new repo, use Discussions, or external trackers"
  - "Issue tracking is designed to be centralized in the original repo; forks are copies for contribution, not independent projects"
tags:
  - github
  - fork
  - issues
  - multi-tenant
related:
  - "[[Research: GitHub Issues as Harness Spec Storage]]"
created: 2026-05-02
updated: 2026-05-02

---# GitHub Community: Fork Issues Discussion

GitHub Community discussion #161368 tracking the evolution of issue support on forked repositories.

## Timeline

| Date | Event |
|------|-------|
| Jun 2, 2025 | `guangli-dai` reports: No "Issues" checkbox in fork's Settings → Features |
| Jun 3, 2025 | `tarak6984` confirms: "GitHub currently does NOT allow enabling Issues on forked repositories independently" |
| Dec 30, 2025 | `secretnamebasis` reports: "Under /settings there is a way to check the issues box on a fork" — feature added |

## Relevance to Harness

Forks of ultimate-pi projects need their own issue tracker for spec storage. This discussion confirms:
1. **Forks CAN now enable issues** (post-Dec 2025). No fundamental blocker.
2. **Upstream issues are never copied** — each fork starts with a clean slate.
3. **`gh` CLI must be reconfigured** for the fork's repo, not upstream.
4. **Local cache isolation is critical** — `.pi/harness/specs/` must be gitignored to prevent stale upstream refs from leaking into forks.
