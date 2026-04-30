---
type: source
source_type: paper
title: "OpenHands: An Open Platform for AI Software Developers as Generalist Agents"
author: "Xingyao Wang et al."
date_published: 2024-07-24
url: "https://arxiv.org/abs/2407.16741"
confidence: high
key_claims:
  - "Platform for AI agents that interact like human developers: write code, use CLI, browse web"
  - "Supports sandboxed code execution, multi-agent coordination, and evaluation benchmarks"
  - "Evaluated on 15+ tasks including SWE-bench and WebArena"
  - "Community project with 2.1K+ contributions from 188+ contributors"
  - "Accepted at ICLR 2025"
status: ingested
tags:
  - agent-platform
  - sandbox
  - multi-agent
created: 2024-07-24
updated: 2026-04-30
---

# OpenHands: An Open Platform for AI Software Developers as Generalist Agents

A platform that provides the infrastructure for AI agents to interact with codebases through the same interfaces humans use: writing code, executing commands, and browsing the web.

## Agent-Codebase Interaction Model

OpenHands treats the agent as a developer who:
- Reads files via commands
- Writes and edits code
- Executes code in sandboxed environments
- Browses documentation and search results

This model mirrors the OSS guide's human workflow but automates it. The platform handles the infrastructure so researchers can focus on agent strategies.

## Relevance

OpenHands embodies the "ACI" concept from SWE-agent at platform scale. It shows that the human-centric OSS guide workflow (read, search, edit, test, iterate) maps directly to agent workflows — but agents need the infrastructure to execute these steps reliably.
