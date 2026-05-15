#!/usr/bin/env bash
# harness-graphify-bootstrap — install graphify and build graphify-out for the current repo.
# Used by /harness-setup. Do not use deprecated `graphify . --wiki` (invalid CLI).

set -euo pipefail

FORCE=false
for arg in "$@"; do
	case "$arg" in
	--force) FORCE=true ;;
	-h | --help)
		echo "Usage: $0 [--force]"
		echo "  --force   rebuild even when graphify-out/graph.json already exists"
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

# Python 3.10+
if ! python3 --version 2>/dev/null | grep -qE 'Python 3\.(1[0-9]|[2-9][0-9])'; then
	die "Python 3.10+ required (got: $(python3 --version 2>/dev/null || echo missing))"
fi
log "✓ Python 3.10+"

PIP_CMD=""
command -v pip &>/dev/null && PIP_CMD=pip
[ -z "$PIP_CMD" ] && command -v pip3 &>/dev/null && PIP_CMD=pip3

graphify_installed() {
	command -v graphify &>/dev/null && return 0
	[ -n "$PIP_CMD" ] && $PIP_CMD show graphifyy &>/dev/null 2>&1 && return 0
	command -v uv &>/dev/null && uv pip show graphifyy &>/dev/null 2>&1 && return 0
	command -v uv &>/dev/null && uv tool list 2>/dev/null | grep -qE '(^|[[:space:]])graphifyy([[:space:]]|$)' && return 0
	dpkg -l 2>/dev/null | grep -qE '^ii[[:space:]]+(python3-)?graphify' && return 0
	apt list --installed 2>/dev/null | grep -qiE '(^|/)python3?-?graphify' && return 0
	return 1
}

install_graphify() {
	if command -v uv &>/dev/null; then
		uv tool install graphifyy
	elif [ -n "$PIP_CMD" ]; then
		$PIP_CMD install --user graphifyy
	else
		die "Need uv, pip, or pip3 to install graphifyy"
	fi
	export PATH="${HOME}/.local/bin:${PATH}"
	command -v graphify &>/dev/null || die "graphify not on PATH after install (try: export PATH=\"\$HOME/.local/bin:\$PATH\")"
}

graphify_platform_install() {
	graphify install --platform pi 2>/dev/null || graphify pi install 2>/dev/null || true
	if [ -d .cursor ]; then
		graphify cursor install 2>/dev/null || true
	fi
	if [ -f AGENTS.md ] || [ -d .pi ]; then
		graphify codex install 2>/dev/null || true
	fi
}

graph_is_valid() {
	python3 - <<'PY'
import json
import sys
from pathlib import Path

root = Path("graphify-out")
gj = root / "graph.json"
gr = root / "GRAPH_REPORT.md"
if not gj.is_file() or not gr.is_file():
    sys.exit(1)
data = json.loads(gj.read_text(encoding="utf-8"))
nodes = data.get("nodes") or []
if len(nodes) < 1:
    sys.exit(1)
edges = data.get("edges") or data.get("links") or []
print(f"nodes={len(nodes)} edges={len(edges)}")
PY
}

has_llm_key() {
	[ -n "${GEMINI_API_KEY:-}" ] || [ -n "${GOOGLE_API_KEY:-}" ] || \
		[ -n "${MOONSHOT_API_KEY:-}" ] || [ -n "${ANTHROPIC_API_KEY:-}" ] || \
		[ -n "${OPENAI_API_KEY:-}" ]
}

mkdir -p graphify-out ./raw

if ! graphify_installed; then
	log "Installing graphifyy..."
	install_graphify
fi

command -v graphify &>/dev/null || die "graphify CLI not found after install"
log "✓ graphify ($(command -v graphify))"

graphify_platform_install

NEED_BUILD=true
if [ "$FORCE" = false ] && graph_is_valid 2>/dev/null; then
	NEED_BUILD=false
	log "✓ Existing graphify-out/graph.json ($(graph_is_valid))"
fi

export GRAPHIFY_VIZ_NODE_LIMIT="${GRAPHIFY_VIZ_NODE_LIMIT:-200000}"

if [ "$NEED_BUILD" = true ] || [ "$FORCE" = true ]; then
	log "Building knowledge graph for codebase (graphify update .)..."
	if ! graphify update .; then
		die "graphify update . failed — graphify-out was not created"
	fi
	if ! graph_is_valid 2>/dev/null; then
		die "graphify update . finished but graphify-out/graph.json is missing or empty"
	fi
	log "✓ Code graph built ($(graph_is_valid))"
	if has_llm_key; then
		log "LLM API key detected — running full semantic extract (graphify extract .)..."
		if graphify extract .; then
			if graph_is_valid 2>/dev/null; then
				log "✓ Full graph built ($(graph_is_valid))"
			else
				log "! graphify extract finished but graph validation failed; code-only graph remains"
			fi
		else
			log "! graphify extract failed; keeping code-only graph from graphify update ."
		fi
	else
		log "No LLM API key — code-only graph (AST). Set GEMINI_API_KEY or OPENAI_API_KEY and re-run with --force for semantic extraction."
	fi
else
	log "Refreshing code graph (graphify update .)..."
	graphify update . || die "graphify update . failed"
fi

if [ -d .git ]; then
	graphify hook install 2>/dev/null && log "✓ graphify git hooks installed" || log "! graphify hook install skipped or failed"
else
	log "! Not a git repo — skipped graphify hook install"
fi

log "Graph output: graphify-out/"
ls -la graphify-out/ 2>/dev/null | head -20 || true
