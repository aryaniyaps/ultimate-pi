![Ultimate PI banner](https://raw.githubusercontent.com/aryaniyaps/ultimate-pi/main/.github/banner-v2.png)

> (Beta) The **ultimate AI coding harness** on top of [**pi.dev**](https://pi.dev).

## Goal

Ship a production-grade coding harness where the agent:
1. uses compressed context before raw tool spam,
2. stays concise and deterministic in output style,
3. remains easy to extend with skills and extensions.

## Getting started

1. Install from npm:

   ```bash
   npm install -g ultimate-pi
   ```

2. Install package into PI from your project folder:

   ```bash
   pi install ultimate-pi -l
   ```

3. Reload PI to activate skills and extensions:

   ```bash
   /reload
   ```

4. Optional: install from GitHub Packages instead:

   ```bash
   npm install -g @aryaniyaps/ultimate-pi --registry=https://npm.pkg.github.com
   ```

### Included skills (upstream repositories)

| Skill | Upstream repo | What it does |
|---|---|---|
| caveman | [juliusbrussee/caveman](https://github.com/juliusbrussee/caveman) | Ultra-compressed response style for token-efficient, high-signal communication. |
| compress | [juliusbrussee/caveman](https://github.com/juliusbrussee/caveman) | Compresses memory/context files into caveman format while preserving technical content. |
| lean-ctx | [yvgude/lean-ctx](https://github.com/yvgude/lean-ctx) | Context runtime and compression toolkit for reads/search/shell/edit flows. |
| context7-cli | [upstash/context7](https://github.com/upstash/context7) | Pulls current library docs and manages Context7 skills/config from CLI. |
| scrapling-official | [D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) | Official Scrapling skill for web extraction/scraping with adaptive parsing, JS rendering, stealth fetchers, and anti-bot handling. |

### Runtime guardrail extension

- `extensions/lean-ctx-enforce.ts`
  - Detects `lean-ctx` availability (cached check).
  - Overrides built-in `read` tool to execute through `lean-ctx read` when available.
  - Overrides built-in `bash` tool and auto-wraps commands with `lean-ctx -c <command>` when needed.
  - Falls back to default built-in tools if `lean-ctx` is unavailable.
  - Adds status command:
    - `/lean-ctx-status`

- `extensions/auto-commit-orchestrator.ts`
  - Adds policy-driven auto-commit and optional auto-push flow.
  - Uses deterministic git-state checks (`git status --porcelain`) and trigger lock deduping.
  - Enforces `Co-authored-by` trailer for `pi-mono` on harness commits.
  - Supports project/global JSON config with restrictive merge semantics for safety fields.
  - Adds commands:
    - `/auto-commit-status`
    - `/auto-commit-validate-config`
  - Starts disabled by default; enable via config after review.
  - Config template:
    - `.pi/auto-commit.example.json`

## Design choices (concise)

1. **Lean-ctx-first execution**  
   Reason: cut context/token waste and keep tool usage structured.

2. **Caveman-by-default response style**  
   Reason: short, exact, low-noise outputs for coding loops.

3. **Runtime enforcement in extension code**  
   Reason: executable extension logic is the single source of truth for lean-ctx routing.

4. **Skill-based composition**  
   Reason: easy to swap/upgrade capabilities without rewiring core package.

5. **Model-agnostic compression path**  
   Reason: `compress` skill calls PI CLI, so provider/model can change per environment.

## Use locally

From repo root:

```bash
pi install . -l
```

Then restart PI or run `/reload`.

## Terminal-Bench evaluation (local only)

Use Harbor custom-agent flow from docs:

```bash
npm run bench:terminal
```

Scaffold files live in `bench/terminal-bench/` and are excluded from npm publish via `.npmignore`.
