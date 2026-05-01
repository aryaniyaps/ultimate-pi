---
type: synthesis
title: "Research: Claude Code State-of-the-Art Harness Improvements"
created: 2026-05-01
updated: 2026-05-01
tags:
  - research
  - claude-code
  - harness-design
  - first-principles
  - agent-architecture
status: developing
related:
  - "[[harness-implementation-plan]]"
  - "[[model-adaptive-harness]]"
  - "[[agentic-harness]]"
  - "[[cursor-harness-innovations]]"
  - "[[Research: cursor.sh Harness Innovations]]"
  - "[[Research: Google Antigravity Harness Integration]]"
  - "[[provider-native-prompting]]"
  - "[[harness-configuration-layers]]"
  - "[[feedforward-feedback-harness]]"
  - "[[self-evolving-harness]]"
sources:
  - "[[claude-code-architecture-vila-lab-2026]]"
  - "[[claude-code-architecture-qubytes-2026]]"
  - "[[claude-code-architecture-karaxai-2026]]"
  - "[[claude-code-security-architecture-penligent-2026]]"
---

# Research: Claude Code State-of-the-Art Harness Improvements

## Overview

Claude Code (Anthropic) is the most architecturally sophisticated agentic coding system in production. Research across 4 primary sources — an academic paper (VILA-Lab, arxiv 2604.14228), a security-focused architecture deep-dive (Penligent), a systems-level walkthrough (KaraxAI), and a five-layer architecture breakdown (Qubytes) — reveals innovations that fundamentally challenge assumptions in our current harness design. Claude Code's architecture was reverse-engineered from a leaked 510K-line TypeScript codebase, revealing a system far more sophisticated than public documentation suggests.

## Key Findings

### Architecture Philosophy

- **Agent Loop > Fixed Pipeline** (Source: [[claude-code-architecture-vila-lab-2026]]): Claude Code is a `while` loop surrounded by infrastructure — not a sequential pipeline. "The core agent loop — assemble context, call model, receive tool request, execute it, repeat — is conceptually simple. The real engineering genius lives in everything around that loop." Our 8-layer pipeline is sequential; Claude Code's loop is reactive.
- **System, not chatbot** (Source: [[claude-code-security-architecture-penligent-2026]]): "Claude Code is a governed execution environment with a model in the middle. This is not just 'Claude plus bash.'"
- **Five human values → 13 design principles** (Source: [[claude-code-architecture-vila-lab-2026]]): Human decision authority, safety/security, reliable execution, capability amplification, contextual adaptability. Each value traces through specific implementation choices.
- **Independent validation of First Principle #1** (Source: [[claude-code-architecture-karaxai-2026]]): "The model is the commodity; the agent is the product." Directly validates our FP #1: "The harness — not the model — determines reliability at scale."

### 1. Five-Layer Compaction Pipeline

The most underappreciated Claude Code innovation. Not simple truncation — structured extraction followed by selective reconstruction:

- Forked subagent produces ~6,500 token structured summary tuned specifically for software engineering tasks
- Preserves: file paths, code snippets, error histories, active skills, plan state, tool deltas
- Triggered at ~83.5% of 200K context window
- Compaction instructions embedded in CLAUDE.md for domain-specific preservation
- PreCompact/PostCompact hooks for archiving full transcripts before compression
- ~85% payload reduction (167K → ~25K tokens)

**Our gap**: P3-P4 has basic context pruning (rule-based stuck-pattern detection, correction injection). Nothing like structured multi-layer compaction with forked subagent. **This is the single biggest gap in our harness design.**

### 2. Lifecycle Hook System (Deterministic Policy)

The most architecturally novel feature. 30+ hook events spanning full lifecycle, each with JSON input/output contracts:

