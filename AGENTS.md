# ultimate-pi: Agentic Harness

Purpose: Agentic coding harness — architecture, research, decisions, implementation.
Owner: pi-mono + user
Created: 2026-05-14

## Instruction Boundaries

- `.pi/SYSTEM.md` is the reusable harness-level agent prompt and should remain project-agnostic for external projects.
- Keep ultimate-pi-specific paths, ownership, local conventions, and repository facts in this `AGENTS.md` file (or nearby project docs), not in `.pi/SYSTEM.md`.

## Structure

- graphify-out/ → Knowledge graph (run `graphify update .` to build)
- ./raw/ → Source documents for graphify ingestion
- docs/adr/ → Repo-level Architectural Decision Records
- .pi/harness/docs/adrs/ → Harness ADRs (team-shared; [index](.pi/harness/docs/adrs/README.md))
- .pi/harness/docs/practice-map.md → Phase → practice → agent spawn topology for `/harness-plan`, `/harness-run`, `/harness-review`
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
- ADRs in docs/adr/ (repo) and .pi/harness/docs/adrs/ (harness) with structured format
- `node "$UP_PKG/.pi/scripts/harness-verify.mjs"` for deterministic harness contract checks (`UP_PKG` — see `.pi/scripts/README.md`)
- Harness context: **context-mode only** — never lean-ctx on harness paths (see harness-context skill)
- `graphify update .` after significant code changes
- ast-grep (`sg`) is the default code search tool — use `sg -p 'pattern'` for structural search, never grep for code
- Web fetch/search via `python3 "$UP_PKG/.pi/scripts/harness-web.py"` (Scrapling; see scrapling-web skill)

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
