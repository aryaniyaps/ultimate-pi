---
type: synthesis
title: "Research: GitHub Issues as Harness Spec Storage"
created: 2026-04-30
updated: 2026-04-30
tags:
  - research
  - harness
  - github-issues
  - spec-storage
  - cli
  - persistence
status: developing
related:
  - "[[harness-implementation-plan]]"
  - "[[spec-hardening]]"
  - "[[structured-planning]]"
sources:
  - "[[github-sub-issues-docs]]"
  - "[[github-issue-dependencies-docs]]"
  - "[[gh-sub-issue-extension]]"
  - "[[gh-cli-sub-issue-rfc]]"
  - "[[github-fork-issues-discussion]]"
---

# Research: GitHub Issues as Harness Spec Storage

## Overview

GitHub Issues can serve as cloud-persistent, cross-session spec storage for the agentic harness. GitHub's native sub-issues (parent-child hierarchies, April 2025) and issue dependencies (blocked-by/blocking) map directly to the harness's spec decomposition and task dependency graphs. The `gh` CLI lacks native sub-issue support but a community extension (`gh-sub-issue`) fills the gap. A dual-tier architecture — local JSON cache + GitHub Issue ledger — gives speed and cloud persistence without over-reliance on network.

## Key Findings

- **GitHub has native sub-issues since April 2025**: Up to 8 levels deep, 100 sub-issues per parent, cross-repo support (Source: [[github-sub-issues-docs]])
- **Issue dependencies are a separate feature**: Blocked-by / blocking relationships define execution order, distinct from sub-issues which define decomposition (Source: [[github-issue-dependencies-docs]])
- **`gh` CLI has NO native sub-issue support**: cli/cli#10298 open since Jan 2025, PR #13057 in progress. Currently requires REST API or community extension (Source: [[gh-cli-sub-issue-rfc]])
- **Community extension `gh-sub-issue`** (yahsan2): 110 stars, MIT, provides `add`/`create`/`list`/`remove` commands for parent-child relationships via `gh` CLI (Source: [[gh-sub-issue-extension]])
- **Each hardened spec maps 1:1 to a GitHub Issue** with template body, labels for machine-readable state, and sub-issues for decomposed tasks
- **Dual-tier architecture recommended**: Local `.pi/harness/specs/<id>.json` for speed, GitHub Issue for cross-session ledger
- **Fork isolation is handled automatically**: Forks get their own issue tracker (enabled Dec 2025). Spec cache is gitignored — no stale upstream references leak into forks. `ultimate-pi harness init` bootstraps a fork's issue tracker with labels + templates

## Key Entities

- [[github-sub-issues-docs|GitHub Sub-Issues Feature]]: Native parent-child issue hierarchies in GitHub Issues
- [[gh-sub-issue-extension|gh-sub-issue Extension]]: Community `gh` CLI extension (110 stars, MIT) bridging the CLI gap
- [[gh-cli-sub-issue-rfc|gh CLI Sub-Issue RFC]]: cli/cli#10298 — official feature request for `--parent` on `gh issue create`

## Key Concepts

- **Sub-Issue vs Dependency**: Sub-issues = decomposition ("A contains B"). Dependencies = execution order ("A blocks B"). Both are native GitHub features with separate APIs.
- **Dual-Tier Architecture**: Local cache (fast, offline-capable) + remote ledger (persistent, queryable). Local JSON is always the primary execution path. GitHub Issues are created at major state transitions only.
- **Issue-as-Spec Template**: A HardenedSpec maps to an issue body with structured sections (intent_summary, success_criteria, anti_criteria, definition_of_done). Labels encode machine-readable state (`harness-spec`, `layer-{n}`, `status:{status}`).
- **Execution Ledger**: Issue comments serve as an immutable audit trail. Each harness phase appends a status update comment.
- **Phase-to-Issue Mapping**: Not every micro-step creates an issue. Only major state transitions: spec creation (P1), plan creation (P2), phase completion checkpoints (P8).

