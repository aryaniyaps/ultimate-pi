---
name: posthog-analyst
description: >
  Analyze pi agentic conversations, errors, and misalignments using PostHog MCP.
  Queries $ai_generation, $ai_span, $ai_trace events, segments by model, detects
  failure patterns, cross-references the wiki's model-adaptive harness research, and
  generates model-specific recommendations filed to the wiki. Use this skill when the
  user wants to analyze agent performance, understand where the harness breaks per
  model, audit LLM errors or tool failures, improve model profiles based on real data,
  or run a postmortem on agentic sessions. Trigger on: "posthog analyze",
  "/posthog-analyze", "analyze agent sessions", "audit llm errors", "postmortem",
  "what's failing per model", "harness performance analysis", "find misalignments",
  "model error patterns", "agent conversation audit".
allowed-tools: Read Write Bash Glob Grep
compatibility:
  requires: [PostHog MCP bridge enabled in pi, POSTHOG_PERSONAL_API_KEY set]
---

# posthog-analyst: Agentic Conversation Analysis via PostHog MCP

You analyze real agentic conversations captured in PostHog to find where the harness breaks — per model. You do NOT auto-fix. You generate specific, actionable recommendations and file them to the wiki as structured analysis pages. The wiki's model-adaptive harness research is your reference for what failure modes to look for and what fixes exist.

## Core Loop

```
1. VERIFY MCP   → /posthog-mcp-status
2. QUERY EVENTS → execute-sql against $ai_generation, $ai_span, $ai_trace
3. SEGMENT      → Group by $ai_model, $ai_agent_name, $ai_stop_reason
4. DETECT       → Match patterns against known model failure modes (from wiki)
5. CROSS-REF    → Read wiki model-adaptive-harness pages for fix catalog
6. RECOMMEND    → Generate per-model recommendations
7. FILE         → Write findings to vault/wiki/analyses/posthog-YYYY-MM-DD.md
```

Every analysis gets a wiki page. Knowledge compounds.

## Step 1: Verify PostHog MCP

Run `/posthog-mcp-status` to confirm the bridge is connected. If it fails, tell the user:

> PostHog MCP not connected. Set `POSTHOG_PERSONAL_API_KEY` and restart pi, or run `/posthog-mcp-reload`.

If the user hasn't set up PostHog tracing (no `$ai_*` events being captured), tell them:

> No LLM analytics being captured. Set `POSTHOG_API_KEY` to your project key and restart pi. Events will start flowing immediately.

## Step 2: Query Events

Use the PostHog MCP `execute-sql` tool (or equivalent query tool registered by the bridge). Query the following event types, filtered to this project:

### Core Queries

**A) Error rate by model — `$ai_generation` events:**
```sql
SELECT
  properties.$ai_model as model,
  countIf(properties.$ai_is_error = true) as errors,
  count() as total,
  round(errors / total * 100, 1) as error_pct,
  avg(properties.$ai_latency) as avg_latency_sec,
  avg(properties.$ai_total_tokens) as avg_tokens
FROM events
WHERE event = '$ai_generation'
  AND properties.$ai_project_name = 'ultimate-pi'
  AND timestamp >= now() - INTERVAL {days} DAY
GROUP BY model
ORDER BY total DESC
```

**B) Tool failure rate by model — `$ai_span` events:**
```sql
SELECT
  properties.$ai_model as model,
  properties.$ai_span_name as tool,
  countIf(properties.$ai_is_error = true) as errors,
  count() as total,
  round(errors / total * 100, 1) as error_pct,
  avg(properties.$ai_latency) as avg_latency_sec
FROM events
WHERE event = '$ai_span'
  AND properties.$ai_project_name = 'ultimate-pi'
  AND timestamp >= now() - INTERVAL {days} DAY
GROUP BY model, tool
HAVING errors > 0
ORDER BY error_pct DESC
```

**C) Stop reason distribution by model — `$ai_generation` events:**
```sql
SELECT
  properties.$ai_model as model,
  properties.$ai_stop_reason as stop_reason,
  count() as count,
  round(count() * 100.0 / sum(count()) OVER (PARTITION BY properties.$ai_model), 1) as pct
FROM events
WHERE event = '$ai_generation'
  AND properties.$ai_project_name = 'ultimate-pi'
  AND timestamp >= now() - INTERVAL {days} DAY
GROUP BY model, stop_reason
ORDER BY model, count DESC
```

