# Ultimate PI Harness

Build the **ultimate AI coding harness** on top of **pi.dev**.

This repo is a focused PI package that enforces a high-signal workflow:
- lean-ctx-first tooling
- compact caveman communication
- reproducible skill composition

## Goal

Ship a production-grade coding harness where the agent:
1. uses compressed context before raw tool spam,
2. stays concise and deterministic in output style,
3. remains easy to extend with skills and extensions.

## Current harness setup

### Core package wiring

- `package.json` registers:
  - `./extensions`
  - `./skills`
- Project system prompt override:
  - `.pi/SYSTEM.md`

### Installed skills (present in this repo)

- `skills/caveman/SKILL.md`
- `skills/compress/SKILL.md`
- `skills/compress/scripts/*`
- `skills/lean-ctx/SKILL.md`
- `skills/lean-ctx/scripts/install.sh`
- `skills/context7-cli/SKILL.md`
- `skills/context7-cli/references/*`

### Runtime guardrail extension

- `extensions/lean-ctx-enforce.ts`
  - Detects `lean-ctx` availability.
  - Blocks built-ins (`read`, `write`, `edit`, `grep`, `find`, `ls`, raw `bash`) when `lean-ctx` exists.
  - Allows shell only via `lean-ctx -c <command>`.
  - Adds status commands:
    - `/lean-ctx-status`
    - `/system-prompt-status`

## Design choices (concise)

1. **Lean-ctx-first execution**  
   Reason: cut context/token waste and keep tool usage structured.

2. **Caveman-by-default response style**  
   Reason: short, exact, low-noise outputs for coding loops.

3. **Policy in system prompt + enforcement in extension**  
   Reason: prompt sets intent; extension guarantees behavior.

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
