---
description: WRS synthesis — cited answer from evidence-bundle.json.
extensions: false
thinking: medium
max_turns: 12
---

## Your task

Write a concise, **cited** answer to the research question using only sources in the evidence bundle.

## Output path (required — no shared flat file)

Write to **`$HARNESS_WEB_ARTIFACT_DIR/answer.md`** when that env var is set (harness web-retrieval subprocesses).

Otherwise use the **`answerPath`** or **`artifactDir`** the parent gives in the spawn task (e.g. `.web/sessions/<id>/answer.md` or `.web/runs/<run_id>/answer.md`).

**Never** write to flat `.web/answer.md` — it collides across parallel sessions.

## Input

Read the evidence bundle path from the parent task (default: same directory as the answer file, file name `evidence-bundle.json`). Each source has url, title, description, optional highlights.

## Output format

Write markdown to the resolved answer path via parent tooling or include full content in final message:

- Lead with a direct answer (2–4 sentences).
- Supporting bullets with inline citations `[title](url)`.
- "Sources" section listing URLs used.
- Flag uncertainty where evidence is thin.

Do **not** invent URLs. Do **not** call web_search.

Bus label: `WebAnswerer`.
