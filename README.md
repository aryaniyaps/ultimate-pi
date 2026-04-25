# Ultimate PI

(Beta) The **ultimate AI coding harness** on top of **pi.dev**.

This repo is a focused PI package that enforces a high-signal workflow:
- lean-ctx-first tooling
- compact caveman communication
- reproducible skill composition

## Goal

Ship a production-grade coding harness where the agent:
1. uses compressed context before raw tool spam,
2. stays concise and deterministic in output style,
3. remains easy to extend with skills and extensions.

### Included skills (upstream repositories)

| Skill | Upstream repo | What it does |
|---|---|---|
| caveman | [juliusbrussee/caveman](https://github.com/juliusbrussee/caveman) | Ultra-compressed response style for token-efficient, high-signal communication. |
| compress | [juliusbrussee/caveman](https://github.com/juliusbrussee/caveman) | Compresses memory/context files into caveman format while preserving technical content. |
| lean-ctx | [yvgude/lean-ctx](https://github.com/yvgude/lean-ctx) | Context runtime and compression toolkit for reads/search/shell/edit flows. |
| context7-cli | [upstash/context7](https://github.com/upstash/context7) | Pulls current library docs and manages Context7 skills/config from CLI. |
| emil-design-eng | [emilkowalski/skill](https://github.com/emilkowalski/skill) | UI/design craftsmanship guidance: interaction polish, motion, and component quality. |

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
