#!/usr/bin/env bash
# git-sync helper — reads .pi/auto-commit.json and outputs co-author config
# Usage: source git-sync-config.sh && echo $CO_AUTHOR_LINE

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${1:-.pi/auto-commit.json}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "ERROR: Config file not found: $CONFIG_FILE" >&2
  exit 1
fi

# Extract values using python (available everywhere)
read -r CO_AUTHOR_LOGIN CO_AUTHOR_EMAIL PROTECTED_BRANCHES STRATEGY SCOPE_DEFAULT TYPE_DEFAULT <<< "$(python3 -c "
import json, sys
with open('$CONFIG_FILE') as f:
    c = json.load(f)
co = c.get('coAuthor', {})
br = c.get('branch', {})
msg = c.get('message', {})
print(
    co.get('login', 'pi-mono'),
    co.get('email', '261679550+pi-mono@users.noreply.github.com'),
    ','.join(br.get('protected', ['main', 'master'])),
    br.get('strategy', 'auto-feature-branch'),
    msg.get('scopeDefault', 'harness'),
    msg.get('typeDefault', 'chore')
)
")"

export CO_AUTHOR_LOGIN CO_AUTHOR_EMAIL PROTECTED_BRANCHES STRATEGY SCOPE_DEFAULT TYPE_DEFAULT
export CO_AUTHOR_LINE="Co-authored-by: ${CO_AUTHOR_LOGIN} <${CO_AUTHOR_EMAIL}>"

# Output for verification
if [[ "${2:-}" == "show" ]]; then
  echo "Login:             ${CO_AUTHOR_LOGIN}"
  echo "Email:             ${CO_AUTHOR_EMAIL}"
  echo "Co-author line:    ${CO_AUTHOR_LINE}"
  echo "Protected branches:${PROTECTED_BRANCHES}"
  echo "Branch strategy:   ${STRATEGY}"
  echo "Default scope:     ${SCOPE_DEFAULT}"
  echo "Default type:      ${TYPE_DEFAULT}"
fi