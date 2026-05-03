---
description: Run an autonomous research loop on a topic. Searches the web, synthesizes findings, and files everything into the wiki as structured pages.
---

Read the `wiki-autoresearch` skill. Then run the research loop.

Usage:
- `/wiki-autoresearch [topic]` — research a specific topic. (Alias: `/autoresearch`)
- `/wiki-autoresearch` — ask "What topic should I research?"

Before starting, read `skills/wiki-autoresearch/references/program.md` to load the research constraints and objectives.

If no vault is set up yet, say: "No wiki vault found. Run /wiki first to set one up."

After research is complete, update wiki/index.md, wiki/log.md, and wiki/hot.md.

Report how many pages were created and what the key findings are.
