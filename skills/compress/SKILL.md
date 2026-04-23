---
name: compress
description: >
  Compress natural language memory files (CLAUDE.md, todos, preferences) into caveman format
  to save input tokens. Preserves technical substance, code, URLs, and markdown structure.
  Overwrites original file and saves backup as FILE.original.md.
  Trigger: /caveman:compress <filepath> or "compress memory file".
---

# Caveman Compress

## Purpose

Compress natural language files (CLAUDE.md, todos, preferences) into caveman-speak to reduce recurring context tokens. Compressed version overwrites original file. Human-readable backup saved as `<filename>.original.md`.

## Trigger

`/caveman:compress <filepath>` or when user asks to compress a memory file.

## Process

1. This SKILL.md lives next to `scripts/`. Find this skill directory.
2. Run:

```bash
cd <directory_containing_this_SKILL.md> && python3 -m scripts <absolute_filepath>
```

3. The CLI will:
   - detect file type (local, no model)
   - compress with model via configurable command (defaults to pi CLI, model-agnostic)
   - validate output locally
   - if errors: run targeted fix prompt (no full recompression)
   - retry up to 2 times
4. If still failing, tool restores original and reports error.

## Model-agnostic engine

By default, script uses pi CLI for LLM calls:

```bash
pi -p --no-context-files --no-extensions --no-skills --no-prompt-templates
```

This makes it provider/model agnostic and compatible with current pi setup.

Optional overrides:
- `CAVEMAN_COMPRESS_CMD`: full command string to use for model calls
- `CAVEMAN_MODEL`: model passed as `--model <value>` when command is `pi`

## Boundaries

- ONLY compress natural language files (`.md`, `.txt`, `.markdown`, `.rst`, extensionless prose)
- NEVER modify common code/config types (`.py`, `.js`, `.ts`, `.json`, `.yaml`, etc.)
- Skip `*.original.md`
- Preserve code blocks, inline code, URLs, headings
- Backup original before write
