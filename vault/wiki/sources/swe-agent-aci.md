---
type: source
source_type: paper
title: "SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"
author: "John Yang, Carlos E. Jimenez, Alexander Wettig, Kilian Lieret, Shunyu Yao, Karthik Narasimhan, Ofir Press"
date_published: 2024-05-06
url: "https://arxiv.org/abs/2405.15793"
confidence: high
key_claims:
  - "LM agents are a new category of end users needing specially-built interfaces (ACI)"
  - "ACI design significantly affects agent performance on software engineering tasks"
  - "SWE-agent's ACI enables agents to create/edit files, navigate repositories, and execute tests"
  - "Achieved 12.5% on SWE-bench and 87.7% on HumanEvalFix at pass@1"
  - "Interface design choices (how information is presented, what actions are available) impact agent behavior"
status: ingested
tags:
  - agent-computer-interface
  - swe-bench
  - agent-architecture
  - software-engineering
created: 2024-05-06
updated: 2026-04-30

---# SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering

Introduces the concept of Agent-Computer Interfaces (ACI) — designing human-computer interfaces specifically for language model agents rather than humans.

## Key Insight

Just as humans benefit from IDEs with syntax highlighting, code navigation, and debugging tools, LM agents need interfaces designed for their perceptual and cognitive constraints. The ACI concept reframes tool design: agents aren't humans, they process information differently, and the interface must match their capabilities.

## ACI Design Principles

- Present information in formats agents can parse efficiently (concise, structured)
- Provide actions that match agent reasoning patterns
- Minimize context window consumption per action
- Enable repository-wide navigation without loading entire files
- Support execution feedback loops (run tests, see output, iterate)

## Relevance to Codebase Exploration

The ACI concept directly challenges the OSS guide's assumptions: humans learn by using the project, reading tests, and gradual immersion. Agents need structured, compressed views — repo maps, AST summaries, dependency graphs — that feed their context windows efficiently.
