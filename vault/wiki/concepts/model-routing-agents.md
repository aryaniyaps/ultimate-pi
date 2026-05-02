---
type: concept
title: "Model Routing Agents"
created: 2026-04-30
updated: 2026-04-30
tags:
  - agent-architecture
  - token-reduction
  - cost-optimization
related:
  - "[[wozcode]]"
  - "[[agentic-harness]]"
  - "[[research-wozcode-token-reduction]]"
  - "[[wiki-query-interface]]"
status: developing

---# Model Routing Agents

Model routing is an agent architecture pattern where different operation types are dispatched to different AI models based on capability requirements and cost. Read-only exploration work goes to the cheapest capable model; code generation stays on the frontier model.

## WOZCODE's Pattern

WOZCODE uses a two-agent split (Source: [[wozcode]]):

| Agent | Model | Cost vs Opus | Operations |
|-------|-------|-------------|------------|
| `woz:code` | User's frontier (Opus/Sonnet) | 1× | Write/edit code, full tool access |
| `woz:explore` | Haiku | ~15× cheaper | Read-only: search, explore, summarize |

~40% of coding work is exploration → automatically routed to Haiku → ~70% savings on exploration calls.

## Why This Works

- **Exploration is read-only**: No risk of Haiku writing bad code because it only reads
- **Exploration is high-volume**: Finding the right files, understanding architecture, searching for patterns — these are many small calls
- **Exploration is low-creativity**: "Find the file that defines X" doesn't need frontier reasoning
- **Summaries keep context lean**: Haiku returns summaries, main agent stays focused

## Our Harness Integration Points

### L8: Wiki Query Interface
Current: LLM-native search via claude-obsidian skills.

Change: Route wiki queries through Haiku when:
- Query is read-only knowledge retrieval
- Query is exploratory (not code generation)
- Query result is a summary, not executable code

### L2: Structured Planning
Current: Task DAG generation uses the main model.

Potential: Route plan review/refinement to Haiku. Frontier model generates the initial plan; Haiku validates, cross-references specs, and checks for missing dependencies.

### NEW: Model Router Component
A new cross-cutting component that sits between the Archon orchestrator (L7) and tool invocations:

```
User Request → L1 (Spec) → L2 (Plan) → L3 (Execute) → L4 (Critics) → L5 (Observe) → L6 (Memory)
                                        ↓
                              [Model Router]
                              /              \
                        woz:code         woz:explore
                      (Frontier)         (Haiku)
```

The router decides per-operation:
- **Route to Haiku**: Read tool, wiki query, search tool, summarize operations
- **Route to Frontier**: Edit tool, write tool, bash tool, code generation
- **Route to Frontier (always)**: Adversarial verification (L4), spec hardening (L1)

## Router Decision Rules

```typescript
interface ModelRouter {
  route(operation: ToolOperation): ModelTarget;
}

// Default rules:
const DEFAULT_RULES: RoutingRule[] = [
  { tools: ['read', 'wiki-query', 'search', 'grep'], operation: 'explore', model: 'haiku' },
  { tools: ['edit', 'write', 'bash'], operation: 'mutate', model: 'frontier' },
  { tools: ['harden-spec', 'attack', 'verify'], operation: 'critical', model: 'frontier' },
  { tools: ['read'], when: 'post-edit-verify', model: 'frontier' }, // verification reads stay on frontier
];
```

## Risks

- **Haiku hallucination in summaries**: If Haiku misreads code, the summary is wrong, and the main agent acts on bad information. Mitigation: confidence scoring on summaries, critical reads always on frontier.
- **Latency overhead**: Routing adds a decision step. Mitigation: deterministic routing rules, no AI-in-the-loop for the routing decision itself.
- **Context coherence**: Summaries may lose detail that matters. Mitigation: progressive disclosure — Haiku returns L1 (signatures), main agent can request L2/L3 if needed.

## Cost Model

For a typical 5-subtask plan:
- Without routing: all operations on frontier model
- With routing: ~40% of operations on Haiku (15× cheaper)
- Expected savings on exploration: ~70%
- Expected overall savings: ~15-25% (consistent with WOZCODE's reported range)

These are projections. Actual savings must be measured from API usage fields (Source: [[wozcode]] methodology).
