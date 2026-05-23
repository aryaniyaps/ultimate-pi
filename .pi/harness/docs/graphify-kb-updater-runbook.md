# Graphify KB updater runbook

## Purpose and scope

`graphify-kb-updater` keeps the local Graphify source corpus current for agentic engineering, context engineering, harness engineering, AI coding harnesses, research papers/feeds, articles/blogs, local books/transcripts, YouTube candidates, and competitor intelligence.

The approved operating model is **hybrid allowlist auto-promotion with conservative staging**:

- Daily local automation may auto-promote only explicitly approved allowlisted public sources (`article`, `repo`, or `release`) with complete provenance and rights/access metadata.
- Repository and release candidates are metadata-specific source classes; they do not inherit generic article behavior and must be authorized by `allowed_source_classes` on the allowlist entry.
- Books, transcripts, YouTube/video material, paid/copyrighted/mirrored material, unclear-license content, and unknown open-web sources remain staged until manually approved.
- Competitor monitoring is a curated taxonomy/watchlist/reporting signal, not an exhaustive crawler.
- Pi-agent-open integration is intentionally limited/deferred: opening Pi should do at most a low-latency, no-network stale check. It must not perform synchronous web discovery, promotion, or Graphify mutation.

## Governance and approval boundaries

Required rights/access fields for every promotion:

- `license`
- `access`
- `approved_by`
- `approved_at`

Allowlist auto-promotion requires all of the following:

1. `.pi/harness/corpus/graphify-kb-updater.config.json` has `auto_promote_allowlist: true`.
2. The candidate domain is present in `allowlist` with `approved: true`.
3. If the allowlist entry has `allowed_source_classes`, it includes the candidate `kind` (`article`, `repo`, or `release`).
4. The candidate itself has `approved: true`.
5. `provenance.origin` and `provenance.locator` are complete.
6. `rights_access` is complete.
7. The candidate is not a risky source class that requires manual review.

Risky source classes (`book`, `transcript`, `youtube`) always require explicit approval and complete rights/access metadata. Raw HTTP shell paths are forbidden; keep discovery/fetch through approved harness web/API abstractions and verify with `.pi/scripts/harness-web-policy-guard.mjs`.

## Manual commands

Dry-run, no mutation of `raw/`, state, or `graphify-out/`:

```bash
node .pi/scripts/graphify-kb-updater.mjs --dry-run --pilot-report
```

Apply approved/promotable candidates and refresh Graphify only when promoted files changed:

```bash
node .pi/scripts/graphify-kb-updater.mjs --apply --refresh-graph --pilot-report
```

Apply without graph mutation:

```bash
node .pi/scripts/graphify-kb-updater.mjs --apply --skip-graph --pilot-report
```

Validate scheduler templates:

```bash
node .pi/scripts/graphify-kb-updater.mjs --scheduler-smoke
```

Run web-policy guard:

```bash
node .pi/scripts/harness-web-policy-guard.mjs
```

## Approval workflow

1. Review dry-run JSON: candidate count, source counts, competitor labels, duplicate/skipped/blocked counts, stale warnings, planned promotions, and graph action.
2. For a candidate, add it to `.pi/harness/corpus/graphify-kb-updater.config.json` `review_queue` with:
   - `kind` (`article`, `repo`, `release`, `paper`, `book`, `transcript`, or `youtube`)
   - `title`
   - `url` or `path`
   - `approved: true`
   - `rights_access` object with all required fields
   - optional `competitor_labels` or provenance notes.
   - for repo/release auto-promotion, an allowlist entry whose `allowed_source_classes` includes `repo` or `release`.
3. For local files, you may place `<file>.rights.json` beside the source, but risky classes still require explicit approval before promotion.
4. Run `--apply --refresh-graph`.
5. Promoted sources land under `raw/graphify-kb-updates/<kind>/` with `.provenance.json` sidecars.

## Daily scheduler setup

Systemd user timer is the primary path and runs daily at 08:30 with randomized delay:

