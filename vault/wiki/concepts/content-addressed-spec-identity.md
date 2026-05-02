---
type: concept
title: "Content-Addressed Spec Identity"
status: developing
created: 2026-04-30
updated: 2026-04-30
tags:
  - harness
  - spec-storage
  - content-addressing
  - fingerprinting
  - fork-safety
  - reconciliation
related:
  - "[[Research: GitHub Issues as Harness Spec Storage]]"
  - "[[fork-safe-spec-storage]]"
  - "[[spec-hardening]]"
sources:
  - "[[Research: GitHub Issues as Harness Spec Storage]]"

---# Content-Addressed Spec Identity

How ultimate-pi harnesses resolve specs by content fingerprint, not issue number. Solves the fork-merge divergence problem: fork's issue #5 and upstream's issue #5 are different specs found by different hashes.

## The Problem

GitHub Issues are identified by repo-scoped integers. When specs live in issues:

| Scenario | Fork Issue | Upstream Issue | Conflict? |
|----------|-----------|----------------|-----------|
| Normal | `forker/proj#1` = "Add OAuth" | `owner/proj#1` = "Initial setup" | No — different repos |
| After fork merge | `forker/proj#1` = "Add OAuth" transferred to upstream | `owner/proj#2` = "Fix rate limiter" | No — transfer assigns new number |
| Stale cache | Local cache still says `forker/proj#1` | Issue doesn't exist in fork anymore, wrong number in upstream | **YES** — harness looks up wrong repo/number |

Issue numbers are repo-scoped, time-ordered identifiers. They are NOT stable identities across repo boundaries.

## The Solution: Content-Hash Identity

Every HardenedSpec carries a deterministic content fingerprint that survives repo migration.

### Fingerprint Generation

```
spec_fingerprint = SHA256(
  normalize(intent_summary) +
  normalize(json.dumps(success_criteria, sort_keys=True)) +
  normalize(definition_of_done)
)
```

`normalize()` strips whitespace, lowercases, removes punctuation. This makes the fingerprint tolerant of formatting changes while sensitive to semantic changes.

### Embedding Points

| Location | Format | Purpose |
|----------|--------|---------|
| Issue body (HTML comment) | `<!-- spec-fp: a1b2c3d4e5f6... -->` | Primary: searchable across repos |
| Issue title prefix | `[spec:a1b2c3d4] Implement OAuth2 login` | Visible: human-readable first-8 prefix |
| Local cache JSON | `"spec_fingerprint": "a1b2c3d4e5f6..."` | Fast: no API call needed for lookup |
| Wiki page (ADR, spec page) | `spec_fingerprint: a1b2c3d4e5f6` | Cross-reference: wiki-to-issue linkage |

### Resolution Algorithm

When the harness needs spec `X`:

```
1. Check local cache: .pi/harness/specs/<id>.json — read spec_fingerprint
2. Check cached issue URL: if github_issue_url exists and is reachable → use it
3. If cached URL is stale (404, wrong repo, wrong content):
   a. Search by fingerprint: gh search issues "spec-fp:a1b2c3d4" --label harness-spec
   b. If found in current repo: update cache, use it
   c. If found in different repo: warn, offer to transfer
   d. If not found anywhere: spec is orphaned — recreate from local cache body
4. Always verify: read issue body, extract fingerprint, compare with expected
```

### Why This Works

- **Content-addressed, not location-addressed**: Like Git's object model. The spec's identity is its content, not where it lives.
- **Repo-agnostic**: The same spec hash resolves to the correct issue in any repo.
- **Transfer-safe**: When an issue is transferred via `gh issue transfer`, only its number changes. The body (and fingerprint within it) stays the same.
- **Deduplication**: Two issues with the same fingerprint ARE the same spec. Harness can detect and merge duplicates.
- **Searchable**: `gh search issues "spec-fp:abc123"` works across all repos the user has access to.

## The Transfer-on-Merge Pattern

When code merges from fork to upstream, specs can follow via GitHub's native issue transfer API.

