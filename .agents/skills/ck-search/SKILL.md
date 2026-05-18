---
name: ck-search
description: "DEPRECATED — ck-search was removed from ultimate-pi. Use cocoindex-search or /skill:ccc instead. Triggers retained for backward compatibility: ck, ck-search, semantic search."
---

# ck-search (deprecated)

**`ck` / `@beaconbay/ck-search` is no longer used in this harness.**

Use instead:

- **`/skill:cocoindex-search`** or **`/skill:ccc`** — CocoIndex Code (`ccc search`)
- **graphify** — architecture, callers, communities (`graphify query`, `explain`, `path`)

## Migration

```bash
uv tool install 'cocoindex-code[full]'
bash "$UP_PKG/.pi/scripts/harness-cocoindex-bootstrap.sh"
ccc search --limit 10 "your query"
```

Remove legacy index: `rm -rf .ck` (optional).