```bash
mkdir -p ~/.config/ultimate-pi ~/.config/systemd/user ~/.local/state/ultimate-pi
cp .pi/harness/corpus/systemd/graphify-kb-updater.env.template ~/.config/ultimate-pi/graphify-kb-updater.env
# edit UP_ROOT in the env file
cp .pi/harness/corpus/systemd/graphify-kb-updater.service ~/.config/systemd/user/
cp .pi/harness/corpus/systemd/graphify-kb-updater.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now graphify-kb-updater.timer
systemctl --user list-timers graphify-kb-updater.timer
```

The service uses `flock`, `timeout 45m`, explicit env, append-only logs, and a non-overlap lock.

Cron fallback is daily at 08:30; edit `UP_ROOT` and copy the line from `.pi/harness/corpus/cron.example` with `crontab -e`.

## Reports, logs, and fields

Apply runs write:

- Registry: `.pi/harness/corpus/graphify-kb-updater-state/registry.json`
- Per-run logs: `.pi/harness/corpus/graphify-kb-updater-state/logs/`
- Scheduler logs: `~/.local/state/ultimate-pi/graphify-kb-updater.log` and `.err`

Each run reports:

- `last_run_at`
- `candidate_count`, `promoted_count`, `blocked_count`, `skipped_count`, `duplicate_skips`, `failure_count`
- `counts.by_kind`, `counts.by_source_type`, `counts.by_competitor_label`, `counts.allowlisted`
- `staged_count`, `review_queue_count`, and `review_queue` items with reason codes and next actions
- `stale_warnings`
- `changed_existing_count` for same URL/path content changes
- `graph.action`, `graph.exit_status`, and Graphify report path when refreshed
- optional pilot metrics: `frontier_recall_proxy`, `promoted_precision_proxy`, `duplicate_noise_rate`, `graphify_success`

Review these fields before enabling unattended mode and after every config change.

## Troubleshooting

- `missing_complete_provenance`: add `provenance.origin` and `provenance.locator`.
- `missing_rights_access_approval`: add complete rights/access metadata.
- `manual_approval_required`: set `approved: true` after source and rights review.
- `duplicate_unchanged`: candidate was already promoted and content hash is unchanged.
- `changed_existing_count > 0`: a stable URL/path changed content; review before relying on previous conclusions.
- Graphify skipped: no promoted changes, `--skip-graph`, or no `--refresh-graph`.
- Graphify failed: inspect `graph.stderr`, run `graphify update .` manually, and keep the scheduler disabled until fixed.
- Scheduler did not run: check `systemctl --user status graphify-kb-updater.timer`, the env file path, and scheduler logs.
- Overlap: lock path `%t/graphify-kb-updater.lock` or `/tmp/graphify-kb-updater.lock` prevents concurrent runs.

## Disable

```bash
systemctl --user disable --now graphify-kb-updater.timer
systemctl --user reset-failed graphify-kb-updater.service
```

Remove any cron line copied from `.pi/harness/corpus/cron.example`.

## Rollback

1. Disable systemd timer and remove cron line.
2. Use registry/log promoted paths to remove or quarantine promoted files under `raw/graphify-kb-updates/`.
3. Restore `.pi/harness/corpus/graphify-kb-updater-state/registry.json` from backup, or mark candidates rejected/quarantined.
4. Revert implementation files if needed:

```bash
git checkout -- .pi/scripts/graphify-kb-updater.mjs .pi/harness/corpus/graphify-kb-updater.config.json .pi/harness/corpus/systemd/graphify-kb-updater.timer .pi/harness/corpus/cron.example test/graphify-kb-updater.test.mjs .pi/harness/docs/graphify-kb-updater-runbook.md
```

5. Regenerate Graphify from valid sources:

```bash
graphify update .
```

## Pilot gate before unattended mode

Run at least one dry-run and one supervised apply. Record frontier recall proxy, promoted precision proxy, duplicate/noise rate, skipped reasons, stale warnings, and Graphify success from `--pilot-report`. Enable the timer only if promoted precision is acceptable and graph refresh succeeds.
