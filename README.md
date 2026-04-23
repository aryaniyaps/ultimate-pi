# ultimate-pi-package

Custom pi package starter.

## Included

- `skills/caveman/SKILL.md` (copied from `JuliusBrussee/caveman`)
- `skills/compress/SKILL.md` + `skills/compress/scripts/*` (adapted from `JuliusBrussee/caveman`)
- `skills/lean-ctx/SKILL.md` + `skills/lean-ctx/scripts/install.sh` (copied from `yvgude/lean-ctx`)
- `skills/context7-cli/SKILL.md` + `skills/context7-cli/references/*` (copied from `upstash/context7`)
- `skills/emil-design-eng/SKILL.md` (copied from `emilkowalski/skill`)
- `skills/impeccable.style/SKILL.md` (custom local skill)
- `.pi/SYSTEM.md` custom system prompt (lean-ctx-first + always-caveman)
- `extensions/lean-ctx-enforce.ts` hard-block extension for built-in tools when lean-ctx is available

## Use locally

From this directory:

```bash
pi install . -l
```

Then restart pi or run `/reload`, and invoke:

```text
/skill:caveman
/skill:compress
/skill:lean-ctx
/skill:context7-cli
/skill:emil-design-eng
/skill:impeccable.style
```

To run compression from the compress skill directory:

```bash
cd skills/compress
python3 -m scripts /absolute/path/to/CLAUDE.md
```

### Model-agnostic compression backend

The compress script defaults to pi CLI (so it uses your configured provider/model):

```bash
pi -p --no-context-files --no-extensions --no-skills --no-prompt-templates
```

Optional env vars:

- `CAVEMAN_COMPRESS_CMD` — full command used for LLM calls
- `CAVEMAN_MODEL` — model passed via `--model` when command is `pi`

### Custom system prompt

This repo uses `.pi/SYSTEM.md` as the project system prompt replacement.

Per pi docs, `.pi/SYSTEM.md` replaces the default prompt at project scope. The extension does **not** override `systemPrompt` per-turn anymore; it only verifies status and reports it.

- `/system-prompt-status` → check replacement status (file present + marker found in effective prompt)
- `/lean-ctx-status` → verify lean-ctx tool enforcement

Prompt behavior forced by this setup:

- lean-ctx-first workflow (prefer `ctx_*` or `lean-ctx` CLI wrappers)
- caveman speaking style by default
- hard block of built-ins when lean-ctx is available (`read`, `write`, `edit`, `grep`, `find`, `ls`, raw `bash`)

## Next steps

- Add your own skills under `skills/`
- Optionally add `extensions/`, `prompts/`, and `themes/`
- Rename package in `package.json` before publishing

## Attribution

Caveman source: https://github.com/JuliusBrussee/caveman (MIT)
Lean-ctx source: https://github.com/yvgude/lean-ctx (Apache-2.0, MIT components)
Context7 source: https://github.com/upstash/context7 (MIT)
Emil design skill source: https://github.com/emilkowalski/skill (license not specified in repo)
Impeccable.style skill source: local custom skill (`skills/impeccable.style/SKILL.md`)
See `THIRD_PARTY_NOTICES.md`.
