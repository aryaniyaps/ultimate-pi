---
type: entity
entity_type: person
title: "Anders Hejlsberg"
role: "Creator of Turbo Pascal, Delphi, C#, TypeScript"
active: true
tags: [person, language-design, typescript, csharp, microsoft]
related:
  - "[[hejlsberg-7-learnings]]"
  - "[[fast-feedback-loops]]"
  - "[[behavioral-compatibility-over-purity]]"
---

# Anders Hejlsberg

Creator of Turbo Pascal (Borland, 1983), Delphi (1995), lead architect of C# (Microsoft, 2000), and designer of TypeScript (2012). Self-taught compiler writer. Still writes code daily — "my calling is writing code."

## Engineering Practices

- **Fast feedback as first principle**: Turbo Pascal's impact came from shortening edit-compile-run to instants. TypeScript's value equally from tooling responsiveness as from the type system.
- **Stay hands-on**: Discovered hash tables from a book while writing Turbo Pascal 2.0 — doubled compiler speed. Wrote the TypeScript type checker core himself. "I treated work as the place where I wouldn't work and then I go home and work."
- **Compromise over purity**: TypeScript extended JavaScript instead of replacing it. C# merged VB6 ease with C++ power. "Languages do not succeed because they are perfectly designed. They succeed because they accommodate the way teams actually work."
- **Behavioral compatibility**: When porting TypeScript compiler to Go, the goal was semantic fidelity — "the new compiler needed to behave exactly like the old one, including quirks and edge cases."
- **Open development**: 2014 move to GitHub was TypeScript's turning point. "Our entire workflow is in the open... no secrets on this project."
- **On AI coding**: Grounding/constraint matters more than generation. Type systems and refactoring tools become essential guardrails. "The most valuable tools in an AI-assisted workflow aren't the ones that generate the most code, but the ones that constrain it correctly."

## Relevance to AI Coding Harness

Hejlsberg's career is the strongest bridge between legendary programming and AI-assisted development. His 7 learnings (2026 GitHub blog) directly address AI coding workflow: fast feedback matters most, behavioral compatibility over purity, visibility builds trust, and deterministic constraints (type checkers, linters) as guardrails around AI output. The idea that "grounding matters more than generation" is a direct harness design principle.
