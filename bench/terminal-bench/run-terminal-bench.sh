#!/usr/bin/env bash
set -euo pipefail

DATASET="${HARBOR_DATASET:-terminal-bench/terminal-bench-2}"
IMPORT_PATH="${HARBOR_AGENT_IMPORT_PATH:-bench.terminal_bench.agents.ultimate_pi_agent:UltimatePiInstalledAgent}"

export PYTHONPATH="${PYTHONPATH:-}:$(pwd)"

harbor run -d "$DATASET" --agent-import-path "$IMPORT_PATH" "$@"
