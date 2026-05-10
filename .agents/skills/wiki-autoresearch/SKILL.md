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
graph — not a wall of text.

This is based on Karpathy's autoresearch pattern. You run the loop until depth
is reached. Output goes into the knowledge graph only — no separate report file.

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

### Pre-Flight: Graphify Readiness Check (MANDATORY)

**Do NOT start research until these pass.** A graph that can't be built is wasted work.

```bash
# 1. Verify graphify CLI is installed
which graphify || { echo "FATAL: graphify not found. Install: npm install -g graphifyy"; exit 1; }

# 2. Check that graphify's Python has the openai package (required for semantic extraction)
GRAPHIFY_PYTHON=$(head -1 $(which graphify) | sed 's/^#!//')
"$GRAPHIFY_PYTHON" -c "import openai; print('openai OK')" 2>/dev/null || {
  echo "FATAL: openai package missing from graphify's Python ($GRAPHIFY_PYTHON)"
  echo "Fix: uv pip install openai --python $GRAPHIFY_PYTHON"
  exit 1
}

# 3. Verify a valid LLM API key is set (any backend)
for KEY in OPENAI_API_KEY ANTHROPIC_API_KEY GEMINI_API_KEY; do
  if [ -n "${!KEY}" ]; then
    echo "Found: $KEY"
    break
  fi
done
if [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$GEMINI_API_KEY" ]; then
  echo "FATAL: No LLM API key set. graphify extract needs one for semantic extraction."
  echo "Set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY"
  echo "Or install Ollama locally and use: graphify extract ./raw --out . --backend ollama"
  exit 1
fi

# 4. Optionally validate the API key with a quick test call
# Skip this if you trust the key — adds ~2s latency.

# 5. Record baseline graph state for post-extraction verification
BASELINE_NODES=$(python3 -c "
import json, os
graph_path = 'graphify-out/graph.json'
if os.path.exists(graph_path):
    with open(graph_path) as f:
        g = json.load(f)
    print(len(g.get('nodes',[])))
else:
    print(0)
" 2>/dev/null || echo 0)
echo "Baseline graph nodes: $BASELINE_NODES"
```

**If any check fails, report the exact error and fix command to the user. Do NOT proceed.**

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
9. Run `graphify extract ./raw --out .` to incorporate new sources
   (NOTE: `graphify update` only works for code files. Research sources are docs
   and need `graphify extract` for semantic extraction.)

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
# --out . writes graphify-out/ in current dir (same as main project graph)
# --backend auto-detects from available API keys; use --backend ollama if no cloud key
graphify extract ./raw --out .
```

### Post-Extraction Verification (MANDATORY)

**Do NOT skip this. Do NOT delete ./raw/ until this passes.**

```bash
# 1. Verify graph.json exists and contains research-topic nodes
python3 << 'VERIFY'
import json, os

GRAPH_PATH = 'graphify-out/graph.json'
if not os.path.exists(GRAPH_PATH):
    print("FATAL: graph.json not created. graphify extract failed.")
    exit(1)

with open(GRAPH_PATH) as f:
    g = json.load(f)

nodes = g.get('nodes', [])
# graphify uses 'links' key, not 'edges' — check both
links = g.get('links', g.get('edges', []))

print(f"Graph: {len(nodes)} nodes, {len(links)} links, {len(g.get('communities',[]))} communities")

# 2. Check that new sources were actually ingested
# Count nodes whose source_file is in ./raw/
raw_sources = set()
for n in nodes:
    src = n.get('source_file', '')
    if src.startswith('raw/'):
        raw_sources.add(src)

print(f"Nodes from ./raw/ sources: {len(raw_sources)} (from {len(raw_sources)} unique files)")

# 3. FATAL if no new nodes were added
if len(raw_sources) == 0:
    print("FATAL: Zero nodes from ./raw/ sources. graphify did not ingest research content.")
    print("Check: LLM API key valid? openai package installed? Files in ./raw/ have content?")
    print("DO NOT delete ./raw/ — the extraction failed.")
    exit(1)

