---
description: Bootstrap or update the Graphify knowledge graph. Reads the graphify skill and runs setup/build workflow.
argument-hint: "[directory]"
---

Read the `graphify` skill. Then run the setup workflow:

1. Check if Graphify is installed (`pip`/`pip3 show graphifyy`, `uv tool list`, or `command -v graphify`). If not, install (`uv tool install graphifyy` preferred) and `graphify install --platform pi`.
2. Check if a valid graph exists (`graphify-out/graph.json` with ≥1 node and `GRAPH_REPORT.md`). If yes, report stats.
3. If no valid graph, build: `GRAPHIFY_VIZ_NODE_LIMIT=200000 graphify update ${ARGUMENTS:-.}` (never `graphify . --wiki` — invalid CLI). For full semantic extraction when API keys exist: `graphify extract ${ARGUMENTS:-.}`.
4. Read and summarize `graphify-out/GRAPH_REPORT.md` — show god nodes,
   surprising connections, and suggested questions.
5. Tell user: "Graph built. Open `graphify-out/graph.html` for interactive
   exploration. Run `graphify query \"question\"` to ask anything."

If the graph already exists:
- Report graph stats from `graph.json`
- Offer to update: `graphify update .`
- Show recent god nodes from GRAPH_REPORT.md