**D) Token/cost efficiency by model — `$ai_trace` events:**
```sql
SELECT
  properties.$ai_model as model,
  count() as sessions,
  avg(properties.$ai_total_input_tokens) as avg_input_tokens,
  avg(properties.$ai_total_output_tokens) as avg_output_tokens,
  avg(properties.$ai_latency) as avg_session_sec,
  countIf(properties.$ai_is_error = true) as errored_sessions
FROM events
WHERE event = '$ai_trace'
  AND properties.$ai_project_name = 'ultimate-pi'
  AND timestamp >= now() - INTERVAL {days} DAY
GROUP BY model
ORDER BY sessions DESC
```

**E) High-error traces — raw error messages by model:**
```sql
SELECT
  properties.$ai_model as model,
  properties.$ai_error as error_message,
  properties.$ai_user_prompt as user_prompt,
  count() as occurrences,
  min(timestamp) as first_seen,
  max(timestamp) as last_seen
FROM events
WHERE event IN ('$ai_generation', '$ai_trace')
  AND properties.$ai_project_name = 'ultimate-pi'
  AND properties.$ai_is_error = true
  AND timestamp >= now() - INTERVAL {days} DAY
GROUP BY model, error_message, user_prompt
ORDER BY occurrences DESC
LIMIT 50
```

### Date Range

If the user specifies a date range, use it. Otherwise default to the last 7 days. If they say "all time" or "everything", use 30 days.

If queries return empty: the project may not have tracing active yet. Tell the user and stop.

## Step 3: Segment and Detect Patterns

Group data by model. For each model present, run through this checklist:

### Pattern 1: Premature Completion (GPT Warning)
**Signals**: High `stop_reason=stop` rate without tool calls, low tokens/turn, sessions end after 1-2 turns
**Wiki reference**: [[harness-configuration-layers]] — L2 Gate Design (GPT needs hard-gate, L4 Completion Model)
**What it looks like in data**: Model says "I'm done" after plausible-but-incomplete answer. Stops before verification gate.

### Pattern 2: Tool Loop (any model)
**Signals**: Same tool called 3+ times in one trace, tool returns errors but agent retries same approach
**Wiki reference**: [[execution-feedback-loop]] — agent doesn't change strategy on failure
**What it looks like in data**: Consecutive `$ai_span` events with same tool name, same or similar input, `$ai_is_error=true` on multiple consecutive spans.

### Pattern 3: High Token Waste (any model)
**Signals**: Sessions with >2x median tokens, high cache-miss rates, large output tokens relative to task complexity
**Wiki reference**: [[ast-truncation]], [[progressive-disclosure-agents]]
**What it looks like in data**: `$ai_total_tokens` outliers, `cache_read_input_tokens` near zero despite repeated reads.

### Pattern 4: Model-Specific Misalignment
**Signals by model** (cross-reference wiki [[harness-configuration-layers]] for dimensions):

| Model | Failure Mode | Data Signal | L1-L4 Layer |
|-------|--------------|-------------|-------------|
| GPT variants | Stops early (premature completion) | Stop reason `stop` without verification gate passing | L2 Gate, L4 Completion |
| GPT variants | Anchors on first-seen content, ignores updates | Low tool retry rate despite errors — agent doubles down | L1 Signal (constraints-first needed) |
| GPT variants | Confused by nested structures | High error rate on multi-step tasks, tool chains break | L1 Signal (flat structure needed) |
| Claude/Opus | Overconfident self-assessment | Stop reason `stop`, no errors, but output misses spec requirements | L2 Gate (needs checklist, not self-assessment) |
| Claude/Opus | Ignores explicit markers if too verbose | Long output, many tokens, but key constraints missed | L1 Signal (too much narrative drowns signals) |
| Haiku (subagents) | Hallucinates in summaries | `$ai_agent_name` contains `/explore` or `/haiku`, error rate on read | L2 Gate (hard evidence gate needed) |

### Pattern 5: Drift from Spec
**Signals**: Error messages contain "mismatch", "not found", "unexpected", "did not match". Sessions where later turns undo earlier edits.
**Wiki reference**: [[verification-drift-detection]], [[grounding-checkpoints]]
**What it looks like in data**: Sequential edit tool calls that revert each other, errors on verification steps.

## Step 4: Cross-Reference Wiki Fix Catalog

For each detected pattern, read the relevant wiki page to find the fix catalog:

| Pattern | Wiki Page | Fix Type |
|---------|-----------|----------|
| Premature completion | [[harness-configuration-layers]] L2, L4 | Add hard gate, falsifiable checklist, enforced self-audit |
| Tool loops | [[execution-feedback-loop]] | Diff-aware testing, structured error output, max retry gates |
| Token waste | [[ast-truncation]], [[progressive-disclosure-agents]] | AST truncation, L0-L3 progressive disclosure, cache hints |
| Model-specific misalignment | [[model-adaptive-harness]], [[harness-configuration-layers]] | Adjust per-model dimension values in model-profiles |
| Drift from spec | [[verification-drift-detection]], [[grounding-checkpoints]] | Smallest-verifiable-change, re-grounding triggers |
| Haiku hallucination | [[model-routing-agents]] | Confidence scoring, critical reads stay on frontier |
| Repeated edit failures | [[fuzzy-edit-matching]], [[inline-post-edit-validation]] | Fuzzy matching, syntax validation before surfacing error |

