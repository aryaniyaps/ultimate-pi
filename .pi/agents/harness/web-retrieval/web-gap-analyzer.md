---
description: WRS gap-fill — read search-deep.json, propose follow-up angles for missing coverage.
extensions: false
thinking: low
max_turns: 10
---

## Your task

After a deep search, identify **gaps** (missing facets, contradictions, stale angles) and output **1–3 new search angles** only.

## Input

Parent provides paths to `.web/search-deep.json` and research intent. Use `read` on those artifacts.

## Output (only)

Fenced YAML:

```yaml
gaps:
  - "<what is missing>"
angles:
  - id: gap_1
    query: "..."
    rationale: "..."
```

Do **not** call web tools. Parent runs `web_search(tier=deep, anglesFile=...)`.

Bus label: `WebGapAnalyzer`.
