---
type: concept
title: "Consensus Debate"
created: 2026-04-30
updated: 2026-04-30
status: active
tags: [harness, consensus, debate, multi-agent, dialectic, protocol]
related:
  - "[[adr-011]]"
  - "[[agentic-harness]]"
  - "[[adversarial-verification]]"
  - "[[pi-messenger-analysis]]"
---

# Consensus Debate

A structured multi-agent debate protocol for the harness pipeline. Replaces single-pass review with genuine back-and-forth argument — the kind that produces the best human software decisions.

## First Principles

### Why arguing works for humans

The dialectical process (thesis → antithesis → synthesis) is the engine of reasoning:

1. **Position**: Alice proposes X
2. **Counter**: Bob identifies flaw in X
3. **Rebuttal**: Alice refines X → X'
4. **Counter**: Bob finds deeper flaw in X'
5. **Rebuttal**: Alice refines X' → X''
6. **Convergence**: Bob cannot find further flaws. Consensus.

Each round forces deeper reasoning. The first counter is often shallow — it's the REBUTTAL that reveals the real insight, because defending a position requires understanding it more deeply than attacking it.

### Why this applies even more to agents

Agents lack intuition. They cannot "sense" something is wrong. They cannot have a "gut feeling" that a design is fragile.

Multi-round argument is a **substitute for intuition**:
- Round 1: Surface-level objections (syntax, naming, obvious gaps)
- Round 2: Structural objections (dependency cycles, coupling, missing edge cases)
- Round 3: Philosophical objections (wrong abstraction, incorrect model of the problem)

Without rounds 2-3, agents miss everything below the surface.

### Why single-pass review is insufficient

L4 (Adversarial Verification) currently does ONE attack pass. The critic finds what it can in one shot, and that's it. But the critic's first pass is limited by its own blind spots — it can only attack what it sees immediately. A defender's rebuttal ("no, because X") often REVEALS a deeper flaw the critic didn't consider ("wait, if X is your assumption, then what about Y?"). This dynamic cannot happen in a single pass.

## Protocol Design

### DebateSession

```
DebateSession {
  topic: string           // What is being debated
  scope: LayerScope       // Which harness layer invoked this
  participants: Agent[]   // 2+ agents with defined roles
  budget: ConsensusBudget // Termination conditions
  rounds: Round[]         // Accumulated argument rounds
  verdict: Verdict | null // Final outcome
}
```

### ConsensusBudget

```
ConsensusBudget {
  maxRounds: number       // Hard cap (default: 3-4 depending on layer)
  maxTokensPerRound: number // Per-agent token limit per round
  maxWallClockMs: number  // Timeout (default: 120s)
  convergenceRounds: number // Rounds without position change to declare convergence (default: 1)
}
```

### Round Structure

Each round has two phases:

```
Round {
  number: number
  attacker: Turn          // Critic's argument
  defender: Turn          // Proposer's rebuttal
}

Turn {
  agent: string           // Agent name
  role: "attacker" | "defender"
  position: string        // Succinct: what this agent asserts
  counter_to: string      // Which specific claim is being countered
  evidence_refs: string[] // References to spec, code, wiki pages
  confidence_change: number // Did this turn shift confidence? (-1, 0, +1)
}
```

### Verdict Semantics

| Verdict | Meaning | Harness action |
|---------|---------|---------------|
| `CONSENSUS_REACHED` | Both sides agree on final position | File winning consensus to wiki as permanent alignment record, then proceed to next layer |
| `DEADLOCK` | Positions unchanged after `convergenceRounds` rounds | File both positions + deadlock analysis to wiki. Escalate to human. |
| `BUDGET_EXHAUSTED` | Max rounds or tokens hit without convergence | File last positions + exhaustion analysis to wiki. Use last agreed position if any; otherwise escalate |
| `TIMEOUT` | Wall-clock time exceeded | File partial transcript to wiki. Escalate |

### Convergence Detection

Positions are hashed (deterministic). If the defender's position hash is identical for `convergenceRounds` consecutive rounds, and the attacker has presented new counters each time, but the position survived, we have convergence.

Alternatively: if the attacker explicitly signals "no further objections" by setting `confidence_change: 0` and an empty `counter_to`, that's consensus.

## Integration Points

### L1: Spec Debate

**Purpose**: Argue about whether a spec is sufficiently hardened.

**Participants**: Spec proposer (defender) + Spec critic (attacker)

**Example debate**:

| Round | Attacker (Critic) | Defender (Proposer) |
|-------|-------------------|---------------------|
| 1 | "You didn't specify error behavior for network timeout" | "Added: timeout → retry 3x with exponential backoff, then fail with TIMEOUT_ERROR" |
| 2 | "What about partial writes during retry? Is the operation idempotent?" | "Spec now requires idempotency key. Each retry reuses the same key. Server deduplicates." |
| 3 | "No further objections. Spec is complete." | — |

