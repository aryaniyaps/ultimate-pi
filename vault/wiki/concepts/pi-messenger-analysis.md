---
type: analysis
title: "pi-messenger Analysis for Harness Integration"
created: 2026-04-30
updated: 2026-04-30
tags: [pi-messenger, analysis, harness, multi-agent, communication, transport]
status: developing
sources:
  - "https://github.com/nicobailon/pi-messenger"
related:
  - "[[adr-011]]"
  - "[[consensus-debate]]"
  - "[[agentic-harness]]"
---

# pi-messenger Analysis: What We Adopt, What We Strip

pi-messenger is a multi-agent communication extension for the pi coding agent. 532 stars. File-based: no daemon, no server, just files.

## Architecture Summary

### Core Mechanism: File-Based Agent Mesh

Agents write JSON registration files to a shared `.pi/messenger/registry/` directory. Each file contains: name, PID, sessionId, cwd, model, git branch, reservations, activity timestamps.

Messages are delivered as JSON files to per-agent inbox directories (`.pi/messenger/inbox/<agentName>/`). Recipients detect new messages via `fs.watch()` on their inbox directory.

**Key insight**: This is peer-to-peer, not parent-child. Agents communicate directly. No orchestrator mediates messages. This enables genuine multi-agent conversation — the kind needed for consensus debates.

### Components

| Component | What it does | Keep? |
|-----------|-------------|-------|
| **Registry** | Agent registration/discovery. Files in `registry/`. PID-based liveness. Stale cleanup. | ✅ YES |
| **Inbox** | Per-agent message delivery. `fs.watch` for real-time. Debounced to 50ms. | ✅ YES |
| **Messaging** | DM + broadcast. JSON message format `{id, from, to, text, timestamp, replyTo}`. Atomic file writes. | ✅ YES (adapted) |
| **Presence** | Active/idle/away/stuck detection. Status indicators. Auto-generated status messages ("on fire", "debugging...") | ❌ STRIP |
| **File Reservations** | Claim files/directories. Other agents blocked with conflict message. | ⚠️ KEEP (useful for parallel harness waves) |
| **Activity Feed** | Timeline of edits, commits, tests, messages. Human-facing. | ❌ STRIP |
| **Chat Overlay** | `/messenger` interactive UI. Agent list, activity feed, chat tabs. | ❌ STRIP |
| **Crew Orchestration** | Planner→Worker→Reviewer DAG. Wave-based execution. Task dependency graph. | ❌ STRIP (L7 handles this) |
| **Swarm** | Spec-based claim/complete. File-based locking. | ❌ STRIP (L7 handles task tracking) |
| **Crew Skills** | On-demand skill loading for workers. | ❌ STRIP (harness has own skill system) |
| **Human as Participant** | Interactive pi session appears in agent list. | ❌ STRIP |

### Message Delivery Flow

```
Agent A                          Filesystem                       Agent B
  │                                 │                                │
  ├─ send( to: "B", text: "..." )   │                                │
  │  └─ write inbox/B/<ts>.json ────►                                │
  │                                 │                                │
  │                                 │  fs.watch fires                │
  │                                 │  debounce 50ms                 │
  │                                 │  processAllPendingMessages()   │
  │                                 │  └─ read + parse inbox files   │
  │                                 │     └─ deliverFn(msg) ────────►│ B sees message
  │                                 │     └─ unlink file             │
```

### Registry Format

```json
{
  "name": "SwiftRaven",
  "pid": 12345,
  "sessionId": "abc-123",
  "cwd": "/path/to/project",
  "model": "claude-sonnet-4-6",
  "startedAt": "2026-04-30T10:00:00Z",
  "gitBranch": "main",
  "isHuman": false,
  "session": { "toolCalls": 42, "tokens": 15000, "filesModified": ["src/auth.ts"] },
  "activity": { "lastActivityAt": "2026-04-30T10:05:00Z" },
  "reservations": [{ "pattern": "src/auth/", "reason": "Refactoring", "since": "..." }]
}
```

### Message Format

```json
{
  "id": "uuid",
  "from": "SwiftRaven",
  "to": "GoldFalcon",
  "text": "auth module is done, your turn",
  "timestamp": "2026-04-30T10:05:00Z",
  "replyTo": "prev-msg-uuid"
}
```

## What We Adopt

### 1. Agent Registry (`.pi/messenger/registry/`)

Adapted for harness:
- Each harness layer spawns debate participants that register
- Registry tracks which agents are alive (PID check)
- Stale cleanup on crash/exit
- Name generation for debuggability

### 2. Per-Agent Inboxes (`.pi/messenger/inbox/<agent>/`)

Adapted for consensus:
- Debate rounds delivered as messages to inboxes
- `fs.watch` triggers message processing
- Debounce prevents thundering herd on rapid messages
- Atomic file writes (write temp, rename) prevent partial reads

### 3. Message Format

Extended for consensus:
```json
{
  "id": "uuid",
  "from": "agent-name",
  "to": "agent-name",
  "type": "debate_turn",
  "debate_id": "debate-uuid",
  "round": 2,
  "role": "attacker",
  "position": "Succinct claim",
  "counter_to": "Previous claim being countered",
  "evidence_refs": ["wiki/page", "src/auth.ts:142"],
  "confidence_change": -1,
  "timestamp": "...",
  "replyTo": "prev-turn-uuid"
}
```

### 4. Atomic Patterns

