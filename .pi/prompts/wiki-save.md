---
description: Save the current conversation or a specific insight as a structured note in the knowledge graph.
---

Read the `graphify` skill for context on graphify-out/ structure.

Save the current conversation or requested insight as a markdown file in `./raw/`
so it can be graphified and queried. Then run `graphify ./raw --update` to
incorporate it into the knowledge graph.

Usage:
- `/save` — analyze the full conversation and save the most valuable content
- `/save [name]` — save with a specific note title
- `/save session` — save a complete session summary
- `/save decision [name]` — save as a design decision (also write to `docs/adr/`)

Save to: `./raw/[sanitized-name].md`
Then: `graphify ./raw --update`

If Graphify is not installed, say: "Graphify not installed. Run: pip install graphifyy && graphify install"
