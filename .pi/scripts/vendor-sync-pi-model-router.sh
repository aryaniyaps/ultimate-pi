#!/usr/bin/env bash
# Re-fetch upstream pi-model-router and re-apply ultimate-pi patches.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VEND="$ROOT/vendor/pi-model-router"

rm -rf "$VEND"
git clone --depth 1 https://github.com/yeliu84/pi-model-router.git "$VEND"
COMMIT="$(git -C "$VEND" rev-parse HEAD)"
rm -rf "$VEND/.git"

for f in "$VEND"/extensions/*.ts; do
	sed -i \
		-e "s|'@earendil-works/pi-agent-core'|'@earendil-works/pi-agent-core'|g" \
		-e "s|'@earendil-works/pi-ai'|'@earendil-works/pi-ai'|g" \
		-e "s|'@earendil-works/pi-coding-agent'|'@earendil-works/pi-coding-agent'|g" \
		-e "s|'@earendil-works/pi-tui'|'@earendil-works/pi-tui'|g" \
		"$f"
done

# Align package.json peers with @earendil-works (upstream lists @earendil-works)
sed -i \
	-e 's|"@earendil-works/pi-agent-core"|"@earendil-works/pi-agent-core"|g' \
	-e 's|"@earendil-works/pi-ai"|"@earendil-works/pi-ai"|g' \
	-e 's|"@earendil-works/pi-coding-agent"|"@earendil-works/pi-coding-agent"|g' \
	-e 's|"@earendil-works/pi-tui"|"@earendil-works/pi-tui"|g' \
	"$VEND/package.json"

python3 -c "
import re, pathlib
for p in pathlib.Path('$VEND/extensions').glob('*.ts'):
    t = p.read_text()
    t2 = re.sub(r\"from '\\./([^']+)'\", lambda m: f\"from './{m.group(1)}.js'\" if not m.group(1).endswith('.js') else m.group(0), t)
    p.write_text(t2)
"

cat >"$VEND/UPSTREAM_PIN.md" <<EOF
# Vendored \`pi-model-router\`

- **Repository:** https://github.com/yeliu84/pi-model-router
- **License:** MIT (\`LICENSE\` in this tree)
- **Pinned upstream commit:** \`$COMMIT\`
- **Local changes:** \`extensions/*.ts\` imports use \`@earendil-works/*\` and relative paths end in \`.js\` for TypeScript nodenext.
EOF

rm -f "$VEND/package-lock.json"
echo "✓ Vendor refreshed at $VEND (commit $COMMIT)"
