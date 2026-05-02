---
description: Bootstrap or check the claude-obsidian wiki vault. Reads the wiki skill and runs setup workflow.
---

Read the `wiki` skill. Then run the setup workflow:

1. Check if Obsidian is installed. If not, offer to install it (see `skills/wiki/references/plugins.md`).
2. Check if this directory has a vault (look for `.obsidian/` folder). If yes, report current vault state.
3. Check if the MCP server is configured (`claude mcp list`). If not, ask if the user wants to set it up.
4. Ask ONE question: "What is this vault for?"

Then build the entire wiki structure based on the answer. Don't ask more questions. Scaffold it, show what was created, and ask: "Want to adjust anything before we start?"

Examples of what the user might say:
- "Map the architecture of github.com/org/repo"
- "Build a sitemap and content analysis for example.com"
- "Track my SaaS business — product, customers, metrics, roadmap"
- "Research project on [topic] — papers, concepts, open questions"
- "Personal second brain — health, goals, learning, projects"
- "Organize my YouTube channel — transcripts, topics, tools mentioned"
- "Executive assistant brain — meetings, tasks, business context"

If the vault is already set up, skip to checking what has been ingested recently and offering to continue where things left off.
