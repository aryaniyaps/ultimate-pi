# Harness Architectural Decision Records

Team-shared ADRs for the ultimate-pi harness live under `.pi/harness/docs/adrs/`.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-harness-constitution.md) | Harness constitution | Accepted |
| [0002](0002-harness-run-record.md) | HarnessRunRecord canonical trace | Accepted |
| [0003](0003-eval-promotion-gates.md) | Eval promotion gates | Accepted |
| [0004](0004-defer-ci-agent-smoke.md) | Defer CI agent smoke | Accepted (deferred) |
| [0005](0005-defer-posthog-analyst.md) | Defer PostHog analyst skill | Accepted (deferred) |
| [0006](0006-sentrux-dual-layer.md) | Sentrux dual-layer trust | Accepted |
| [0007](0007-interactive-drift-monitor.md) | Interactive drift monitor | Accepted |
| [0008](0008-harness-posthog-telemetry.md) | Harness PostHog telemetry | Accepted |
| [0009](0009-sentrux-rules-lifecycle.md) | Sentrux rules.toml lifecycle | Accepted |
| [0030](0030-inhouse-vcc-compaction.md) | In-house VCC compaction (vendored pi-vcc) | Accepted |
| [0031](0031-harness-run-context.md) | Harness active run context | Accepted |
| [0032](0032-harness-command-orchestration.md) | Harness commands as agent orchestrators | Accepted |
| [0033](0033-parent-orchestrated-planning.md) | Parent-orchestrated harness planning | Accepted |
| [0034](0034-darwin-plan-research-pipeline.md) | Darwin plan research pipeline | Accepted |
| [0035](0035-plan-phase-review-gate.md) | Plan-phase Review Gate | Accepted |
| [0036](0036-implementation-research-and-selective-debate.md) | Implementation research and selective debate | Accepted |
| [0037](0037-subagent-submit-tools.md) | Subagent submit tools (subprocess extension) | Accepted |
| [0038](0038-budget-telemetry-only.md) | Budget caps telemetry-only by default | Accepted |
| [0039](0039-harness-post-run-review-gate.md) | `/harness-review` master post-run gate | Accepted |
| [0040](0040-practice-grounded-orchestration.md) | Practice-grounded orchestration & team topology | Accepted |
| [0045](0045-harness-lens-minimal-contract.md) | Harness-lens minimal contract (edit safety, LSP, deferred format) | Accepted |
| [0041](0041-intelligent-planning-reconnaissance.md) | Intelligent planning reconnaissance (tools over tool-scouts) | Accepted |
| [0042](0042-agent-native-orchestration.md) | Agent-native orchestration (lakes, plan-verify probes, synthesizer) | Accepted |
| [0043](0043-path-first-harness-tools.md) | Path-first harness tool contracts | Accepted |
| [0044](0044-harness-steer-loop.md) | Post-run steer loop (repair vs plan revise) | Accepted |
| [0045](0045-phase-scoped-agent-directories.md) | Phase-scoped harness agent directories | Accepted |

## Practice map

Phase-to-practice mapping for slash commands: [practice-map.md](../practice-map.md).

## Template

Use [template.md](template.md) for new ADRs. Number sequentially (`0010-...`).
