# Codebase Map & Architecture Wiki

Mode: GitHub / Repository (Mode B)
Purpose: Maintain a codebase map, architecture wiki, and software design decisions.
Owner: aryaniyaps
Created: 2026-04-28

## Structure

```
vault/
├── .raw/              # source documents: code dumps, issue exports
├── wiki/
│   ├── modules/       # one note per major module / package / service
│   ├── components/    # reusable UI or functional components
│   ├── decisions/     # Architecture Decision Records (ADRs)
│   ├── dependencies/  # external deps, versions, risk assessment
│   ├── flows/         # data flows, request paths, auth flows
│   └── meta/          # dashboards, lint reports, conventions
└── CLAUDE.md          # schema and instructions (this file)
```

## Conventions

- All notes use YAML frontmatter: type, status, created, updated, tags (minimum)
- Wikilinks use [[Note Name]] format: filenames are unique, no paths needed
- .raw/ contains source documents: never modify them
- wiki/index.md is the master catalog: update on every ingest
- wiki/log.md is append-only: never edit past entries
- New log entries go at the TOP of the file

## Operations

- Ingest: drop source in .raw/, say "ingest [filename]"
- Query: ask any question: Claude reads index first, then drills in
- Lint: say "lint the wiki" to run a health check
- Archive: move cold sources to .archive/ to keep .raw/ clean
