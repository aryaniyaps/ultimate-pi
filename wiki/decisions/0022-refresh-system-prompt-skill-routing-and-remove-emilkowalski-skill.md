# 0022 - Refresh system prompt skill routing and remove emilkowalski skill

- Date: 2026-04-25
- Status: Accepted

## Context
User requested:
- Update .pi/SYSTEM.md so all installed skills are explicitly referenced.
- Apply prompt-engineering best practices for a coding harness.
- Use portfolio AGENTS.md as baseline but remove all gstack sections.
- Remove emilkowalski/skill via npx skills remove.

## Alternatives
1. Keep current minimal system prompt and only patch one line.
2. Copy AGENTS.md wholesale including gstack instructions.
3. Build a concise, structured harness prompt: keep useful behavior from AGENTS.md, remove gstack, add explicit routing for local skills.

## Chosen option
Use option 3.

## Rationale
- Meets user request exactly.
- Avoids unrelated gstack dependencies.
- Improves reliability by explicit skill routing, tool order, and fallback rules.
- Keeps prompt compact and deterministic.

## Consequences
- .pi/SYSTEM.md becomes canonical harness policy file.
- Future skill additions should update skill-routing section.
- emilkowalski/skill is removed from local skills registry.
