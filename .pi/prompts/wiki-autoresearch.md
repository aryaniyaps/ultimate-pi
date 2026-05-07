---
description: Run an autonomous research loop on a topic. Searches the web, synthesizes findings, and builds a knowledge graph via Graphify.
argument-hint: "[topic]"
---

Read the `wiki-autoresearch` skill. Then run the research loop.

Invocation arguments:
- Raw arguments from command: `$ARGUMENTS`
- If `$ARGUMENTS` is non-empty: treat it as explicit topic and use it verbatim.
- If `$ARGUMENTS` is empty: ask exactly "What topic should I research?"

Before starting:
1. Read `skills/wiki-autoresearch/references/program.md` for research constraints.
2. Ensure `./raw/` directory exists for source storage.
3. Ensure Graphify is installed (`pip show graphifyy`).

After research is complete:
1. Run `graphify ./raw --wiki --mode deep` to build the knowledge graph
2. Write synthesis to `graphify-out/RESEARCH_REPORT.md`
3. Report: rounds, sources, graph nodes/edges, god nodes, surprising connections
