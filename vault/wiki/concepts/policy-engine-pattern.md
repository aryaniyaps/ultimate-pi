---
type: concept
title: "Policy Engine Pattern (Pre-Execution Gates)"
created: 2026-05-01
updated: 2026-05-01
status: developing
tags:
  - harness
  - policy
  - security
  - gemini-cli
related:
  - "[[harness-engineering-first-principles]]"
  - "[[gemini-cli-architecture]]"
sources:
  - "[[Source: Gemini CLI Changelogs]]"
  - "[[Source: Martin Fowler - Harness Engineering]]"
  - "[[Source: Augment - Harness Engineering for AI Coding Agents]]"

---# Policy Engine Pattern: Pre-Execution Gates

## What It Is

A Policy Engine is a harness component that enforces **deterministic pre-execution constraints** on agent tool calls. Unlike drift detection (post-hoc), policy gates fire _before_ a tool executes, rejecting calls that violate architectural invariants, security boundaries, or operational policies.

## Why It Matters

> "Telling an agent 'follow our coding standards' in a prompt is fundamentally different from wiring a linter that blocks the PR when standards are violated. The first approach relies on probabilistic compliance; the second enforces deterministic constraints."
> — [[Source: Augment - Harness Engineering for AI Coding Agents]]

Pre-execution gates prevent failures before they occur. Post-hoc drift detection catches them after. Both needed, but prevention is cheaper.

## Gemini CLI Implementation (v0.18+)

- **v0.18 (Nov 2025)**: Experimental policy engine. Fine-grained policy for tool calls.
- **v0.20**: Persistent "Always Allow" policies for tool executions
- **v0.24**: Default folder trust set to untrusted. Granular shell command allowlisting.
- **v0.30**: `--policy` flag for user-defined policies, strict seatbelt profiles
- **v0.31**: Project-level policies, MCP server wildcards, tool annotation matching
- **v0.38**: Context-aware persistent approvals for tool execution

## Policy Dimensions

1. **Tool-level**: Which tools can be used? Under what conditions?
2. **Path-level**: Which files/directories can be read? Written?
3. **Command-level**: Which shell commands are allowed? With what arguments?
4. **Network-level**: Which domains can be accessed? Ports?
5. **Context-level**: Policies that vary by project, user, or session state
6. **Temporal-level**: Time-of-day, session duration, rate limits

## Pre-Execution Gate Types (Augment PEV)

1. **Known tool check**: Is this a recognized tool in the registry?
2. **Argument validation**: Are the arguments valid for this tool?
3. **User approval check**: Does this action require user confirmation?
4. **Workspace boundary check**: Is the requested path inside the workspace?
5. **Plan alignment check**: Does this action match the approved plan?

## Ultimate-PI Current State

We have **post-hoc drift detection** (L2.5, L3, L4) but no pre-execution policy gates. Our drift detection catches violations after they occur; a policy engine would prevent them.

## Integration Path (P-F1)

Add as L2.7 (between L2 Structured Planning and L3 Grounding):

1. Define policy schema: tool allowlists, path restrictions, command policies, network policies
2. Implement policy evaluation engine that checks every tool call before execution
3. Add user approval flow for policy violations (override prompt)
4. Invert existing drift detection rules into policy rules where applicable
5. Add policy effectiveness metrics: false positive rate, blocked violations, agent retry success

## Relationship to Other Harness Primitives

- **Feedforward + Feedback**: Policy engine is feedforward (prevent). Drift detection is feedback (detect).
- **Computational > Inferential**: Policy engine should be computational (deterministic, fast).
- **Steering Loop**: When policy is too restrictive → false positives → human loosens. When too loose → drift → human tightens.
- **Keep Quality Left**: Policy engine runs before any tool execution — as far left as possible.
