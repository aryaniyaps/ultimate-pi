# Third-party notices

## Design references (not vendored)

The in-house `ask_user` harness extension (`.pi/extensions/harness-ask-user.ts`) borrows **behavior and UX patterns only** from these projects. No code from them is bundled.

| Project | License | Reference |
|---------|---------|-----------|
| [pi-ask-user](https://github.com/edlsh/pi-ask-user) | MIT | Overlay/inline modes, SelectList + Editor, custom renderCall/renderResult, headless fallback |
| [@pi-unipi/ask-user](https://cdn.jsdelivr.net/npm/@pi-unipi/unipi@2.0.1/packages/ask-user/README.md) | (package docs) | Tool contract: `question`, `context`, `options`, `allowMultiple`, `allowFreeform` |
| [rpiv-ask-user-question](https://github.com/juicesharp/rpiv-mono/tree/main/packages/rpiv-ask-user-question) | MIT | Rich option rows, decision-handshake policy text, structured answer envelope |

## @tintinweb/pi-subagents (vendored in harness-subagents)

- **Project:** https://github.com/tintinweb/pi-subagents  
- **Version pinned:** 0.7.3 (source vendored under `.pi/extensions/lib/harness-subagents/vendored/`)  
- **License:** MIT  
- **Notes:** Adapted for `@mariozechner/pi-coding-agent` in ultimate-pi `harness-subagents` extension. Agent discovery replaced with package-root recursive loader.

## subagent-v2 reference (design only)

- **Path:** `raw/references/subagents/extensions/subagent-v2/`  
- **License:** Treat as third-party reference; not shipped in npm `files`. Blackboard, supervisor, and isolated session patterns were ported into `harness-subagents` without copying the earendil-works Pi stack.

## pi-model-router (vendored)

- **Project:** https://github.com/yeliu84/pi-model-router  
- **License:** MIT ([vendor/pi-model-router/LICENSE](vendor/pi-model-router/LICENSE))  
- **Pinned revision:** See [vendor/pi-model-router/UPSTREAM_PIN.md](vendor/pi-model-router/UPSTREAM_PIN.md)  
- ultimate-pi loads it from [`vendor/pi-model-router`](vendor/pi-model-router); import specifiers were adapted for `@mariozechner/pi-coding-agent` and related Pi packages.