### `ultimate-pi harness migrate` Command

```
ultimate-pi harness migrate [--dry-run]
  ├─ Detect repo change: current repo ≠ .pi/harness/config.json cached repo
  ├─ List fork specs: gh issue list --repo <old-repo> --label harness-spec --json number,title,body
  ├─ For each spec:
  │   ├─ Search upstream: gh search issues "spec-fp:<hash>" --repo <new-repo>
  │   ├─ If found in upstream → skip (already migrated)
  │   ├─ If not found:
  │   │   ├─ Transfer: gh issue transfer <issue> <new-repo>
  │   │   ├─ Relabel: gh issue edit <new-number> --add-label harness-spec,layer-N,status:*
  │   │   └─ Note: labels don't survive transfer — must reapply
  │   └─ Update local cache: rewrite github_issue_url → new repo
  ├─ Update config: .pi/harness/config.json → new repo
  └─ Report: N transferred, M already-present, K orphaned
```

### Transfer API Constraints

| Constraint | Impact |
|------------|--------|
| Requires write access to BOTH repos | Fork must have push access to upstream (true after PR merged) |
| Labels are NOT transferred | Harness must reapply labels post-transfer |
| Assignees, milestones ARE transferred | Good |
| Comments ARE transferred | Execution audit trail preserved |
| Sub-issues are NOT transferred | Must transfer children individually or recreate hierarchy |
| Issue number changes | Upstream assigns next available number |

### Idempotency Guarantee

`harness migrate` is idempotent because it searches by fingerprint before transferring. If a spec already exists in upstream (from a previous migration run), it's skipped. Running migrate twice produces the same result.

## Edge Cases

### Orphaned Specs (No Fingerprint Match)

If a spec exists in the fork but no matching fingerprint is found anywhere:
- **Cause**: Issue body was edited and fingerprint comment removed, or spec was deleted
- **Resolution**: Harness recreates the spec in upstream from the local cache JSON body
- **Warning**: Comment history is lost (original was in fork issue, now inaccessible)

### Duplicate Specs (Same Fingerprint, Different Issues)

If two issues in the same repo have the same fingerprint:
- **Detection**: `gh search issues "spec-fp:<hash>" --repo <repo>` returns multiple results
- **Resolution**: Harness keeps the newer one (most recently updated), closes the older as duplicate with comment "Merged into #<newer> — same spec fingerprint"
- **Rationale**: The newer issue likely has richer comment history

### Cross-Fork Specs (Multiple Forks, Same Spec)

If Forker-A and Forker-B both create "Add OAuth2" with different approaches:
- **Their fingerprints WILL differ** — the `success_criteria` and `definition_of_done` are different
- **No false collision**: fingerprint includes the full spec semantics, not just the title
- **Correct behavior**: they remain separate specs in separate forks, as they should

## Implementation Complexity

| Component | Effort | Risk |
|-----------|--------|------|
| Fingerprint generation in SpecHardener | Low — add SHA256 call before saving | None |
| Fingerprint embedding in issue body | Low — prepend HTML comment | None |
| `gh search issues` integration | Low — single CLI call | None |
| `harness migrate` command | Medium — transfer + relabel + cache update loop | Medium — transfer API edge cases |
| Cache staleness detection | Low — compare cached URL to current repo | None |
| Orphan recreation | Low — `gh issue create` from cached body | Low |
| Duplicate detection | Low — count search results | None |

Total: ~2-3 days of implementation. All operations use existing `gh` CLI commands or REST API.

## Prior Art

- **Git's content-addressed object model**: SHA1 hashes identify objects by content, not by location. This is the same principle applied to specs.
- **IPFS / libp2p**: Content-addressed distributed storage. Specs are "CID-addressable" in concept.
- **Nix / Guix**: Package builds are identified by content hashes of their inputs. Same deterministic identity pattern.
- **Docker image digests**: `image@sha256:abc...` identifies an image by its content manifest, not by its tag. Tags move; digests don't.

None of these are "harness spec storage" prior art — this is a novel application of content addressing to agent task management.
