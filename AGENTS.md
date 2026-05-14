# ultimate-pi: Agentic Harness

Purpose: Agentic coding harness — architecture, research, decisions, implementation.
Owner: pi-mono + user
Created: 2026-05-14

## Structure

- graphify-out/ → Knowledge graph (run `graphify update .` to build)
- ./raw/ → Source documents for graphify ingestion
- docs/adr/ → Architectural Decision Records
- .pi/skills/ → Agent skills
- .pi/agents/ → Specialized agents

## Graphify-First Workflow

1. Run `graphify update .` to build/update the knowledge graph
2. Read `graphify-out/GRAPH_REPORT.md` for god nodes and surprising connections
3. Query: `graphify query "question"`
4. Explain: `graphify explain "Concept"` for caller/callee traces
5. ADRs stored in `docs/adr/`

## Conventions

- Graph before grep — always consult the knowledge graph first
- ./raw/ is source storage for graphify
- ADRs in docs/adr/ with structured format
- `graphify update .` after significant code changes
- ast-grep (`sg`) is the default code search tool — use `sg -p 'pattern'` for structural search, never grep for code
- Self-hosted Firecrawl at http://localhost:3002 (FIRECRAWL_API_URL)