## Contradictions

None identified. All sources agree on the sub-issue feature's existence and CLI gap.

## Fork / Multi-Tenant Considerations

When someone forks a project using ultimate-pi, spec storage must not leak upstream state into the fork.

### The Fork Problem

1. **Issue tracker isolation**: GitHub historically blocked issues on forks. As of December 2025, forks CAN enable issues (Settings → General → Features → check "Issues"). But they start EMPTY — upstream issues are never copied to forks (Source: [[github-fork-issues-discussion]]).
2. **Local cache leakage**: `.pi/harness/specs/<id>.json` files committed to the repo WOULD be forked, carrying stale upstream issue URLs. This is the primary contamination vector.
3. **`gh` CLI context**: `gh` is authenticated to a specific repo. A fork must re-authenticate (`gh auth login`) and set its own default repo.

### Solution: Local-First, Gitignored Cache, Init Bootstrap

| Concern | Solution |
|---------|----------|
| Stale cache in forks | `.pi/harness/specs/` is in `.gitignore`. Cache is runtime-only, never committed. |
| Empty issue tracker on fork | `ultimate-pi harness init` detects fork, prompts to enable issues (or auto-enables via API), creates harness label set |
| Wrong `gh` repo context | `harness init` runs `gh repo set-default` for the fork. Config stored in `.pi/harness/config.json` (repo-relative, not global) |
| Upstream spec references | Local cache stores `github_issue_url` as optional field. If absent or pointing to wrong repo, harness creates new issues in current repo |
| No `gh` auth on fork | `harness init` checks `gh auth status`, guides user through `gh auth login` if needed |

### Init Flow for Forked Projects

```
ultimate-pi harness init
  ├─ Detect: is this a fork? (gh repo view --json isFork)
  ├─ Check: are issues enabled? If not → guide to enable or auto-enable via API
  ├─ Auth: gh auth status → prompt login if missing
  ├─ Labels: gh label create harness-spec, harness-task, layer-1..layer-8, status:*
  ├─ Templates: create .github/ISSUE_TEMPLATE/harness-spec.yml
  ├─ Gitignore: ensure .pi/harness/specs/ is in .gitignore
  └─ Ready: harness can now create spec issues in fork's own tracker
```

### Why This Works

- **No shared state between upstream and fork**: Each has its own isolated issue tracker
- **Gitignored cache prevents stale refs**: Fork never sees upstream's runtime spec files
- **Init is idempotent**: Running `harness init` on an already-initialized fork is a no-op
- **Labels are the only shared artifact**: Label names are convention, not data. Forks recreate them locally

## Creative Solution: Content-Addressed Spec Identity

