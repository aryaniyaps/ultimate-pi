---
type: source
status: ingested
source_type: article
author: "Dominik Dorfmeister (TkDodo)"
date_published: 2024-07-26
url: "https://tkdodo.eu/blog/please-stop-using-barrel-files"
confidence: high
key_claims:
  - "Barrel files cause circular imports when internal modules import from the barrel"
  - "Next.js projects saw 11K → 3.5K module load reduction (68%) by removing barrels"
  - "Barrel files slow development server startup by 5-10 seconds in large projects"
  - "Barrels are appropriate only for library entry points (package.json `main` field)"
tags:
  - typescript
  - barrel-files
  - code-organization
  - performance
created: 2026-05-02
updated: 2026-05-02

---# Please Stop Using Barrel Files

Source: TkDodo's blog (Dominik Dorfmeister), July 2024. Author of TanStack Query.

## Summary

Argues against the widespread practice of using `index.ts` barrel files to re-export from directories. Documents real-world performance problems and circular import issues caused by barrel files in production Next.js applications.

## Key Arguments

**Circular imports**: When a module inside a directory imports from its own barrel (`import { X } from '@/dir'`), it creates a circular dependency. ESLint `import/no-cycle` can catch some but not all cases.

**Development speed**: Barrel files force JavaScript to load and parse every module in the barrel synchronously, even if only one export is needed. A real Next.js project saw module count drop from 11K to 3.5K (68% reduction) after removing barrels, cutting startup time from 5-10 seconds down significantly.

**Next.js `optimizePackageImports`**: Automatically transforms barrel imports to direct module paths, but only works if the barrel is a "pure" re-export file with no other code.

**When barrels are OK**: Library entry points only (the `main` field in `package.json`). For application code, direct imports are preferred.
