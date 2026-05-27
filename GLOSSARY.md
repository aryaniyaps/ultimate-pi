# Glossary

This file defines the repo specific terms used across the README, harness docs, agents, and scripts. The goal is simple language with exact meaning.

## Core Platform Terms

| Term | Simple meaning | Where it matters |
|---|---|---|
| Pi | The host editor and agent platform. | Runtime environment |
| `ultimate-pi` | This package. | Package manifest, docs |
| Harness | The governed workflow layer around Pi. | All workflow docs |
| Agent | A role definition, usually in a markdown file. | `.pi/agents/`, `.agents/skills/` |
| Skill | A reusable instruction pack for a task or domain. | `.agents/skills/`, `.pi/skills/` |
| Extension | TypeScript code loaded by Pi at runtime. | `.pi/extensions/` |
| Prompt | A slash-command template or instruction file. | `.pi/prompts/` |
| Slash command | A command typed into Pi, such as `/harness-plan`. | README, harness docs |

## Workflow Terms

| Term | Simple meaning | Where it matters |
|---|---|---|
| Plan | The intended work before any code changes. | `/harness-plan` |
| PlanPacket | The approved plan file that becomes the execution baseline. | `.pi/harness/runs/<run_id>/plan-packet.yaml` |
| Run | One complete task execution. | `.pi/harness/runs/` |
| Active run | The current run pointer stored on disk. | `.pi/harness/active-run.json` |
| Artifact | A file written during plan, run, review, or repair. | `.pi/harness/runs/<run_id>/artifacts/` |
| Research brief | The evidence bundle collected during planning. | `.pi/harness/runs/<run_id>/research-brief.yaml` |
| Review | The independent check after execution. | `/harness-review` |
| Steer | A narrow repair pass after review finds a gap. | `/harness-steer` |
| Repair brief | The file that tells the executor what to fix. | `artifacts/repair-brief.yaml` |
| Executor | The subagent that makes the code change. | `harness/running/executor` |
| Evaluator | The reviewing agent that checks results. | `harness/reviewing/evaluator` |
| Adversary | The reviewing agent that looks for failure cases. | `harness/reviewing/adversary` |
| Tie breaker | The final reviewer when the review needs one more decision. | `harness/reviewing/tie-breaker` |
| Review gate | The checkpoint that decides whether the work can move on. | `/harness-review` |

## Safety And Governance Terms

| Term | Simple meaning | Where it matters |
|---|---|---|
| Policy gate | The extension that allows or blocks actions by phase. | `.pi/extensions/policy-gate.ts` |
| Budget guard | The extension that stops work when the budget is exhausted. | `.pi/extensions/budget-guard.ts` |
| Review integrity | The rule set that keeps evaluator and adversary isolated. | `.pi/extensions/review-integrity.ts` |
| AGT | The policy engine layer used for governance. | `.pi/harness/policies/`, `AGT` docs |
| Sentrux | The structural quality checker. | `CONTRIBUTING.md`, `.sentrux/rules.toml` |
| Graphify | The repository knowledge graph system. | `graphify-out/`, `AGENTS.md` |
| Telemetry | Recorded events about runs and behavior. | `harness-telemetry.ts`, PostHog |
| PostHog | The event and trace store used for analytics. | `docs/posthog-plan-latency-dashboard.md` |
| VCC | View-oriented context compaction. | `vendor/pi-vcc/`, `HARNESS_VCC_*` |

## Supporting Terms

| Term | Simple meaning | Where it matters |
|---|---|---|
| `harness-web` | The web fetch and search helper used by the harness. | `CONTRIBUTING.md`, `.pi/scripts/` |
| `ccc` | The semantic search lane used for code and corpus search. | `.agents/skills/ccc/` |
| Context mode | A Pi package mode for harness-safe context handling. | `AGENTS.md`, `CONTRIBUTING.md` |
| Debate | Structured discussion between review or planning agents. | Planning and review ADRs |
| `plan_gap` | The plan was incomplete or wrong. | Review routing |
| `implementation_gap` | The code did not match the approved plan. | Repair routing |
| `harness_artifact_ready` | A gate signal that says the required artifact exists. | Harness runtime |