# 4. Compare against baseline (BASELINE_NODES env var from pre-flight)
baseline = int(os.environ.get('BASELINE_NODES', '0'))
if len(nodes) <= baseline and baseline > 0:
    print(f"WARNING: Node count ({len(nodes)}) <= baseline ({baseline}). Graph may not have grown.")
    print("Check: Did graphify run incrementally? Did the old graph merge properly?")
else:
    print(f"Node delta: +{len(nodes) - baseline} (baseline was {baseline})")

print("VERIFICATION PASSED — safe to clean up ./raw/")
VERIFY
```

**If verification fails:** Report the exact error. Do NOT delete ./raw/. The user needs
to fix the graphify environment (API key, openai package, Ollama install) before retrying.

---

## Cleanup

**GUARDED: Only run after Post-Extraction Verification passes.**

After the graph is built AND verified to contain new research nodes, remove the
raw source directory. Graphify has already copied everything it needs into
`graphify-out/`. The `./raw/` folder is transient.

```bash
# Guard: only delete if graph was verified
if python3 -c "
import json, os
with open('graphify-out/graph.json') as f:
    g = json.load(f)
raw_count = sum(1 for n in g.get('nodes',[]) if n.get('source_file','').startswith('raw/'))
assert raw_count > 0, 'No raw/ nodes in graph — do not delete'
print(f'{raw_count} raw-sourced nodes confirmed')
"; then
  rm -rf ./raw
  echo "Cleanup: ./raw/ removed (graph has ingested all data)"
else
  echo "SKIPPED cleanup: graph verification failed. ./raw/ preserved for debugging."
fi
```

Do this before reporting to the user.

---

## Synthesis via Graph

After the graph is built, query it directly for insights:

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

No separate report file is created. The graph IS the research output.

---

## After Building

No wiki index, log, hot cache, or report file to update. The graph IS the index.
The GRAPH_REPORT.md IS the hot cache. Everything is queryable.

The user can:
- Open `graphify-out/graph.html` for interactive exploration
- Run `graphify query "question"` for natural language answers
- Run `graphify path "A" "B"` to trace connections
- Browse `graphify-out/GRAPH_REPORT.md` for structured analysis

---

## Report to User

After everything is complete:

```
wiki-autoresearch complete: [Topic]

Rounds: N | Sources: N | Graph: N nodes, N links

Output:
  graphify-out/graph.html         (interactive graph)
  graphify-out/GRAPH_REPORT.md    (auto-generated analysis)

God nodes: [top 3-5 concepts]
Surprising connections: [1-2 highlights]

Try: graphify query "your question about [topic]"
```

**IMPORTANT:** graphify uses `links` key (not `edges`) in graph.json. When
reporting graph size, use the correct key:
```bash
python3 -c "import json; g=json.load(open('graphify-out/graph.json')); print(f'{len(g[\"nodes\"])} nodes, {len(g[\"links\"])} links')"
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
what was left out so the user can query the graph about gaps.

## Failure Modes (Anti-Patterns)

Common failures and how to prevent them:

| Failure | Cause | Prevention |
|---------|-------|------------|
| Graph has 0 nodes after extraction | openai package not installed in graphify's Python | Pre-flight check #2 catches this |
| Graph has old nodes only (no new content) | Invalid LLM API key → semantic extraction failed, but code nodes remained | Pre-flight check #3 catches this |
| `./raw/` deleted before graph verified | Cleanup ran without post-extraction verification | Guarded cleanup with assertion prevents this |
| Graph reported as "N edges" but `links` key is correct | graph.json uses `links` not `edges` | Report section uses `links` key explicitly |
| Incremental extraction misses new files | graphify tracks file paths; deleting and recreating ./raw/ confuses it | Pre-flight records baseline; post-extraction checks node delta |
| Research content read but not in graph | Semantic extraction failed silently | Post-extraction verification counts raw/-sourced nodes |
