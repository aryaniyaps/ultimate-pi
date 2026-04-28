# Pi Agent Data Format — Detailed Reference

## Root Layout

`~/.pi/agent/` is the primary data directory. Contents:

- `auth.json` — authentication credentials (skip entirely)
- `settings.json` — agent preferences (defaultModel, defaultProvider, defaultThinkingLevel)
- `bin/` — agent binary tools (skip entirely)
- `sessions/` — per-project session directories

## Sessions Directory

`~/.pi/agent/sessions/` contains one directory per project, named by path-encoding.

### Path encoding scheme

The project's absolute path is encoded by:
1. Replacing all `/` with `-`
2. Wrapping the result in `--`

```
/home/aryaniyaps/ai-projects/ultimate-pi
→ --home-aryaniyaps-ai-projects-ultimate-pi--
```

To recover the original path: strip leading/trailing `--`, replace `-` with `/`, prepend `/`.

**Caveat:** Dashes also appear in real directory names. The `cwd` field in the session metadata (first JSONL line) gives the canonical path — always prefer it over reverse-encoding.

### Session files

Each session is a single JSONL file named `<timestamp>_<uuid>.jsonl`:

```
2026-04-28T05-19-41-616Z_019dd287-642e-74af-a2aa-79c5cdc8f9e1.jsonl
```

The timestamp in the filename is ISO 8601 with colons replaced by dashes (filesystem-safe). The UUID is a v7 UUID (time-ordered).

## JSONL Line Schemas

Every line is a JSON object with a `type` field as the primary discriminator.

### `session` (always first line)

```json
{
  "type": "session",
  "version": 3,
  "id": "019dd287-642e-74af-a2aa-79c5cdc8f9e1",
  "timestamp": "2026-04-28T05:19:41.616Z",
  "cwd": "/home/aryaniyaps/ai-projects/ultimate-pi"
}
```

| Field | Use |
|---|---|
| `id` | Session UUID — use as manifest key |
| `cwd` | Canonical project path — use for project routing |
| `timestamp` | Session start time |
| `version` | Schema version (currently 3) |

### `model_change`

```json
{
  "type": "model_change",
  "id": "793c78f5",
  "parentId": null,
  "timestamp": "2026-04-28T05:19:41.680Z",
  "provider": "google-antigravity",
  "modelId": "claude-opus-4-6-thinking"
}
```

Metadata only. Note for context (which model handled the session) but don't extract knowledge from it.

### `thinking_level_change`

```json
{
  "type": "thinking_level_change",
  "id": "a614b63a",
  "parentId": "793c78f5",
  "timestamp": "2026-04-28T05:19:41.680Z",
  "thinkingLevel": "medium"
}
```

Skip entirely — internal configuration.

### `message` (primary content)

The `message` type carries both user and assistant turns. Discriminate on `message.role`.

#### User message

```json
{
  "type": "message",
  "id": "135592b1",
  "parentId": "a614b63a",
  "timestamp": "2026-04-28T05:20:15.365Z",
  "message": {
    "role": "user",
    "content": [
      {"type": "text", "text": "the user's actual message"}
    ],
    "timestamp": 1777353615361
  }
}
```

`content` is always an array of content blocks. For user messages, expect `text` blocks.

#### Assistant message

```json
{
  "type": "message",
  "id": "7c660c10",
  "parentId": "135592b1",
  "timestamp": "2026-04-28T05:20:21.313Z",
  "message": {
    "role": "assistant",
    "content": [
      {"type": "text", "text": "The actual visible response"},
      {"type": "thinking", "thinking": "internal reasoning chain"},
      {
        "type": "toolCall",
        "id": "toolu_vrtx_...",
        "name": "bash",
        "arguments": {"command": "ls -la"}
      }
    ],
    "api": "google-gemini-cli",
    "provider": "google-antigravity",
    "model": "claude-opus-4-6-thinking",
    "usage": {
      "input": 8650,
      "output": 283,
      "cacheRead": 0,
      "cacheWrite": 0,
      "totalTokens": 8933,
      "cost": {
        "input": 0.04325,
        "output": 0.007075,
        "cacheRead": 0,
        "cacheWrite": 0,
        "total": 0.050325
      }
    },
    "stopReason": "toolUse",
    "timestamp": 1777353615413,
    "responseId": "req_vrtx_..."
  }
}
```

### Content block types in assistant messages

| Block type | Field for text | Worth reading? |
|---|---|---|
| `text` | `.text` | **Yes** — the actual response |
| `thinking` | `.thinking` | No — internal reasoning |
| `toolCall` | `.name`, `.arguments` | Aggregate only — scan for patterns across sessions |

### Assistant message metadata fields

| Field | Use |
|---|---|
| `model` | Which model generated this response |
| `provider` | API provider |
| `usage` | Token counts and cost — useful for analytics, not knowledge |
| `stopReason` | `"endTurn"` (complete response) or `"toolUse"` (interrupted for tool call) |

### `parentId` threading

Every event has an `id` and a `parentId`. This forms a tree:

```
session → model_change → thinking_level_change → user message → assistant message → ...
```

Use `parentId` to reconstruct conversation flow when messages appear out of order.

## Processing Order

For maximum efficiency:

1. **Session metadata** (first line) — get `cwd` and timestamp for project routing
2. **User messages** — understand what was asked/decided
3. **Assistant text blocks** — extract the knowledge delivered
4. **Tool calls** (aggregate only) — scan for recurring patterns across 3+ sessions

## Privacy Notes

Session transcripts may contain:
- API keys, tokens, passwords in tool call arguments or outputs
- Personal information about the user or others
- Injected system prompts and instructions

Always redact secrets and summarize rather than copying raw transcript content.