| Hook Event | When Fires | Control |
|---|---|---|
| `PreToolUse` | Before tool execution | Allow/deny/ask/defer, modify input |
| `PostToolUse` | After tool succeeds | Audit, auto-format, replace output |
| `PostToolUseFailure` | After tool fails | Inject correction context |
| `PostToolBatch` | After parallel tool batch | Batch-level context injection |
| `PermissionRequest` | When permission dialog appears | Programmatic allow/deny |
| `Stop` / `SubagentStop` | When agent finishes | Prevent stopping, re-invoke |
| `UserPromptSubmit` | Before prompt processed | Block, inject context |
| `SessionStart` / `SessionEnd` | Session lifecycle | Load context, cleanup |
| `PreCompact` / `PostCompact` | Before/after compaction | Archive, block |
| `SubagentStart` / `SubagentStop` | Subagent lifecycle | Inject context, validate output |
| `TaskCreated` / `TaskCompleted` | Task lifecycle | Enforce naming, validate completion |
| `ConfigChange` | Config files modified | Audit, block unauthorized changes |
| `CwdChanged` / `FileChanged` | Directory/file changes | Reactive env management |
| `WorktreeCreate` / `WorktreeRemove` | Isolation lifecycle | Custom VCS integration |
| `Notification` | System notifications | Forward to external services |

Five hook types: **command** (shell script, exit codes), **HTTP** (webhook), **MCP tool** (call MCP server), **prompt** (single-turn LLM evaluation), **agent** (multi-turn subagent with tool access).

Critical distinction: **CLAUDE.md achieves ~92% compliance. Hooks achieve 100% compliance** for conditions they match. This is the deterministic escape hatch from probabilistic prompt-based control.

Exit code semantics: `0` = success (allow), `2` = blocking error (deny, stderr fed to Claude), other = non-blocking error (continue execution).

**Our gap**: Our harness has extension hooks at the layer level (`extensions/harness-*.ts`). But we lack tool-level lifecycle hooks with deterministic exit-code semantics. This is a fundamental architectural gap.

### 3. Permission System as Architectural Subsystem

Claude Code treats permission checking as architecturally separate from tool execution — a first-class subsystem sitting between the agent loop and tool execution:

- **7 permission modes**: `default` (read-only), `acceptEdits` (auto-approve edits + safe fs ops), `plan` (read-only exploration + plan writing), `auto` (ML classifier reviews every action), `dontAsk` (only pre-approved tools), `bypassPermissions` (no checks, isolated environments only)
- **ML-based auto classifier**: Separate model reviews each action in auto mode. Blocks actions that go beyond task, target untrusted infrastructure, or appear driven by prompt injection. Auto mode drops broad allow rules that would short-circuit the classifier.
- **Rule syntax** (`allow`/`deny`/`ask`): First matching rule wins. `Tool` or `Tool(specifier)` patterns. Same rule language reused across hooks, CLI automation, and settings.
- **Four configuration scopes**: Managed (org-controlled), User (`~/.claude/`), Project (`.claude/`, Git-shared), Local (`.claude/settings.local.json`, gitignored). Managed settings can enforce `allowManagedHooksOnly`, `allowManagedMcpServersOnly`, `allowManagedPermissionRulesOnly`.

**Our gap**: We have NO permission system. L7 orchestration enforces pipeline stages but does not gate individual tool calls. This is a major architectural gap for any production deployment.

### 4. Subagent Architecture with Deep Isolation

- **Fresh 200K context window per subagent**: Only final summary returns to parent. All intermediate tool calls, file reads, and reasoning stay isolated.
- **Worktree isolation**: `isolation: worktree` gives subagent a temporary Git worktree — isolated filesystem copy. Enables parallel editing without conflicts. Blast-radius control.
- **Tool allowlists/denylists per subagent**: Security-review subagent gets Read+Grep+Glob but no Edit/Write. Different subagents get different capability surfaces.
- **No nesting**: One level of subagent spawning only — prevents infinite recursion.
- **Sidechain transcripts**: Subagent interactions captured in separate transcripts, keeping main thread clean.
- **Custom subagents in YAML**: Defined in `.claude/agents/` or `~/.claude/agents/`. Configurable: tools, model, permission mode, persistent memory, isolation settings.

**Our gap**: P25 subagent router is cost-based dispatch without worktree isolation. No sidechain transcripts. No per-subagent tool restrictions. No custom subagent definitions in config files.

### 5. CLAUDE.md Hierarchical System

Not a single file — a layered system with additive precedence:

```
Global (~/.claude/CLAUDE.md) → Enterprise (managed) → Project (.claude/CLAUDE.md) → Local (.claude/CLAUDE.local.md) → Notebook
```

