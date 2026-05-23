# ADR 0042: Agent-native orchestration

- **Status:** Accepted
- **Date:** 2026-05-23

## Context

Harness commands inherited human PM rituals: serial debate “meetings,” ticket-granularity WBS, and tool calls that re-embed full plan packets in model context. Agents optimize for context window, spawn cost, and verifiable artifacts—not calendar boundaries or social coordination (see [practice-map.md](../practice-map.md)).

## Decision

1. **Agent translation column** — practice-map documents human practice → agent equivalent (scheduler + gates, lake-first plans, path-first tools, steer loop).
2. **Boiling lakes** — Fewer `work_items` with richer specs and `context_bundle_path`; `executor_strategy` on PlanPacket (`single_pass` | `per_lake` | `per_work_item`).
3. **Plan-verify probes** — For `fast`/`standard` profiles, parallel inspector + adversary probes replace serial “one role per batch” debate where gate supports `parallel_probes` (ADR 0036 extended).
4. **Plan synthesizer** — For `low`/`med` risk, one `harness/planning/plan-synthesizer` pass may replace separate author spawn; **decomposition + hypothesis artifacts still required** on disk for blind validation (ADR 0040 invariant).
5. **Path-first tools** — See ADR 0043; disk is source of truth for approval and submit pipelines.
6. **Steer loop** — See ADR 0044; always complete post-run review; repair vs plan revise routing.

## Consequences

### Positive

- Lower plan/review wall-clock and token use.
- Plans sized for agent throughput, not sprint ticket count.

### Negative

- More ADRs and schema fields for agents to learn.
- Migration period: optional fat tool args remain one release.

## References

- [practice-map.md](../practice-map.md)
- ADR 0040, 0041, 0043, 0044
- `.cursor/plans/agent-native_harness_workflows_1d353489.plan.md` (design source)
