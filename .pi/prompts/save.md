---
description: Save the current conversation or a specific insight into the wiki vault as a structured note.
---

Read the `save` skill. Then run the save workflow for this conversation.

Usage:
- `/save` — analyze the full conversation and save the most valuable content
- `/save [name]` — save with a specific note title (skip the naming question)
- `/save session` — save a complete session summary
- `/save concept [name]` — explicitly save as a concept page
- `/save decision [name]` — explicitly save as a decision record

If no vault is set up yet, say: "No wiki vault found. Run /wiki first to set one up."

Check if a page with the same name already exists. If it does, offer to update it instead of creating a duplicate.