The fork-merge divergence problem (fork #5 ≠ upstream #5) is solved via **content-addressed spec identity** combined with **GitHub's native issue transfer API**. See [[content-addressed-spec-identity]] for full specification.

### How It Works

1. **Every HardenedSpec gets a content fingerprint**: `SHA256(intent_summary + success_criteria + definition_of_done)`. Embedded in issue body as `<!-- spec-fp: <hash> -->`, in title as `[spec:<first8>]`, and in local cache.

2. **Resolution by hash, not number**: When harness needs a spec, it searches `gh search issues "spec-fp:<hash>"` across all repos. Issue number is irrelevant — found by content identity, not location.

3. **Transfer on merge**: `ultimate-pi harness migrate` uses `gh issue transfer` (native GitHub API) to move specs from fork to upstream. Idempotent — searches by fingerprint before transferring.

4. **Transfer-safe**: When an issue transfers between repos, only its number changes. The body (and fingerprint within it) stays the same. Labels must be reapplied (GitHub limitation).

### Why Content Addressing

- **Repo-agnostic**: Same hash resolves to correct issue in any repo
- **Deduplication**: Two issues with same fingerprint ARE the same spec — merge them
- **No stale references**: Harness searches by hash, not by cached URL
- **Inspired by Git's object model**: Content identity > location identity

### Migration Flow

```
ultimate-pi harness migrate
  ├─ Detect repo change (fork → upstream)
  ├─ List fork specs by label
  ├─ For each: search upstream by fingerprint
  ├─ If not found → gh issue transfer + relabel
  ├─ Update local cache URLs
  └─ Idempotent — safe to re-run
```

Implementation effort: ~2-3 days. All operations use existing `gh` CLI.

## Open Questions

- When will `gh` CLI gain native `--parent` flag? PR #13057 in progress but no merge timeline.
- What rate limiting impact will harness-driven issue creation have? 5,000 req/hr for authenticated users. At 1 issue per subtask, a 5-subtask plan creates ~5-15 issues — well within limits.
- Should issue creation be synchronous during harness execution, or batched after pipeline completion?
- Can GitHub Projects v2 auto-track sub-issue progress for harness observability (L5)?
- Should `harness init` auto-enable issues on fork via API, or require manual user action? (API approach is faster but may surprise users)
- ~~What happens if a fork is later merged upstream?~~ **SOLVED**: Content-addressed spec identity + `gh issue transfer` migration. See [[content-addressed-spec-identity]].

## Integration Points

### L1 Spec Hardening → GitHub Issues

| Step | Action | CLI Command |
|------|--------|-------------|
| 1 | Harden spec | `SpecHardener.harden()` → HardenedSpec |
| 2 | Create spec issue | `gh issue create --title "Spec: {intent_summary}" --body "..." --label harness-spec,layer-1` |
| 3 | Store local cache | `.pi/harness/specs/{issue_number}.json` with `github_issue_url` field |
| 4 | Emit spec_hardened | → L2 |

### L2 Structured Planning → GitHub Sub-Issues

| Action | CLI Command |
|--------|-------------|
| Create task sub-issues | `gh sub-issue create --parent {spec_issue} --title "{task_name}" --label harness-task` |
| Link dependencies | `gh issue edit {task_A} --add-label "blocked-by:{task_B}"` (or use API for native deps) |
| Add sprint contract | `gh issue comment {task_issue} --body "## Sprint Contract\n..."` |

### GitHub Projects v2 (Optional Visualization)

- Add spec issue to a "Harness" project board
- Sub-issues auto-appear in board with parent/child progress fields
- Filter by `label:harness-spec`, group by `status`
- Roadmap view for phase timelines

## Toolchain

| Tool | Purpose | Command |
|------|---------|---------|
| `gh issue create` | Create spec/task issues | `gh issue create --title "..." --body "..." --label ...` |
| `gh issue edit` | Update issue state/labels | `gh issue edit {id} --add-label "..." --remove-label "..."` |
| `gh issue comment` | Append execution log entry | `gh issue comment {id} --body "..."` |
| `gh issue list` | Query issue state | `gh issue list --label harness-spec --json number,title,state,labels` |
| `gh issue view` | Read issue body as JSON | `gh issue view {id} --json body,title,labels,state` |
| `gh sub-issue create` | Create child task | `gh sub-issue create --parent {id} --title "..."` |
| `gh sub-issue list` | List child tasks | `gh sub-issue list {id} --json number,title,state` |
| `gh api` | Raw API for dependencies | `gh api /repos/{owner}/{repo}/issues/{id}` |

## Sources

- [[github-sub-issues-docs]]: GitHub official docs on sub-issues (April 2025)
- [[github-issue-dependencies-docs]]: GitHub official docs on issue dependencies
- [[gh-sub-issue-extension]]: yahsan2/gh-sub-issue, MIT license, v0.5.1 (Oct 2025)
- [[gh-cli-sub-issue-rfc]]: cli/cli#10298, feature request (Jan 2025)
- [[github-fork-issues-discussion]]: GitHub Community discussion #161368 — fork issues enablement (Jun-Dec 2025)
