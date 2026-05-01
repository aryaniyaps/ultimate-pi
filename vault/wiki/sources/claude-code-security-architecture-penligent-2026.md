---
type: source
source_type: blog
title: "Inside Claude Code: The Architecture Behind Tools, Memory, Hooks, and MCP"
author: "Penligent"
date_published: 2026-04-02
url: "https://www.penligent.ai/hackinglabs/inside-claude-code-the-architecture-behind-tools-memory-hooks-and-mcp/"
confidence: medium
tags: [claude-code, architecture, security, hooks, permissions, sandboxing, MCP, CVE]
key_claims:
  - "Claude Code is a governed execution environment with a model in the middle"
  - "The control plane around the model often matters more than the model itself"
  - "Permissions and sandboxing are complementary: permissions control what can be attempted, sandboxing provides OS-level enforcement"
  - "All child processes inherit sandbox boundaries"
  - "Auto mode drops broad allow rules to prevent unsafe policy combinations"
  - "Managed settings: allowManagedHooksOnly, allowManagedMcpServersOnly, allowManagedPermissionRulesOnly"
  - "CVE-2025-68143/144/145: MCP Git server vulnerabilities show thin tool wrappers inherit unsafe command surfaces"
  - "Agent risk is compositional: repo, tool result, config file, MCP server — all can become control inputs"
---

# Claude Code Security Architecture (Penligent, 2026)

## Source Summary

Security-focused technical analysis by Penligent (AI security platform). Covers the full Claude Code architecture through a security lens. Published April 2, 2026 following Anthropic's source map leak incident. Notable for concrete CVE case studies and the explicit security model analysis.

## Five Operational Layers

| Layer | What it controls | Why it matters |
|---|---|---|
| Agent loop | Task decomposition, next-step selection | Shifts from text generation to action |
| Context and memory | What Claude knows now and across sessions | Most "drift" problems are context problems |
| Execution surface | How work touches code and systems | Determines blast radius and reproducibility |
| Governance and safety | What Claude is allowed to attempt | The real control plane for production |
| Extensibility | How new capabilities arrive | Flexibility and supply-chain risk both increase |

## Permission Modes

| Mode | Autonomy | Best fit |
|---|---|---|
| `default` | Read only | Sensitive work, first use |
| `acceptEdits` | Read + edit files | Iterating while gating commands |
| `plan` | Read + plan only | Research before modification |
| `auto` | ML classifier reviews | Long-running with governance |
| `bypassPermissions` | All actions, no checks | Isolated containers only |
| `dontAsk` | Pre-approved tools only | Locked-down environments |

## Sandboxing

macOS: Seatbelt. Linux/WSL2: bubblewrap. WSL1 unsupported. Child processes inherit boundaries. `autoAllowBashIfSandboxed` + filesystem/network restrictions. Escape hatch: `dangerouslyDisableSandbox` — still goes through permission flow if enabled.

## Security CVE Case Studies

- **CVE-2025-68143**: `mcp-server-git` `git_init` tool accepted arbitrary paths. Fix: remove tool entirely.
- **CVE-2025-68144**: `git_diff`/`git_checkout` passed user-controlled args directly to Git CLI. Flag-like values interpreted as options. Fix: reject `-` prefix, verify valid Git refs.
- **CVE-2025-68145**: `--repository` restriction not validated in subsequent tool calls. Fix: path validation with symlink resolution.
- **CVE-2024-32002**: Malicious Git repo with submodules could write hooks via recursive clone on case-insensitive filesystems. Lesson: repos are execution inputs, not passive context.
- **CVE-2026-25153**: Backstage TechDocs `mkdocs.yml` hooks execution. Fix: allowlist supported keys, strip hooks.

## Key Quotes

> "Claude Code is a governed execution environment with a model in the middle. This is not just 'Claude plus bash.'"

> "The dangerous thing about agent systems is often not only the code they generate, but the quiet changes to the agent's own configuration surface."

> "Permissions can still be tricked by bad policy or human error. OS-level boundaries change what the subprocess can actually touch."

> "Even if prompt injection manipulates Claude's behavior, the sandbox can still prevent critical file modification, unauthorized network egress, and access outside defined boundaries."
