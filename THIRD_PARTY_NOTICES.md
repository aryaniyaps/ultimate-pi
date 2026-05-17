# Third-party notices

## pi-model-router (vendored)

- **Project:** https://github.com/yeliu84/pi-model-router  
- **License:** MIT ([vendor/pi-model-router/LICENSE](vendor/pi-model-router/LICENSE))  
- **Pinned revision:** See [vendor/pi-model-router/UPSTREAM_PIN.md](vendor/pi-model-router/UPSTREAM_PIN.md)  
- ultimate-pi loads it from [`vendor/pi-model-router`](vendor/pi-model-router); import specifiers were adapted for `@earendil-works/pi-coding-agent` and related Pi packages.

## pi-vcc (vendored)

- **Project:** https://github.com/sting8k/pi-vcc  
- **Conceptual basis:** https://github.com/lllyasviel/VCC (View-oriented Conversation Compiler)  
- **License:** MIT (see upstream repository)  
- **Pinned revision:** See [vendor/pi-vcc/UPSTREAM_PIN.md](vendor/pi-vcc/UPSTREAM_PIN.md)  
- ultimate-pi loads it from [`vendor/pi-vcc`](vendor/pi-vcc) via [`.pi/extensions/ultimate-pi-vcc.ts`](.pi/extensions/ultimate-pi-vcc.ts). Harness configuration is env-only: `HARNESS_VCC_COMPACTION`, `HARNESS_VCC_DEBUG` ([`.pi/extensions/lib/harness-vcc-settings.ts`](.pi/extensions/lib/harness-vcc-settings.ts)). Maintainer refresh: `npm run vendor:sync-vcc`.
