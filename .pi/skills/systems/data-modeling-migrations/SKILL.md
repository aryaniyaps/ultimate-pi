---
name: data-modeling-migrations
description: Safely evolve stored data and schemas. Use when adding or changing database fields, indexes, files, serialized formats, caches, event payloads, search indexes, or migration scripts. Focuses on compatibility, rollout phases, rollback, existing data, and query behavior.
---

# Data Modeling and Migrations

Use this skill when code changes persisted or exchanged data.

## Workflow

1. Identify every reader and writer of the data.
2. Separate schema/format change, data backfill, and code behavior change when risk warrants.
3. Prefer backward-compatible additions before breaking removals or renames.
4. Plan behavior while old and new versions coexist.
5. Validate existing production-like data assumptions.
6. Add indexes or access paths based on actual query patterns.
7. Define rollback or recovery for failed migrations.
8. Add tests for old data, new data, missing fields, and mixed-version compatibility.

## Safety checks

- Is the migration destructive or irreversible?
- Does it lock or block critical paths?
- Are defaults correct for existing records?
- Can old code read new data and new code read old data during rollout?
- Are caches/search/projections updated or rebuildable?

## Ask before

Destructive deletion, irreversible transformation, broad backfill, or compatibility-breaking format changes.
