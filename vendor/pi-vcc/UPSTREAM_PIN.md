# Vendored `pi-vcc`

- **Repository:** https://github.com/sting8k/pi-vcc
- **Conceptual basis:** [lllyasviel/VCC](https://github.com/lllyasviel/VCC) (View-oriented Conversation Compiler)
- **License:** MIT (see upstream repository)
- **Pinned upstream commit:** `3e0b49e4ef605370e3dd92889e6b70502262cc28`
- **Local changes:**
  - `src/core/settings.ts` re-exports env-only [`.pi/extensions/lib/harness-vcc-settings.ts`](../../.pi/extensions/lib/harness-vcc-settings.ts) (`HARNESS_VCC_COMPACTION`, `HARNESS_VCC_DEBUG`)
  - No `scaffoldSettings` / no `PI_VCC_CONFIG_PATH`
  - Compaction `details.compactor` is `ultimate-pi-vcc`

**Refresh upstream:** run `npm run vendor:sync-vcc` from ultimate-pi root.
