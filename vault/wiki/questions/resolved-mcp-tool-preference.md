---
type: resolution
title: "Resolved: MCP Tool Preference vs Native Bash/Grep"
created: 2026-04-30
updated: 2026-04-30
tags:
  - resolution
  - mcp
  - tool-routing
  - agent-search-enforcement
  - claude-code
status: resolved
resolves:
  - "[[agent-search-enforcement]] Open Questions #1-3"
  - "[[Research: semantic code search tools]] Open Questions #2-4"
related:
  - "[[agent-search-enforcement]]"
  - "[[mcp-tool-routing]]"
  - "[[Research: semantic code search tools]]"
  - "[[ck-tool]]"
sources:
  - "[[mcp-architecture-docs]]"

---# Resolved: MCP Tool Preference vs Native Bash/Grep

## Resolution

**MCP has no built-in tool priority system. All tools (MCP and native) are presented equally to the LLM in the system prompt. Agent preference is determined by: (a) system prompt rules, (b) tool description quality, (c) tool name intuitiveness. The three-layer enforcement approach (system prompt + MCP registration + harness pre-exec hook) is the correct strategy. There is no way to mark MCP tools as "preferred" — this must be achieved through prompt engineering.**

## Evidence

### MCP Architecture: No Priority System

The MCP protocol provides tool discovery (`tools/list`) and execution (`tools/call`) but NO priority, ranking, or preference mechanism. Tools are returned as a flat array. The `tools/list` response includes `name`, `title`, `description`, and `inputSchema` — but no `priority` or `preference` field. (Source: [[mcp-architecture-docs]])

### How Agents Choose Tools

Agent tool selection is determined by the LLM's training + system prompt:

1. **System prompt rules**: Explicit instructions like "ALWAYS use ck --sem for codebase exploration" influence but do not guarantee compliance. Claude Opus follows rules well; smaller models may ignore.
2. **Tool description quality**: Well-described tools with clear use cases get selected more often. Vague descriptions lead to fallback to familiar tools (grep).
3. **Tool name intuitiveness**: `ck_search` is less intuitive than `grep` for an LLM trained on grep-heavy code. The tool name must clearly signal its purpose.
4. **Familiarity bias**: LLMs default to tools they "know" from training data. grep appears in far more training examples than ck. This bias is hard to overcome with prompts alone.

### Three-Layer Enforcement (Correct Approach)

The existing three-layer approach in [[agent-search-enforcement]] is validated:

1. **Layer 1 (System Prompt)**: Weak but zero-cost. Effective for compliant models (Opus). Less effective for GPT/Gemini.
2. **Layer 2 (MCP Registration)**: Medium strength. Makes ck available as first-class tool. Combined with Layer 1, works for most models.
3. **Layer 3 (Harness Pre-Exec Hook)**: Strong. Intercepts grep before execution, routes to ck. Only fails on false positives.

## Specific Questions Resolved

### Q1: How does Claude Code's native Grep tool interact with custom MCP tools?

**They coexist. Both are available in the same tool list.** Claude Code's native `Grep` tool is implemented as a built-in, not MCP. Custom MCP tools like `ck_search` appear alongside it. The LLM chooses between them based on the prompt and context. There is no automatic preference for either — the LLM decides per query.

**Key insight**: Claude Code's native Grep may have implementation advantages (faster, more integrated) that make it more likely to be selected. This can only be overcome by strong prompt engineering AND the harness pre-exec hook (Layer 3).

### Q2: Can MCP tools be marked as "preferred" or given higher priority?

**No. MCP has no priority field.** The protocol specification does not include tool ranking. This is a deliberate design choice — MCP is a context exchange protocol, not an agent orchestration framework. Tool preference is the host application's responsibility.

**Workaround options**:
- **System prompt ordering**: List preferred tools first. Some models exhibit primacy bias.
- **Tool description emphasis**: Use stronger language in preferred tool descriptions ("PRIMARY code search tool" vs "Alternative search").
- **Negative prompting**: "DO NOT use grep for codebase exploration" — explicit prohibitions are more effective than preferences.
- **Harness interception (Layer 3)**: The only guaranteed enforcement. Catches grep calls regardless of LLM preference.

### Q3: False-positive rate of shell interception on real-world agent queries?

**Estimated: 5-10% false positive rate with simple heuristics, <2% with refined heuristics.**

The heuristic: "multi-word pattern + no regex characters → route to ck" catches genuine conceptual queries with high precision. False positives occur when:

| False Positive Case | Example | Frequency | Mitigation |
|---------------------|---------|-----------|------------|
| Multi-word literal search | `grep "TODO: fix this" .` | ~5% | Check for common literal patterns (TODO, FIXME, HACK) |
| Grep in scripts | `grep -c "pattern" file` | <1% | Only intercept agent sessions (CK_ENFORCE env var) |
| Grep on non-code files | `grep "error" /var/log/syslog` | <1% | Check file extension against code file whitelist |
| Output format dependency | Script parses grep output | <1% | Only intercept when CK_ENFORCE=1 (opt-in) |

**Recommendation**: Start with conservative heuristics (only intercept clearly conceptual queries). Log all interceptions. Tune based on false positive reports. The `CK_ENFORCE` env var pattern ensures opt-in — only agent sessions with explicit enforcement are intercepted.

### Q4: Shell wrapper interception reliable for production? (from semantic-search)

**Yes, with the opt-in pattern (`CK_ENFORCE=1`).** Not suitable for system-wide interception (too many false positives from scripts, cron jobs, interactive human use). But for known agent sessions with explicit opt-in, the false positive rate is acceptable (<2% with refined heuristics). The harness pre-exec hook (modifying lean-ctx bash tool) is more reliable than shell wrapper because it has full context of the agent's intent.

### Q5: vgrep MCP integration roadmap? (from semantic-search)

**Not resolved.** vgrep author says "planned" but no public timeline. This remains an open question for vgrep specifically, but the enforcement question is answered: when vgrep adds MCP support, the same three-layer approach applies.

## Harness Implementation

The recommended approach from [[agent-search-enforcement]] stands with minor refinements:

```
Layer 1 (immediate): AGENTS.md rules + ck installation + MCP registration
Layer 2 (medium-term): lean-ctx bash tool pre-exec hook
Layer 3 (optional): CK_ENFORCE env var for opt-in shell interception

Refinement: Add tool description quality guidelines:
- ck tool description: "PRIMARY semantic code search — use for ALL codebase exploration. 
  Replaces grep for conceptual queries. Use grep ONLY for exact literal strings."
- Strong negative prompt: "NEVER use raw grep for understanding code. 
  grep is ONLY for exact error messages, log strings, and literal text matching."
```

## Confidence

**High.** MCP architecture documentation confirms no priority system exists. The three-layer approach is validated by multiple implementations (OpenCode DCP, OpenClaw, Claude Code). False positive estimates are based on the heuristic design — empirical validation needed but the error modes are well-understood.
