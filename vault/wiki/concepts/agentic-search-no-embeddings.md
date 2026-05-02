---
type: concept
status: stub
created: 2026-05-02
updated: 2026-05-02
tags: [concept, search, agents]
---

# Agentic Search Without Embeddings

Pattern used by Claude Code: agents search codebases by reading files directly (grep, find, AST traversal) rather than relying on pre-built embedding indexes. No vector database required.

Contrasts with [[Semantic Codebase Indexing]] and [[hybrid-code-search]]. Relevant to the embedding-vs-agentic-search design tension in harness architecture.

## References

- [[claude-code-architecture-vila-lab-2026]]
- [[agent-search-enforcement]]
