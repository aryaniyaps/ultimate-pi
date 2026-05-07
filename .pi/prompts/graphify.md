---
description: Bootstrap or update the Graphify knowledge graph. Reads the graphify skill and runs setup/build workflow.
argument-hint: "[directory]"
---

Read the `graphify` skill. Then run the setup workflow:

1. Check if Graphify is installed (`pip show graphifyy`). If not, install it:
   ```bash
   pip install graphifyy && graphify install
   ```
2. Check if a graph already exists (`graphify-out/graph.json`). If yes, report
   current graph stats (nodes, edges, communities, last built).
3. If no graph exists, build one: `graphify ${ARGUMENTS:-.} --wiki`
4. Read and summarize `graphify-out/GRAPH_REPORT.md` — show god nodes,
   surprising connections, and suggested questions.
5. Tell user: "Graph built. Open `graphify-out/graph.html` for interactive
   exploration. Run `graphify query \"question\"` to ask anything."

If the graph already exists:
- Report graph stats from `graph.json`
- Offer to update: `graphify . --update`
- Show recent god nodes from GRAPH_REPORT.md
