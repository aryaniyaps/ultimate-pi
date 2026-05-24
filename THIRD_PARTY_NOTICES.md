# Third-party notices

## pi-lens (vendored)

- **Project:** https://github.com/apmantza/pi-lens  
- **License:** MIT (declared in [vendor/pi-lens/package.json](vendor/pi-lens/package.json))  
- **Pinned revision:** See [vendor/pi-lens/UPSTREAM_PIN.md](vendor/pi-lens/UPSTREAM_PIN.md)  
- ultimate-pi loads it from [`vendor/pi-lens/index.ts`](vendor/pi-lens/index.ts) as a bundled pi extension. pi-lens provides edit-time diagnostics and LSP/navigation feedback; Sentrux remains the harness architecture-quality signal and gate.

## pi-vcc (vendored)

- **Project:** https://github.com/sting8k/pi-vcc  
- **Conceptual basis:** https://github.com/lllyasviel/VCC (View-oriented Conversation Compiler)  
- **License:** MIT (see upstream repository)  
- **Pinned revision:** See [vendor/pi-vcc/UPSTREAM_PIN.md](vendor/pi-vcc/UPSTREAM_PIN.md)  
- ultimate-pi loads it from [`vendor/pi-vcc`](vendor/pi-vcc) via [`.pi/extensions/ultimate-pi-vcc.ts`](.pi/extensions/ultimate-pi-vcc.ts). Harness configuration is env-only: `HARNESS_VCC_COMPACTION`, `HARNESS_VCC_DEBUG` ([`.pi/extensions/lib/harness-vcc-settings.ts`](.pi/extensions/lib/harness-vcc-settings.ts)). Maintainer refresh: `npm run vendor:sync-vcc`.

## pi-subagents (vendored)

- **Project:** https://github.com/narumiruna/pi-extensions (`extensions/pi-subagents`)  
- **npm:** `@narumitw/pi-subagents@0.1.26`  
- **License:** MIT ([vendor/pi-subagents/LICENSE](vendor/pi-subagents/LICENSE))  
- **Pinned revision:** See [vendor/pi-subagents/UPSTREAM_PIN.md](vendor/pi-subagents/UPSTREAM_PIN.md)  
- ultimate-pi loads it from [`vendor/pi-subagents`](vendor/pi-subagents) via [`.pi/extensions/harness-subagents.ts`](.pi/extensions/harness-subagents.ts) with harness discovery, spawn gates, and subprocess env. Maintainer refresh: `npm run vendor:sync-subagents`.

## CocoIndex Code (CLI + skill)

- **Project:** https://github.com/cocoindex-io/cocoindex-code  
- **License:** Apache-2.0  
- **Install:** `uv tool install 'cocoindex-code[full]'` (see `/harness-setup` §2.4)  
- ultimate-pi vendors the upstream agent skill at [`.agents/skills/ccc/`](.agents/skills/ccc/) and bootstraps indexes via [`.pi/scripts/harness-cocoindex-bootstrap.sh`](.pi/scripts/harness-cocoindex-bootstrap.sh). Replaces deprecated `@beaconbay/ck-search`.
