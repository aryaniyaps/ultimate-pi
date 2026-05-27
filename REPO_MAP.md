# Repository Map

This is a precise map of the checkout. It is meant to help you find the right file family before you edit anything.

## Root Files

| Path | What it is | Why it matters |
|---|---|---|
| `DOCS_BY_AUDIENCE.md` | Audience routing guide. | Fastest way to choose the right doc path. |
| `START_HERE.md` | Beginner entry point. | Explains the repo in simple language. |
| `GLOSSARY.md` | Repo terminology guide. | Keeps custom words precise. |
| `WORKFLOW_CHEAT_SHEET.md` | Operational workflow reference. | Quick command and failure-response guide. |
| `README.md` | Main overview and command guide. | Best first doc for users. |
| `AGENTS.md` | Repo-specific operating rules and graphify workflow. | Highest-priority local instructions. |
| `CONTRIBUTING.md` | Setup, linting, Sentrux, harness-web, and extension notes. | Best contributor entry point. |
| `CHANGELOG.md` | Release history. | Shows recent direction and design shifts. |
| `THIRD_PARTY_NOTICES.md` | Vendored provenance notes. | Required before touching vendored code. |
| `package.json` | Pi manifest, package metadata, and scripts. | Defines shipped content and build/test entry points. |
| `.env.example` | Optional environment variables. | Template for local setup. |
| `biome.json` | Formatting and linting config. | Governs code style. |
| `lefthook.yml` | Git hook configuration. | Controls pre-commit checks. |

## Core Pi Package Directories

| Path | What it is | Why it matters |
|---|---|---|
| `.pi/extensions/` | Runtime TypeScript extensions loaded by Pi. | Main enforcement surface. |
| `.pi/agents/` | Markdown agent definitions shipped with the package. | Used by harness orchestrators. |
| `.pi/prompts/` | Slash-command prompt templates. | Defines user-facing harness commands. |
| `.pi/scripts/` | Node and shell helpers for bootstrap and verification. | Operational tooling for setup and sync. |
| `.pi/lib/` | Shared TypeScript helpers for the harness. | Common code used by extensions and scripts. |
| `.pi/skills/` | Additional shipped skills. | Reusable instruction layer. |
| `.pi/sounds/` | Audio cues for Pi UX. | User feedback only. |
| `.pi/settings.example.json` | Shipped settings template. | Safe starting point for project config. |
| `.pi/settings.json` | Local dev settings. | Not the shipped template. |
| `.pi/auto-commit.json` | Auto-commit related config. | Harness automation support. |

## Harness Surface

| Path | What it is | Why it matters |
|---|---|---|
| `.pi/harness/README.md` | Harness layout and safety overview. | Explains the harness storage model. |
| `.pi/harness/docs/adrs/` | Harness architectural decision records. | Source of design truth. |
| `.pi/harness/specs/` | Artifact contracts and schemas. | Defines file-level expectations. |
| `.pi/harness/evals/` | Deterministic evaluation fixtures. | Used by smoke and review checks. |
| `.pi/harness/evolution/` | Self-healing and chaos drill material. | Advanced maintenance area. |
| `.pi/harness/corpus/` | Ingest notes for Graphify sources. | Supports knowledge graph inputs. |
| `.pi/harness/policies/` | Policy rules consumed by AGT. | Controls allowed actions. |
| `.pi/harness/sentrux/` | Source data for `.sentrux/rules.toml`. | Keeps architecture rules in sync. |
| `.pi/harness/examples/` | Example artifacts and flows. | Helpful for reading expected structure. |
| `.pi/harness/agents.manifest.json` | Agent manifest for the harness. | Used by governance and discovery. |
| `.pi/harness/agents.policy.yaml` | Agent tool policy source of truth. | Controls tool access by agent. |

## Support And Tooling Directories

| Path | What it is | Why it matters |
|---|---|---|
| `.agents/skills/` | Shared skill library. | Contains the reusable task manuals. |
| `.sentrux/rules.toml` | Structural quality rules. | The active architecture threshold file. |
| `graphify-out/` | Generated knowledge graph output. | Read before raw search when possible. |
| `test/` | Automated harness and integration tests. | The main regression net. |
| `vendor/` | Vendored upstream code. | Must be treated as upstream mirror content. |
| `docs/` | Supporting documentation. | Currently includes the PostHog latency dashboard note. |
| `scripts/` | Repo-level developer helpers. | Dev-only support, not the Pi package runtime. |
| `.github/workflows/` | CI and publish workflows. | Controls lint and package publishing. |
| `.cursor/` | Cursor-specific agents, plans, settings, and logs. | Editor-specific support artifacts. |

## Vendor And Generated Areas

| Path | What it is | Why it matters |
|---|---|---|
| `vendor/pi-vcc/` | Vendored context compaction implementation. | Refresh with the vendor sync script. |
| `vendor/pi-subagents/` | Vendored subagent runtime. | Refresh with the vendor sync script. |
| `graphify-out/GRAPH_REPORT.md` | Human-readable graph summary. | Best starting point for architecture reading. |
| `graphify-out/graph.json` | Machine graph data. | Generated source for graph navigation. |
| `graphify-out/graph.graphml` | Graph export. | Useful for external graph tooling. |

## Files To Read First When Contributing

1. `README.md`
2. `AGENTS.md`
3. `CONTRIBUTING.md`
4. `package.json`
5. `.pi/harness/README.md`
6. `.pi/harness/docs/adrs/README.md`
7. `.pi/scripts/README.md`
8. `graphify-out/GRAPH_REPORT.md`
