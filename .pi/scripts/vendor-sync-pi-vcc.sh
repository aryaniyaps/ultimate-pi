#!/usr/bin/env bash
# Re-fetch upstream pi-vcc and re-apply ultimate-pi patches.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VEND="$ROOT/vendor/pi-vcc"
SETTINGS_STUB="$ROOT/.pi/scripts/vendor-pi-vcc-settings.stub.ts"

rm -rf "$VEND"
git clone --depth 1 https://github.com/sting8k/pi-vcc.git "$VEND"
COMMIT="$(git -C "$VEND" rev-parse HEAD)"
rm -rf "$VEND/.git"

# Env-only settings (no JSON config files)
cp "$SETTINGS_STUB" "$VEND/src/core/settings.ts"

# Drop config scaffolding on extension load
sed -i '/scaffoldSettings/d' "$VEND/index.ts"
sed -i '/import.*scaffoldSettings/d' "$VEND/index.ts"

# Telemetry / compaction details label
sed -i 's/compactor: "pi-vcc";/compactor: "pi-vcc" | "ultimate-pi-vcc";/' "$VEND/src/details.ts"
sed -i 's/compactor: "pi-vcc"/compactor: "ultimate-pi-vcc"/' "$VEND/src/hooks/before-compact.ts"

cat >"$VEND/UPSTREAM_PIN.md" <<EOF
# Vendored \`pi-vcc\`

- **Repository:** https://github.com/sting8k/pi-vcc
- **Conceptual basis:** [lllyasviel/VCC](https://github.com/lllyasviel/VCC) (View-oriented Conversation Compiler)
- **License:** MIT (see upstream repository)
- **Pinned upstream commit:** \`$COMMIT\`
- **Local changes:**
  - \`src/core/settings.ts\` re-exports env-only [\`harness-vcc-settings\`](../../.pi/lib/harness-vcc-settings.ts) (\`HARNESS_VCC_COMPACTION\`, \`HARNESS_VCC_DEBUG\`)
  - No \`scaffoldSettings\` / no \`PI_VCC_CONFIG_PATH\`
  - Compaction \`details.compactor\` is \`ultimate-pi-vcc\`

**Refresh upstream:** run \`npm run vendor:sync-vcc\` from ultimate-pi root.
EOF

rm -f "$VEND/package-lock.json"
echo "✓ Vendor refreshed at $VEND (commit $COMMIT)"