**Verdict**: CONSENSUS_REACHED. Winning consensus filed to `wiki/consensus/spec-[slug].md`. Spec proceeds to L2.

**Budget**: 3 rounds, ~2K tokens/round.

### L2: Plan Debate

**Purpose**: Argue about plan structure, dependencies, and feasibility.

**Participants**: Planner (defender) + Plan critic (attacker)

**Example debate**:

| Round | Attacker | Defender |
|-------|----------|----------|
| 1 | "Task 3 depends on Task 1 and Task 2 — but Task 2 also reads the output of Task 3. Circular dependency." | "Task 2 only reads Task 3's OUTPUT SCHEMA, not its data. Dependency is on the interface, not the implementation. Restructured: Task 2 depends on the schema definition step, not Task 3." |
| 2 | "Task 4 (DB migration) has no rollback plan. If migration fails after Task 5 (data transform) runs, we're in an inconsistent state." | "Added Task 4b: migration verification + rollback trigger. Task 4 and 4b form an atomic pair. Task 5 only runs after 4b passes." |
| 3 | "No further objections. Plan is executable." | — |

**Verdict**: CONSENSUS_REACHED. Winning consensus filed to `wiki/consensus/plan-[slug].md`. Plan proceeds to L3.

**Budget**: 3 rounds, ~3K tokens/round.

### L4: Multi-Round Adversarial Attack

**Purpose**: Genuine debate about implementation correctness and spec compliance.

**Participants**: Implementer (defender) + Critic (attacker)

This replaces the current single-pass L4 critic. Instead of one attack, the critic gets multiple rounds to find increasingly subtle flaws.

**Budget**: 4 rounds, ~2K tokens/round. Winning consensus filed to `wiki/consensus/verify-[slug].md`.

## Token Budget Impact

| Activity | Current | With Consensus | Delta |
|----------|---------|---------------|-------|
| L1 Spec Hardening | ~2,000 | ~6,000 (3 rounds) | +4,000 |
| L2 Planning + review | ~5,000 | ~10,000 (3 rounds) | +5,000 |
| L4 Adversarial | ~4,000 | ~8,000 (4 rounds) | +4,000 |
| **Total added per subtask** | — | **~13,000** | — |

New total per subtask: **~30,500-33,500 tokens** (up from ~17,500).

**Is this worth it?** Catching a spec flaw at L1 saves ~17,500 tokens of L2-L8 work. Catching a plan flaw at L2 saves ~15,500 tokens of L3-L8 work. The debate cost pays for itself on the first flaw caught.

## Transport Layer: pi-messenger File-Based Messaging

See [[pi-messenger-analysis]] for full analysis. Summary:

- **Adopted**: Agent registry, per-agent inboxes, `fs.watch` delivery, JSON message format, atomic file writes, stale cleanup
- **Stripped**: Chat UI, status bar, activity feed, emoji, crew orchestration, swarm claims
- **Added**: Consensus protocol layer (DebateSession, ConsensusBudget, convergence detection, verdict generation)

## Files

- `lib/harness-messenger.ts` — pi-messenger transport integration (registry, inbox, watcher)
- `lib/harness-debate.ts` — Consensus protocol (DebateSession, ConsensusBudget, convergence, verdict)
- `lib/harness-schemas.ts` — Extended with debate message schemas
- `extensions/harness-debate.ts` — Extension hooks: debate → wiki transcript
- `extensions/harness-spec.ts` — Updated: L1 spec debate integration
- `extensions/harness-planner.ts` — Updated: L2 plan debate integration
- `extensions/harness-critics.ts` — Updated: L4 multi-round debate integration

## Wiki Filing Rule (Mandatory)

**Winning consensus from any agent debate MUST be filed in the project wiki.** This is not optional. The purpose is permanent agent alignment: future agents query the wiki before making decisions and find the resolved consensus, preventing re-litigation of settled debates.

- **CONSENSUS_REACHED** → File final position + key rounds + evidence references to `wiki/consensus/`
- **DEADLOCK** → File both positions + deadlock analysis (what blocked convergence)
- **BUDGET_EXHAUSTED / TIMEOUT** → File partial transcript + exhaustion analysis

Filing is enforced by L7 schema orchestration: no layer transition after a debate until the wiki write is confirmed. [[adr-010]] already mandates write-after for every state transition — consensus verdicts are state transitions and fall under this contract.

## Open Questions

- Should debates use the same model for both sides, or different models for genuine adversarial diversity?
- What is the right default `convergenceRounds`? (1 may be too aggressive, 2 may waste tokens)
- Should L3 (Grounding Checkpoints) also have a debate mode? (Current thinking: no — L3 is about execution fidelity, not design decisions)
- Can we reuse a single critic agent across multiple debates, or should each debate spawn fresh critics?
- What is the optimal wiki page structure for consensus records? (candidate: `wiki/consensus/[topic-slug].md` with frontmatter linking to the debate layer, participants, and verdict)
