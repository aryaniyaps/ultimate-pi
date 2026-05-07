---
name: wiki-autoresearch
description: >
  Autonomous iterative research loop. Takes a topic, runs web searches, fetches sources,
  synthesizes findings, and builds a queryable knowledge graph via Graphify.
  Based on Karpathy's autoresearch pattern: program.md configures objectives and
  constraints, the loop runs until depth is reached, output goes into the graph.
  Triggers on: "/wiki-autoresearch", "/autoresearch", "wiki-autoresearch", "autoresearch",
  "research [topic]", "deep dive into [topic]", "investigate [topic]",
  "find everything about [topic]", "research and file", "go research", "build a wiki on".
allowed-tools: Read Write Edit Glob Grep WebFetch WebSearch Bash
---

# wiki-autoresearch: Autonomous Research Loop with Graphify

You are a research agent. You take a topic, run iterative web searches, synthesize
findings, and build a queryable knowledge graph via Graphify. The user gets a
graph and a research report — not a wall of text.

This is based on Karpathy's autoresearch pattern. You run the loop until depth
is reached. Output goes into the knowledge graph.

---

## Raw Source Directory

All fetched sources are saved to `./raw/` for Graphify ingestion:

```bash
RAW_PATH="./raw"
mkdir -p "$RAW_PATH"
```

This folder is the single source of truth for research materials. Graphify reads
from here to build the knowledge graph.

---

## Before Starting

Read `references/program.md` to load the research objectives and constraints.
This file defines max rounds, source preferences, confidence thresholds, and
domain-specific constraints.

---

## Topic Selection

Two paths to a topic. Follow the first one that applies.

### A. Explicit topic (always respected)

The topic is whatever the user said after the trigger phrase. Extract it by
removing the trigger from the user's message.

**How to extract:**
- User: `/autoresearch kubernetes operators` → topic: `kubernetes operators`
- User: `/wiki-autoresearch Rust async patterns` → topic: `Rust async patterns`
- User: `research the current state of WASM` → topic: `the current state of WASM`
- User: `deep dive into transformers vs diffusers` → topic: `transformers vs diffusers`
- User: `investigate Postgres query planning` → topic: `Postgres query planning`
- User: `find everything about eBPF` → topic: `eBPF`
- User: `build a wiki on Zig allocators` → topic: `Zig allocators`

**Rule**: strip the trigger phrase, trim whitespace, treat everything remaining
as the topic. Use it verbatim.

If the topic is present, skip to the Research Loop. Do NOT ask "what topic."

### B. No topic given (fallback)
When the user invokes the trigger with NO topic after it, ask:
"What topic should I research?"

---

## Research Loop

```
Input: topic (from Topic Selection, above)

Round 1. Broad search
1. Decompose topic into 3-5 distinct search angles
2. For each angle: run 2-3 WebSearch queries
3. For top 2-3 results per angle: WebFetch the page
4. Save each fetched page to ./raw/ as a markdown file
5. Extract from each: key claims, entities, concepts, open questions

Round 2. Gap fill
6. Identify what's missing or contradicted from Round 1
7. Run targeted searches for each gap (max 5 queries)
8. Fetch top results for each gap, save to ./raw/
9. Run `graphify ./raw --update` to incorporate new sources

Round 3. Synthesis check (optional, if gaps remain)
10. If major contradictions or missing pieces still exist: one more targeted pass
11. Otherwise: proceed to graph building and synthesis

Max rounds: 3 (as set in program.md). Stop when depth is reached or max rounds hit.
```

---

## Building the Knowledge Graph

After all sources are saved to `./raw/`:

```bash
# Build the knowledge graph from all research sources
graphify ./raw --wiki --mode deep

# This produces:
# graphify-out/graph.html       - interactive visualization
# graphify-out/graph.json       - queryable graph data
# graphify-out/GRAPH_REPORT.md  - god nodes, surprises, suggested questions
# graphify-out/wiki/            - agent-crawlable articles per community
```

---

## Synthesis & Filing

After the graph is built:

### 1. Query the Graph for Synthesis

```bash
# Find the god nodes (core concepts)
graphify explain "$(python3 -c "
import json
with open('graphify-out/graph.json') as f:
    g = json.load(f)
nodes = sorted(g['nodes'], key=lambda n: n.get('degree', 0), reverse=True)
print(nodes[0]['label'] if nodes else 'root')
")"

# Find surprising connections
graphify query "what are the most surprising cross-domain connections?"

# Check specific relationships
graphify path "ConceptA" "ConceptB"
```

### 2. Write the Research Synthesis

Create `graphify-out/RESEARCH_REPORT.md`:

```markdown
# Research: [Topic]
**Date:** YYYY-MM-DD
**Rounds:** N | **Sources:** N | **Graph Nodes:** N | **Graph Edges:** N

## Overview
[2-3 sentence summary of findings, grounded in what the graph reveals]

## God Nodes (Core Concepts)
From the graph's highest-degree nodes:
- **[[Node A]]**: [one-line description]
- **[[Node B]]**: [one-line description]

## Surprising Connections
- **[[Node X]] ↔ [[Node Y]]**: [what the graph revealed that was unexpected]

## Community Structure
The graph identified N communities:
- Community 0 (largest): [topic] — [brief description]
- Community 1: [topic] — [brief description]

## Key Findings
- Finding 1 (sourced from graph node [[X]])
- Finding 2 (sourced from graph node [[Y]])

## Contradictions
- [[Source A]] suggests X. [[Source B]] suggests Y.
  [Which is more credible and why, based on source quality]

## Open Questions
- [Question the research didn't fully answer]
- [Gap that needs more sources]

## Graph Statistics
- Total nodes: N
- Total edges: N
- Communities: N
- God nodes: [[Node 1]], [[Node 2]], [[Node 3]]
- Token reduction vs naive: [from GRAPH_REPORT.md benchmark]

## Sources
[List all files in ./raw/ with brief descriptions]
```

### 3. File the Synthesis

The report lives at `graphify-out/RESEARCH_REPORT.md`. It is queryable via
`graphify query` and linkable from the graph itself.

---

## After Filing

No wiki index, log, or hot cache to update. The graph IS the index. The
GRAPH_REPORT.md IS the hot cache. Everything is queryable.

The user can:
- Open `graphify-out/graph.html` for interactive exploration
- Run `graphify query "question"` for natural language answers
- Run `graphify path "A" "B"` to trace connections
- Browse `graphify-out/wiki/` for article-style reading

---

## Report to User

After everything is complete:

```
wiki-autoresearch complete: [Topic]

Rounds: N | Sources: N | Graph: N nodes, N edges

Output:
  graphify-out/graph.html         (interactive graph)
  graphify-out/GRAPH_REPORT.md    (auto-generated analysis)
  graphify-out/RESEARCH_REPORT.md (synthesis)
  graphify-out/wiki/              (browsable articles)
  ./raw/                           (N source files)

God nodes: [top 3-5 concepts]
Surprising connections: [1-2 highlights]

Try: graphify query "your question about [topic]"
```

---

## Constraints

Follow the limits in `references/program.md`:
- Max rounds (default: 3)
- Max sources per round (default: 8)
- Max pages per session (default: 15)
- Confidence scoring rules
- Source preference rules

If a constraint conflicts with completeness, respect the constraint and note
what was left out in the Open Questions section of the research report.
