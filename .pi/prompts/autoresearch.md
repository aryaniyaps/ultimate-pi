---
description: Run an autonomous research loop on a topic. Searches the web, synthesizes findings, and files everything into the wiki as structured pages.
---

Read the `autoresearch` skill. Then run the research loop.

Usage:
- `/autoresearch [topic]` — research a specific topic.
- `/autoresearch` — if DragonScale Mechanism 4 (boundary-first, agenda-control, opt-in) is set up, offer the top 5 vault-frontier pages as topic candidates; you can **pick one**, **type a topic to override**, or **decline and be asked normally**. No automatic selection happens without user confirmation. If DragonScale is not set up OR the helper fails, the command falls back to "What topic should I research?"

DragonScale Mechanism 4 is labeled **agenda control** in the spec because it shapes what the agent researches next; it is not pure memory. The boundary score is a heuristic surfacing candidates, not an authoritative recommendation.

Before starting, read `skills/autoresearch/references/program.md` to load the research constraints and objectives.

If no vault is set up yet, say: "No wiki vault found. Run /wiki first to set one up."

After research is complete, update wiki/index.md, wiki/log.md, and wiki/hot.md.

Report how many pages were created and what the key findings are.
