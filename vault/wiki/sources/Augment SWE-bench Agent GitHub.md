---
type: source
status: ingested
source_type: github-repository
author: Augment Code
date_published: 2025
url: https://github.com/augmentcode/augment-swebench-agent
confidence: high
key_claims:
  - "65.4% success rate on first SWE-bench Verified submission"
  - "#1 open-source SWE-bench Verified implementation"
  - "Uses Claude Sonnet 3.7 as core driver + OpenAI o1 as ensembler"
  - "Forked agent system architecture from Anthropic's SWE-bench blog post"
  - "Majority vote ensembler for selecting best solution from candidates"
  - "Supports parallel execution via sharding across machines"
  - "870 stars, 154 forks"
tags:
  - swe-bench
  - augment-code
  - coding-agent
  - open-source
  - claude
created: 2026-05-02
updated: 2026-05-02

---# Augment SWE-bench Verified Agent (GitHub)

## Summary

Open-source implementation of Augment Code's SWE-bench agent. Achieved 65.4% on SWE-bench Verified, the #1 open-source implementation. Combines Claude Sonnet 3.7 for core reasoning with OpenAI o1 for solution ensembling.

## Architecture

### High-Level Component Structure

| Layer | Components | Purpose |
|-------|-----------|---------|
| Entry Points | cli.py, run_agent_on_swebench_problem.py | User interfaces |
| Agent Core | tools/agent.py, utils/common.py | Orchestration and dialog management |
| LLM Integration | utils/llm_client.py | Abstracted LLM communication |
| Tool Ecosystem | tools/*.py | Executable agent capabilities |
| Infrastructure | utils/docker_utils.py, workspace_manager.py | Environment management |
| Ensembling | majority_vote_ensembler.py | Solution selection |

### Key Tools
- **BashTool**: Command execution in workspace.
- **StrReplaceTool**: File content manipulation and editing.
- **SequentialThinkingTool**: Complex reasoning and problem decomposition.
- **CompleteTool**: Task completion and result finalization.

### Technology Stack
- Python 3.x, Docker, uv (package management)
- Anthropic Claude Sonnet 3.7 (core agent)
- OpenAI o1-2024-12-17 (ensembling)
- SWE-bench evaluation harness

## Execution Modes

### Interactive Mode (cli.py)
- Personal coding assistant.
- Single agent instance.
- Session-based interaction.

### SWE-bench Mode (run_agent_on_swebench_problem.py)
- Automated benchmark evaluation.
- Multiple parallel processes (8 per machine recommended).
- Sharding across machines (80 parallel agents in their setup).
- Majority vote ensembling post-generation.

## Majority Vote Ensembler
- Takes multiple candidate solutions per problem.
- Presents all candidates to OpenAI o1.
- o1 analyzes and selects the most common/best solution.
- Parallel processing with configurable worker threads.
