#!/usr/bin/env bash
# Re-fetch upstream pi-subagents from narumiruna/pi-extensions.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VEND="$ROOT/vendor/pi-subagents"
BASE="https://raw.githubusercontent.com/narumiruna/pi-extensions/main/extensions/pi-subagents"

mkdir -p "$VEND/src"
curl -fsSL "$BASE/LICENSE" -o "$VEND/LICENSE"
curl -fsSL "$BASE/src/subagents.ts" -o "$VEND/src/subagents.upstream.ts"

# Preserve ultimate-pi harness extensions (agents.ts, harness patches applied to subagents.ts manually or via merge).
if [[ ! -f "$VEND/src/agents.ts" ]]; then
	curl -fsSL "$BASE/src/agents.ts" -o "$VEND/src/agents.ts"
fi

sed -i 's/from "typebox"/from "@sinclair\/typebox"/g' "$VEND/src/subagents.upstream.ts" 2>/dev/null || true

echo "Fetched upstream into $VEND/src/subagents.upstream.ts — merge harness changes into subagents.ts before commit."
