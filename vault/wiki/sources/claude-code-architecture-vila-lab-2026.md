---
type: source
status: ingested
source_type: academic-paper
title: "Dive into Claude Code: The Design Space of Today's and Future AI Agent Systems"
author: "Jiacheng Liu, Xiaohan Zhao, Xinyi Shang, Zhiqiang Shen"
date_published: 2026-04-14
url: "https://arxiv.org/abs/2604.14228"
confidence: high
tags: [claude-code, agent-architecture, source-code-analysis, design-principles]
key_claims:
  - "Claude Code architecture centers on a simple while-loop with four surrounding subsystems"
  - "Five human values motivate the architecture: human decision authority, safety, reliable execution, capability amplification, contextual adaptability"
  - "Thirteen design principles trace from values to specific implementation choices"
  - "Core subsystems: permission system with ML classifier, five-layer compaction pipeline, four extensibility mechanisms, subagent delegation with worktree isolation"
  - "Comparison with OpenClaw reveals how same design questions produce different answers under different deployment contexts"
  - "Six open design directions identified for future agent systems"
created: 2026-05-02
updated: 2026-05-02
---
# Dive into Claude Code (VILA-Lab, 2026)

## Source Summary

Academic paper by researchers at VILA-Lab analyzing Claude Code's TypeScript source code (publicly available after accidental leak). Reverse-engineers the complete architecture from 510K+ lines of TypeScript. The most comprehensive architectural analysis of Claude Code available.

## Architecture Components

### Core Loop
The center is a simple `while`-loop: assemble context → call model → receive tool request → execute → repeat. Most of the 510K lines lives in systems around this loop, not in the loop itself.

### Five Human Values → 13 Design Principles
1. **Human Decision Authority**: Permission system, plan mode, manual approval gates
2. **Safety and Security**: ML-based auto classifier, sandboxing, permission modes
3. **Reliable Execution**: Compaction for long sessions, checkpointing, error recovery
4. **Capability Amplification**: MCP, subagents, skills, plugins
5. **Contextual Adaptability**: CLAUDE.md hierarchy, conditional rules, dynamic context loading

### Four Extensibility Mechanisms
1. **MCP** (Model Context Protocol): Open standard for tool connections. JSON-RPC 2.0, stdio and HTTP transports. Donated to Linux Foundation Dec 2025. Adopted by OpenAI, Google, GitHub, JetBrains.
2. **Plugins**: Distribution layer bundling skills + agents + hooks + MCP. 9,000+ ecosystem. Namespaced, versioned.
3. **Skills**: Progressive disclosure. Name+description at startup, full body on demand.
4. **Hooks**: Deterministic lifecycle events. Exit-code semantics for allow/deny.

### Comparison with OpenClaw
OpenClaw is a multi-channel personal assistant gateway. Same design questions, different answers due to different deployment context: per-action classification vs perimeter-level access control, single CLI loop vs embedded runtime in gateway control plane, context-window extensions vs gateway-wide capability registration.

## Six Open Design Directions
1. Cross-agent state sharing
2. Long-horizon task decomposition
3. Agent-to-agent negotiation protocols
4. Formal verification of agent safety
5. Energy-aware scheduling
6. Multi-modal grounding in software engineering

## Relevance to Our Harness

This paper provides the foundational framework for understanding Claude Code as a harness architecture. The "five human values → 13 design principles → implementation choices" methodology is directly applicable to our own harness design documentation. The comparison with OpenClaw validates our multi-source research approach (Cursor vs Antigravity vs Claude Code — different deployment contexts surface different design answers).

## Key Quotes

> "The core of the system is a simple while-loop that calls the model, runs tools, and repeats. Most of the code, however, lives in the systems around this loop."

> "Our analysis identifies five human values, philosophies, and needs that motivate the architecture and traces them through thirteen design principles to specific implementation choices."
