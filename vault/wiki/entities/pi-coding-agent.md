---
type: entity
entity_type: project
url: https://github.com/badlogic/pi-mono
tags:
  - pi-agent
  - coding-agent
  - open-source
  - terminal
related:
  - "[[Entity: disler (IndyDevDan)]]"
  - "[[Entity: OpenDev]]"
  - "[[sources/disler-pi-vs-claude-code]]"
---

# Pi Coding Agent (pi-mono)

Open-source AI agent toolkit by Mario Zechner (libGDX creator). 11.3K GitHub stars.

## Components

- **Coding Agent CLI**: Terminal-native agentic coding assistant
- **Unified LLM API**: Single interface across multiple providers
- **TUI and Web UI libraries**: Terminal and browser interfaces
- **Slack bot**: Agent accessible via chat
- **vLLM pods**: Self-hosted model infrastructure

## Key Differentiators

- **<1000 token system prompt**: Fully customizable, minimal by design
- **Model agnostic**: Supports OpenAI, Anthropic, Google, OpenRouter, and many others
- **Extension system**: TypeScript SDK for customizing UI, adding tools, hooking events
- **Event lifecycle**: 15+ events including session_start, tool_call, agent_start, turn_end, message_update
- **Extension composability**: Multiple `-e` flags stack extensions

## Extension API

Extensions are TypeScript files that hook into Pi's event system:
```typescript
// Minimal extension pattern
export default function(pi) {
  pi.on('session_start', (ctx) => { /* ... */ });
  pi.on('tool_call', (ctx) => { /* intercept/modify */ });
}
```

Built-in tools available to extensions: `read`, `bash`, `edit`, `write`.

## Architecture Relevance

Pi's extension API is the foundation for building agentic orchestration pipelines. The event system provides hooks at every lifecycle stage. The tool interface enables custom tool creation. Extensions compose without modifying core code.

Our harness sits on top of Pi's extension API — we implement orchestration, safety, and context engineering as extensions rather than core modifications.