- Temp file write + `fs.renameSync` for race-free writes
- Swarm lock pattern (`.lock` file with PID, staleness detection)
- Retry with exponential backoff on watcher failures

## What We Strip

### Chat Overlay (`overlay.ts`, `overlay-*.ts`)
Human-facing TUI. Not needed for agent-to-agent debate.

### Status Bar Indicators
"SwiftRaven (2 peers) ●3", "on fire 🔥", "debugging...". Human-facing presence display.

### Activity Feed (`feed.ts`)
Human-facing timeline of events. Debate transcripts serve as the "feed" for agents.

### Crew Orchestration (`crew/`)
Planner→Worker→Reviewer DAG, wave execution, autonomous mode, task dependency graph, review cycles. All of this is handled by L7 (Schema Orchestration via Archon). The harness already has a workflow engine with loop nodes, approval gates, and worktree isolation.

### Swarm (`swarm` actions, `store.ts` claim/complete)
Task claiming with file-based locks. L7's Archon workflows handle task assignment and state tracking.

### Crew Skills (`crew/skills/`)
On-demand skill loading for workers. The harness has its own skill system via `.pi/skills/`.

### Human as Participant
Interactive pi session as a peer agent. Not needed — debates are agent-to-agent.

### Message Budgets (per-coordination-level)
`{ none: 0, minimal: 2, moderate: 5, chatty: 10 }`. Replaced by ConsensusBudget which is per-debate, not per-coordination-level.

## Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   HARNESS PIPELINE (L7)                   │
│                                                           │
│  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐             │
│  │  L1  │   │  L2  │   │  L3  │   │  L4  │   ...       │
│  │ Spec │   │ Plan │   │ Exec │   │Critic│              │
│  └──┬───┘   └──┬───┘   └──────┘   └──┬───┘             │
│     │          │                      │                  │
│     │  spawns  │  spawns              │  spawns          │
│     ▼          ▼                      ▼                  │
│  ┌──────────────────────────────────────┐              │
│  │     CONSENSUS PROTOCOL LAYER         │              │
│  │  DebateSession, ConsensusBudget,     │              │
│  │  Turn protocol, Convergence detect   │              │
│  └──────────┬───────────────────────────┘              │
│             │                                            │
│             ▼                                            │
│  ┌──────────────────────────────────────┐              │
│  │   pi-messenger TRANSPORT LAYER       │              │
│  │  Registry, Inboxes, fs.watch,        │              │
│  │  Atomic writes, Stale cleanup         │              │
│  └──────────┬───────────────────────────┘              │
│             │                                            │
│             ▼                                            │
│     .pi/messenger/registry/                              │
│     .pi/messenger/inbox/<agent>/                         │
│     .pi/messenger/debates/<debate-id>/                   │
└─────────────────────────────────────────────────────────┘
```

## Key Differences from pi-messenger's Crew

| Aspect | pi-messenger Crew | Harness Consensus |
|--------|-------------------|-------------------|
| **Orchestration** | Built-in DAG executor | L7 (Archon) handles orchestration |
| **Purpose** | Execute coding tasks in parallel | Debate design decisions |
| **Agent roles** | Planner, Worker, Reviewer | Attacker, Defender (per debate) |
| **Outcome** | Code changes + review verdict (SHIP/NEEDS_WORK) | Consensus verdict (CONSENSUS/DEADLOCK/BUDGET_EXHAUSTED) |
| **Parallelism** | Workers run in parallel waves | Debate is turn-based (sequential rounds) |
| **Persistence** | Crew state files, planning-progress.md | Debate transcripts stored as wiki artifacts |
| **Model routing** | Config per role (planner/worker/reviewer) | Per-debate model selection (both sides can differ) |

## Files We Will Adapt

| pi-messenger file | Harness equivalent | Changes |
|-------------------|-------------------|---------|
| `store.ts` (registry, inbox, messaging) | `lib/harness-messenger.ts` | Strip swarm, feed, reservations; keep registry + inbox + messaging |
| `lib.ts` (types, status) | `lib/harness-schemas.ts` | Keep AgentRegistration, AgentMailMessage; add DebateMessage |
| `handlers.ts` (join/leave/send/list) | `lib/harness-messenger.ts` | Keep join/leave/send; strip overlay actions, swarm, crew |
| — | `lib/harness-debate.ts` | NEW: DebateSession, ConsensusBudget, convergence, verdict |
| `crew/state*.ts` | — | STRIP entirely |
| `feed.ts` | — | STRIP entirely |
| `overlay*.ts` | — | STRIP entirely |
| `config-overlay.ts` | — | STRIP entirely |

## Dependency

```json
// package.json
{
  "dependencies": {
    "pi-messenger": "^latest"
  }
}
```

We use pi-messenger as a library — import its transport primitives (registry, inbox, watcher) directly. We do NOT use its CLI, overlay, or crew features.

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| pi-messenger API breaks on update | Medium | Pin version; we only use stable file-based primitives |
| fs.watch reliability on different OS | Low | pi-messenger already handles macOS/Linux; WSL tested |
| Race conditions in multi-agent file ops | Low | pi-messenger has lock patterns; we add debate-level idempotency |
| Token cost of debates exceeds budget | Medium | Hard ConsensusBudget enforcement; debate is opt-in per layer |
| Debate quality varies with model quality | Medium | Model routing per debate; Haiku for spec critic, Sonnet for code critic |