Read these pages to extract the concrete fix options. Recommendations must reference specific wiki pages with wikilinks.

## Step 5: Generate Recommendations

For each model with detected issues, produce recommendations in this format:

```markdown
### Model: `$ai_model_value`

**Sessions analyzed**: N | **Error rate**: X% | **Avg tokens/session**: Y

#### Issue 1: [Pattern name]
- **Evidence**: [specific data — error counts, examples, rates]
- **Root cause**: [why this model fails this way, with wiki reference]
- **Recommendation**: [concrete action]
  - **Layer affected**: L1/L2/L3/L4 (from harness configuration layers)
  - **What to change**: [specific file, dimension, value]
  - **Expected impact**: [what should improve]

#### Issue 2: ...
```

Recommendations are concrete and actionable. They reference specific files to change (e.g., `.pi/skills/autoresearch/references/model-profiles.md`, specific SKILL.md sections, harness config). They specify which harness layer and which dimension.

**Do NOT auto-apply fixes.** Only recommend. The user decides what to change.

## Step 6: File to Wiki

Write the full analysis to `vault/wiki/analyses/posthog-YYYY-MM-DD.md`:

```yaml
---
type: analysis
title: "PostHog Agent Analysis — YYYY-MM-DD"
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [posthog, agent-analysis, model-performance, harness]
sources:
  - "PostHog MCP — $ai_generation, $ai_span, $ai_trace events"
related:
  - "[[model-adaptive-harness]]"
  - "[[harness-configuration-layers]]"
status: complete
---

# PostHog Agent Analysis — YYYY-MM-DD

## Summary
[2-3 sentence executive summary. Models analyzed, top finding, most critical recommendation.]

## Data Scope
- Date range: [start] to [end]
- Events analyzed: N generations, M spans, T traces
- Models found: [list]
- Project filter: ultimate-pi

## Model Breakdown

### Model: [name]
[Recommendations per the template above]

## Cross-Model Patterns
[Patterns that appear across multiple models — systemic harness issues, not model-specific]

## Recommendations Summary
| Priority | Model | Issue | Recommendation | Layer |
|----------|-------|-------|----------------|-------|
| Critical | ... | ... | ... | ... |
| High | ... | ... | ... | ... |
| Medium | ... | ... | ... | ... |

## Next Steps
[What to do with these findings. Suggest ADR if recommendations are significant.]
```

After filing, update `vault/wiki/index.md` (add to analyses if category exists, or note inline), update `vault/wiki/log.md` (append entry at TOP), and update `vault/wiki/hot.md` (add key findings to Recent Context).

## Quick Mode

If the user says "quick posthog analysis" or "just error rates per model", run only queries A and B, produce a summary table, and skip detailed recommendations. Offer to go deep if they want more.

```markdown
## Quick Summary

| Model | Generations | Errors | Error % | Avg Tokens | Avg Latency |
|-------|-------------|--------|---------|------------|-------------|
| claude-sonnet-4-20250514 | 142 | 3 | 2.1% | 8,200 | 4.2s |
| gpt-4o | 28 | 5 | 17.9% | 12,400 | 6.8s |

**Top failing tools**: edit (4 errors), bash (3 errors), read (1 error)

Want a deep analysis with wiki cross-reference and per-model recommendations?
```

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|-------------|-----|
| `/posthog-mcp-status` fails | MCP bridge not configured | `export POSTHOG_PERSONAL_API_KEY=phx_...` then restart pi |
| Queries return empty | No tracing data captured | Set `POSTHOG_API_KEY` and generate some agent sessions |
| `execute-sql` tool not found | MCP tool list not loaded | Run `/posthog-mcp-reload` |
| Query syntax errors | PostHog uses ClickHouse SQL | Wrap column names in double quotes if they contain special chars |
| Only one model in results | Only one model used in the date range | Extend date range or note that comparison isn't possible |

## Token Discipline

- Step 1 (mcp-status): ~200 tokens
- Step 2 (queries): response depends on result size. Use spill-to-file (enabled by default at 12K chars).
- Step 3-4 (wiki cross-ref): Read only relevant wiki pages. ~300 tokens each.
- Step 5-6 (recommend + file): ~2,000 tokens for analysis page

Total: ~3,000-5,000 tokens for a typical analysis. If query results are large, PostHog MCP spills them to `/tmp/posthog-mcp/` automatically.
