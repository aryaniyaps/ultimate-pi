# 0019 - Add Harbor Terminal-Bench adapter and keep bench assets out of npm package

- Date: 2026-04-25
- Status: Accepted

## Context
User requested a way to test this agentic harness with Harbor Terminal-Bench following Harbor docs (`/docs/agents`, `/docs/tutorials/running-terminal-bench`).
Repo is published to npm; benchmark-only assets must not be shipped in package artifacts.

## Alternatives
1. Only add README instructions, no runnable adapter code.
2. Add full Harbor integration inside existing extension runtime.
3. Add a small Harbor custom-agent scaffold + runner script under a dedicated `bench/` folder and explicitly exclude it from npm publish.

## Chosen option
Adopt option 3.

## Rationale
- Matches Harbor docs flow for custom agents via `--agent-import-path`.
- Keeps benchmark logic isolated from package runtime code.
- Delivers runnable starting point without forcing invasive architecture changes.
- Prevents benchmark scaffolding from leaking into npm package.

## Consequences
- Repo gains Python benchmark scaffold files under `bench/terminal-bench/`.
- Local users can execute Harbor runs with one script and environment overrides.
- npm package excludes benchmark folder via `.npmignore`.
