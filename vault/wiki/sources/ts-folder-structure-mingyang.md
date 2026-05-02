---
type: source
status: ingested
source_type: article
author: "Mingyang Li"
date_published: 2024-01-05
url: "https://mingyang-li.medium.com/production-grade-node-js-typescript-folder-structure-for-2024-f975edeabefd"
confidence: medium
key_claims:
  - "Backend folders should be named by technical capability (Onion/Clean Architecture), not by feature"
  - "Separate database logic into its own layer (repositories) distinct from services"
  - "Separate 3rd-party SDK/API wrappers into their own folder (libs)"
  - "Centralize environment variable access in one file for validation and autocompletion"
  - "Feature-based structure (Vertical Slice) works better for frontend than backend"
tags:
  - typescript
  - folder-structure
  - nodejs
  - architecture
created: 2026-05-02
updated: 2026-05-02

---# Production-Grade Node.js & TypeScript Folder Structure

Source: Mingyang Li (Medium), January 2024.

## Summary

Practical guide to structuring Node.js/TypeScript backend projects. Recommends the Onion/Clean Architecture approach — folders named by technical capability rather than business feature. Covers separation of concerns and conventions for production codebases.

## Recommended Structure

```
src/
  routes/       — REST API route definitions (keep short)
  controllers/  — Receive/return data to routes
  services/     — Core business logic
  repositories/ — Database logic only (data-in/data-out)
  models/       — DB schema definitions (optional)
  constants/    — Static project values
  libs/         — 3rd-party SDK/API wrappers (Stripe, Shopify, etc.)
  middlewares/  — Error parsing, auth, caching
  types/        — Type definitions
  validators/   — Input validation
  common/       — Shared utilities
```

## Key Rules

1. Keep code files separate from config files (`/src` vs root)
2. Name folders by technical capability, not feature — business requirements change
3. Separate DB logic into repositories (not in services)
4. Isolate 3rd-party API/SDK code in `/libs`
5. Centralize `env.ts` for validated, autocompleted environment variables

## Confidence

Medium. Single author, opinion piece. Concepts align with Clean Architecture but opinionated choice of technical over feature-based structure is contested.
