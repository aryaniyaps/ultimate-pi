#!/usr/bin/env bash
# harness-cocoindex-bootstrap — install CocoIndex Code (ccc), seed settings, build index.
# Non-interactive (no `ccc init` prompts). Used by harness-cli-verify and /harness-setup.

set -euo pipefail

FORCE=false
for arg in "$@"; do
	case "$arg" in
	--force) FORCE=true ;;
	-h | --help)
		echo "Usage: $0 [--force]"
		echo "  --force   rebuild index even when cocoindex.db exists"
		exit 0
		;;
	*)
		echo "Unknown argument: $arg" >&2
		exit 2
		;;
	esac
done

export PATH="${HOME}/.local/bin:${PATH}"

log() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

ROOT="$(pwd)"

if ! python3 --version 2>/dev/null | grep -qE 'Python 3\.(1[0-9]|[2-9][0-9])'; then
	die "Python 3.10+ required (got: $(python3 --version 2>/dev/null || echo missing))"
fi
log "✓ Python 3.10+"

cocoindex_installed() {
	command -v ccc &>/dev/null && return 0
	command -v uv &>/dev/null && uv tool list 2>/dev/null | grep -qE '(^|[[:space:]])cocoindex-code([[:space:]]|$)' && return 0
	return 1
}

install_cocoindex() {
	if command -v uv &>/dev/null; then
		log "Installing cocoindex-code[full] via uv tool..."
		uv tool install 'cocoindex-code[full]'
	elif command -v pipx &>/dev/null; then
		log "Installing cocoindex-code[full] via pipx..."
		pipx install 'cocoindex-code[full]'
	else
		die "Need uv or pipx to install cocoindex-code[full]"
	fi
	export PATH="${HOME}/.local/bin:${PATH}"
	command -v ccc &>/dev/null || die "ccc not on PATH after install"
}

if ! cocoindex_installed; then
	install_cocoindex
fi
command -v ccc &>/dev/null || die "ccc CLI not found"
log "✓ ccc ($(command -v ccc))"

CCC_BIN="$(command -v ccc)"
CCC_PYTHON=""
if [ -f "$CCC_BIN" ]; then
	CCC_PYTHON="$(sed -n '1s/^#!//p' "$CCC_BIN" | tr -d '\r')"
fi
if [ -z "$CCC_PYTHON" ] || [ ! -x "$CCC_PYTHON" ]; then
	CCC_VENV="$(cd "$(dirname "$CCC_BIN")/.." && pwd)"
	CCC_PYTHON="$CCC_VENV/bin/python"
fi
if [ ! -x "$CCC_PYTHON" ]; then
	CCC_PYTHON="$(command -v python3)"
fi

# Seed global + project settings and merge harness exclude_patterns (non-interactive).
"$CCC_PYTHON" - <<'PY'
from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("error: PyYAML required for harness cocoindex bootstrap", file=sys.stderr)
    sys.exit(1)

ROOT = Path(os.environ.get("HARNESS_COCOINDEX_ROOT", ".")).resolve()
SETTINGS_DIR = ROOT / ".cocoindex_code"
PROJECT_SETTINGS = SETTINGS_DIR / "settings.yml"
USER_DIR = Path.home() / ".cocoindex_code"
USER_SETTINGS = USER_DIR / "global_settings.yml"

HARNESS_EXCLUDES = [
    "graphify-out/**",
    "raw/**",
    ".raw/**",
    ".pi/wiki-search/**",
    "vendor/**",
    "node_modules/**",
    "**/graph.html",
    "**/*.jsonl",
    ".cursor/**",
]

DEFAULT_GLOBAL = {
    "embedding": {
        "provider": "sentence-transformers",
        "model": "Snowflake/snowflake-arctic-embed-xs",
    }
}


def load_yaml(path: Path) -> dict:
    if not path.is_file():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def save_yaml(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, default_flow_style=False), encoding="utf-8")


# Global settings (offline embeddings — no LiteLLM prompt).
if not USER_SETTINGS.is_file():
    save_yaml(USER_SETTINGS, DEFAULT_GLOBAL)
    print(f"Created {USER_SETTINGS}")

# Project settings — minimal file with merged excludes only.
project = load_yaml(PROJECT_SETTINGS)
excludes = list(project.get("exclude_patterns") or [])
seen = set(excludes)
for pat in HARNESS_EXCLUDES:
    if pat not in seen:
        excludes.append(pat)
        seen.add(pat)
project["exclude_patterns"] = excludes
save_yaml(PROJECT_SETTINGS, project)
print(f"Ensured project settings: {PROJECT_SETTINGS}")

# .gitignore entry (mirror ccc init behavior).
gitignore = ROOT / ".gitignore"
entry = "/.cocoindex_code/"
comment = "# CocoIndex Code (ccc)"
if (ROOT / ".git").is_dir() and gitignore.is_file():
    lines = gitignore.read_text(encoding="utf-8").splitlines()
    if entry not in lines:
        content = gitignore.read_text(encoding="utf-8")
        if content and not content.endswith("\n"):
            content += "\n"
        content += f"{comment}\n{entry}\n"
        gitignore.write_text(content, encoding="utf-8")
elif (ROOT / ".git").is_dir():
    gitignore.write_text(f"{comment}\n{entry}\n", encoding="utf-8")
PY

NEED_INDEX=true
if [ "$FORCE" = false ] && [ -f ".cocoindex_code/cocoindex.db" ]; then
	NEED_INDEX=false
	log "✓ Existing cocoindex.db (use --force to rebuild)"
fi

if [ "$NEED_INDEX" = true ] || [ "$FORCE" = true ]; then
	log "Building semantic code index (ccc index)..."
	ccc index
fi

if ccc doctor 2>/dev/null; then
	log "✓ ccc doctor"
else
	log "! ccc doctor reported issues (see output above)"
fi

if ccc status 2>/dev/null | head -5; then
	log "✓ ccc status"
else
	log "! ccc status unavailable"
fi

log "CocoIndex output: .cocoindex_code/"