- **Conditional rules**: YAML frontmatter with `match: "*.test.ts"` or `paths: ["src/api/**"]`. Rules only load when relevant files are accessed.
- **96% compliance** with 5 conditional rule files of 30 lines each, vs 92% for single 150-line CLAUDE.md
- **Injected as `<system-reminder>` tags**: Wrapped in XML, re-sent every API call (not cached in system prompt). Survives compaction because re-read from disk every turn.
- **Three memory systems**: CLAUDE.md (reliable, user-controlled), Auto-memory (lossy, 200-line limit, Claude-maintained), Session memory (lossy, conversation history gets compacted)

**Our gap**: Our wiki pages serve a similar role but lack the single-entry-point, additive-hierarchy, conditional-loading design. SKILL.md files cover some of this but differently (loaded on invocation, not always-present). No conditional rule matching.

### 6. Skills with Progressive Disclosure

- **Name + description loaded at startup** (~100 tokens per skill). Listed in `<available_skills>` block.
- **Full SKILL.md body loaded on-demand** via Skill tool call. Only when invoked by user or Claude.
- **Skills can restrict tools** (`allowed-tools`), include supporting files, spawn subagents.
- **Distinct from slash commands**: Skills are model-invoked (or user `/skill-name`). Slash commands (`/clear`, `/compact`) are deterministic CLI operations.

**Our gap**: Our skills load full SKILL.md content always. We partially implement progressive disclosure through the `description` field, but don't have the on-demand loading mechanism.

### 7. Plugin Ecosystem

- **9,000+ plugins** across registries. Official Anthropic marketplace ships built-in.
- **Bundles**: Skills + agents + hooks + MCP servers as a single installable unit.
- **Namespacing**: `/my-plugin:hello` prevents skill name conflicts.
- **Agent override**: Plugin can replace main agent's system prompt, tool restrictions, model selection.
- **Plugin subagents** cannot use `hooks`, `mcpServers`, or `permissionMode` — security boundary.

**Our gap**: No plugin distribution layer. Our skills are project-local. Not critical for CLI harness but limits ecosystem growth.

### 8. Agentic Search (No Embeddings)

Claude Code deliberately rejects vector embeddings for code search:

- **Glob → Grep → Read** hierarchy: File path pattern matching → content search via ripgrep → full file load
- **"Agentic search generally works better"** than RAG (Boris Cherny, Claude Code creator)
- Rationale: Code symbols are exact (`getUserById` ≠ `fetchAccountDetails`), indexes drift during active editing, embeddings leak code information as vectors, zero setup friction
- **Explore subagent** (Haiku) for deep exploration — searches, reads, reasons, returns only summary

**Our gap**: P13 (Semantic Code Search via ck MCP) is explicitly embeddings-based. This represents a fundamental design philosophy difference that we should reconsider.

### 9. Sandboxing (OS-Level Enforcement)

- **Seatbelt** (macOS) / **bubblewrap** (Linux/WSL2) for Bash tool
- `autoAllowBashIfSandboxed`: auto-approve commands that can run sandboxed
- Filesystem: `allowWrite`, `denyWrite`, `denyRead` paths
- Network: `allowedDomains` restrictions
- Child processes inherit sandbox boundaries
- "Even if prompt injection manipulates Claude's behavior, the sandbox can still prevent critical file modification"

**Our gap**: No sandbox subsystem. Relies on L7 orchestration for blast-radius control.

### 10. Session Storage & Checkpointing

- **Append-oriented session transcripts**: Full conversation history stored as JSONL
- **Resume, fork, rewind**: Continue old sessions, branch into different approaches, replay edits
- **Checkpoint system**: Snapshots file state before every edit, persists across sessions. Can restore code AND conversation. Separate from compaction.
- **Bash-driven modifications**: Not tracked by edit-tool checkpoint rewind — explicitly documented limitation

**Our gap**: Wiki-based state (L6) is not transactional session storage. No checkpoint/rewind capability. No session forking.

## Key Entities

- **[[Claude Code]]**: Anthropic's agentic coding CLI tool. 82,000+ GitHub stars, handles millions of coding sessions. Architecture reverse-engineered from 510K-line TypeScript codebase.
- **[[VILA-Lab]]**: Academic research group (Jiacheng Liu, Xiaohan Zhao, Xinyi Shang, Zhiqiang Shen) that published the most comprehensive Claude Code architecture analysis (arxiv 2604.14228).
- **[[Boris Cherny]]**: Claude Code creator. Confirmed the deliberate rejection of vector embeddings for code search.

