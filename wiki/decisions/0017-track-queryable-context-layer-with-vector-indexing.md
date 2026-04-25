# 0017 - Track queryable context layer with vector indexing

- Date: 2026-04-25
- Status: Accepted

## Context
Harness writes context across wiki docs, todos, and plan files.
These artifacts are not uniformly queryable by natural language in many coding harnesses.
Need integrated retrieval layer so agents can find prior decisions/actions quickly.

## Alternatives
1. Keep plain files only and rely on keyword search/manual browsing.
2. Add partial indexing for a subset of documents.
3. Add explicit future-plan item for full context indexing with vector DB + natural-language querying.

## Chosen option
Track full-context query layer as a future plan item: index wiki actions, todos, and plans in a vector database and expose natural-language query over all indexed docs.

## Rationale
- Preserves long-term memory usability as artifact count grows.
- Enables semantic retrieval beyond exact keyword match.
- Closes known gap in current coding harness ecosystems.

## Consequences
- Future architecture needs ingestion pipeline, embeddings strategy, and re-index policy.
- Need governance for document freshness, access control, and query cost limits.