## Key Concepts

- **[[structured-compaction]]**: Five-layer compaction pipeline with forked subagent producing structured summaries for software engineering contexts. ~6,500 tokens, selective preservation.
- **[[lifecycle-hooks]]**: 30+ deterministic hook events spanning full agent lifecycle. Exit-code semantics for blocking (2) vs non-blocking. Five hook types including LLM-based evaluation.
- **[[permission-subsystem]]**: ML-classified permission checking as architecturally separate layer. 7 modes, 4 scopes, composable rule language.
- **[[subagent-worktree-isolation]]**: Fresh context window + isolated Git worktree per subagent. Sidechain transcripts. Tool allowlists/denylists.
- **[[additive-config-hierarchy]]**: CLAUDE.md layered system with conditional YAML frontmatter. 96% compliance from structured small files vs 92% from single large file.
- **[[progressive-skill-disclosure]]**: Skills load name+description (100 tokens) at startup, full body on-demand via tool call.
- **[[agentic-search-no-embeddings]]**: Glob → Grep → Read hierarchy. Deliberate rejection of vector embeddings for code search.
- **[[sandbox-os-enforcement]]**: Seatbelt/bubblewrap OS-level boundaries beyond permission checks.

## Contradictions

- **Embeddings vs Agentic Search**: Our P13 invests in semantic code search via ck MCP (embeddings-based). Claude Code's creator states "agentic search generally works better." This is a design philosophy tension, not a clear-cut right/wrong. For exact symbol matching (code search), agentic search is likely superior. For conceptual queries ("find auth logic"), embeddings may help. Recommendation: Benchmark both approaches before committing to P13 implementation.
- **Pipeline vs Loop**: Our 8-layer pipeline is sequential and mandatory. Claude Code's loop is reactive and flexible. The pipeline model guarantees quality enforcement (L1-L4) but the loop model enables more dynamic task handling. This tension should be resolved by keeping L1-L4 as quality gates but making L7 orchestration a loop-orchestrator rather than a fixed DAG.

## Open Questions

- Can the five-layer compaction pipeline work for 200K-token max context (our target) vs Claude Code's 200K? Our smaller context window means compaction triggers earlier — the tradeoffs change.
- Should we adopt tool-level hooks as a replacement for our layer-level extension hooks, or as a complement? The exit-code semantics of Claude Code hooks are elegant but our TypeScript extension hooks offer richer integration with our pipeline.
- Is the permission subsystem necessary for a CLI-level harness? Claude Code is a consumer product with enterprise deployments. Our harness is developer-facing. The permission model may be overengineered for our use case.
- Can we adopt agentic search (Glob→Grep→Read) without abandoning semantic search? Perhaps a hybrid: agentic search as primary, embeddings as fallback for conceptual queries.
- How much of the plugin ecosystem should we replicate? Namespaced skill distribution is valuable. Agent override is powerful. But 9,000+ plugins is a network-effect problem — not solvable by architecture alone.

## Sources
- [[claude-code-architecture-vila-lab-2026]]: Liu et al., arxiv 2604.14228, April 2026. Academic paper analyzing Claude Code source code. Five human values, 13 design principles, architecture comparison with OpenClaw.
- [[claude-code-architecture-qubytes-2026]]: Vijendra, "Inside Claude Code: The Architecture That Makes AI Actually Do the Work," April 2026. Five-layer architecture breakdown: agent loop, permissions, tools, state, compaction.
- [[claude-code-architecture-karaxai-2026]]: KaraxAI, "How Claude Code Actually Works: A Systems-Level Deep Dive," March 2026. Full stack: CLAUDE.md, agent loop, skills, plugins, MCP, subagents, hooks, context compression.
- [[claude-code-security-architecture-penligent-2026]]: Penligent, "Inside Claude Code: The Architecture Behind Tools, Memory, Hooks, and MCP," April 2026. Security-focused technical analysis. Permission modes, sandboxing, CVE case studies, enterprise governance.
