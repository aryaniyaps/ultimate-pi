#!/usr/bin/env bash
# harness-cli-verify — install and smoke-test harness global CLI tools; fix common Linux deps.
# Used by /harness-setup Step 2. Exit 0 only if all required tools pass verification.

set -u
set -o pipefail

FORCE=false
for arg in "$@"; do
	case "$arg" in
	--force) FORCE=true ;;
	-h | --help)
		echo "Usage: $0 [--force]"
		echo "  Installs missing npm globals, fixes Linux browser libs, runs smoke tests."
		exit 0
		;;
	*)
		echo "Unknown argument: $arg" >&2
		exit 2
		;;
	esac
done

export PATH="${HOME}/.local/bin:${PATH}:$(npm prefix -g 2>/dev/null)/bin"

ROOT="$(pwd)"
FAILURES=0
WARNINGS=0

log() { printf '%s\n' "$*"; }
pass() { log "  ✓ $1"; }
warn() { log "  ! $1"; WARNINGS=$((WARNINGS + 1)); }
fail() { log "  ✗ $1"; FAILURES=$((FAILURES + 1)); }

have_cmd() { command -v "$1" &>/dev/null; }

npm_global_install() {
	local pkg="$1"
	if [ "$FORCE" = true ] || ! have_cmd "$2"; then
		log "  installing $pkg..."
		npm install -g "$pkg" || return 1
	fi
	return 0
}

apt_get_cmd() {
	command -v apt-get 2>/dev/null || command -v apt 2>/dev/null || true
}

linux_apt_install() {
	# Install apt packages when available (WSL/Debian/Ubuntu). Best-effort if sudo works.
	local pkgs=("$@")
	[ ${#pkgs[@]} -eq 0 ] && return 0
	local apt_cmd
	apt_cmd="$(apt_get_cmd)"
	if [ -z "$apt_cmd" ]; then
		return 2
	fi
	local missing=()
	for p in "${pkgs[@]}"; do
		dpkg -s "$p" &>/dev/null 2>&1 || missing+=("$p")
	done
	[ ${#missing[@]} -eq 0 ] && return 0
	log "  installing apt packages: ${missing[*]}"
	if sudo -n true 2>/dev/null; then
		sudo DEBIAN_FRONTEND=noninteractive "$apt_cmd" update -qq
		sudo DEBIAN_FRONTEND=noninteractive "$apt_cmd" install -y "${missing[@]}" || {
			warn "apt install failed — run: sudo apt-get install -y ${missing[*]}"
			return 1
		}
	else
		return 2
	fi
	return 0
}

linux_pkg_install() {
	# Debian/Ubuntu, RHEL/Fedora, or Arch — best-effort system deps for headless Chrome.
	local pkgs_deb=(
		libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2
		libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1
		libasound2 libpango-1.0-0 libcairo2 libx11-6 libxcb1 libxext6 fonts-liberation
	)
	if [ -n "$(apt_get_cmd)" ]; then
		linux_apt_install "${pkgs_deb[@]}"
		return $?
	fi
	if command -v dnf &>/dev/null && sudo -n true 2>/dev/null; then
		sudo dnf install -y nss nspr atk at-spi2-atk cups-libs libdrm libxkbcommon \
			libXcomposite libXdamage libXfixes libXrandr mesa-libgbm alsa-lib \
			pango cairo libX11 libxcb libXext liberation-fonts 2>/dev/null && return 0
		return 2
	fi
	if command -v pacman &>/dev/null && sudo -n true 2>/dev/null; then
		sudo pacman -S --noconfirm nss nspr atk at-spi2-atk cups libdrm libxkbcommon \
			libxcomposite libxdamage libxfixes libxrandr mesa gbm alsa-lib \
			pango cairo libx11 libxcb libxext ttf-liberation 2>/dev/null && return 0
		return 2
	fi
	return 2
}

# Playwright / agent-browser Chrome on Linux (libnspr4.so, etc.)
ensure_linux_browser_deps() {
	[ "$(uname -s)" != "Linux" ] && return 0
	local rc=0
	linux_pkg_install || rc=$?
	if [ "$rc" -eq 2 ]; then
		return 2
	fi
	return 0
}

verify_agent_browser() {
	log "[agent-browser]"
	npm_global_install "agent-browser" "agent-browser" || { fail "agent-browser npm install"; return; }

	local deps_rc=0
	ensure_linux_browser_deps || deps_rc=$?
	if ! agent-browser install 2>/dev/null; then
		warn "agent-browser install (Chrome binary) failed — may still work with system Chrome"
	fi

	local out
	out="$(agent-browser open "about:blank" 2>&1)" || true
	if echo "$out" | grep -qiE 'shared libraries|libnspr4|cannot open shared object'; then
		warn "Chrome missing system libs — installing OS packages"
		if [ "$deps_rc" -eq 2 ] || ! ensure_linux_browser_deps; then
			warn "Could not auto-install OS packages (need sudo). Debian/Ubuntu: sudo apt-get install -y libnss3 libnspr4 libgbm1 libatk1.0-0 libx11-6"
		fi
		if sudo -n true 2>/dev/null; then
			agent-browser install --with-deps 2>/dev/null || true
		else
			warn "Run manually: agent-browser install --with-deps"
		fi
		out="$(agent-browser open "about:blank" 2>&1)" || true
	fi

	if echo "$out" | grep -qiE 'shared libraries|libnspr4|Auto-launch failed'; then
		if [ "$deps_rc" -eq 2 ]; then
			warn "agent-browser needs Linux system libs (manual): sudo apt-get install -y libnss3 libnspr4 libgbm1 && agent-browser install --with-deps"
		else
			fail "agent-browser runtime failed after dep install — see stderr above"
		fi
	else
		pass "agent-browser $(agent-browser --version 2>/dev/null | head -1)"
		agent-browser close 2>/dev/null || true
	fi

	mkdir -p .pi/harness
	if [ ! -f .pi/harness/browser.json ]; then
		echo '{"headless": true, "timeout": 30000, "viewport": {"width": 1280, "height": 720}}' >.pi/harness/browser.json
	fi
}

verify_firecrawl() {
	log "[firecrawl-cli]"
	npm_global_install "firecrawl-cli@latest" "firecrawl" || { fail "firecrawl-cli npm install"; return; }
	if firecrawl --status &>/dev/null; then
		pass "firecrawl $(firecrawl --status 2>/dev/null | head -1 || echo ok)"
	else
		fail "firecrawl --status failed (run: firecrawl login)"
	fi
}

verify_ctx7() {
	log "[ctx7]"
	npm_global_install "ctx7@latest" "ctx7" || { fail "ctx7 npm install"; return; }
	if ctx7 --help &>/dev/null; then
		pass "ctx7"
	else
		fail "ctx7 --help failed"
	fi
}

verify_ck() {
	log "[ck-search]"
	npm_global_install "@beaconbay/ck-search" "ck" || { fail "ck-search npm install"; return; }
	if ! ck --version &>/dev/null; then
		fail "ck --version failed"
		return
	fi
	# Fast grep-mode smoke (no embedding model download)
	local ck_target="."
	[ -d .pi ] && ck_target=".pi"
	if ck -l 1 "export" "$ck_target" 2>/dev/null | head -1 | grep -q .; then
		pass "ck $(ck --version 2>/dev/null | head -1)"
	elif ck --status "$ck_target" 2>/dev/null | head -1 | grep -q .; then
		pass "ck $(ck --version 2>/dev/null | head -1) (index status ok)"
	else
		warn "ck installed but smoke search empty"
	fi
}

verify_biome() {
	log "[biome]"
	npm_global_install "@biomejs/biome" "biome" || { fail "biome npm install"; return; }
	if biome --version &>/dev/null; then
		pass "biome $(biome --version 2>/dev/null | head -1)"
	else
		fail "biome --version failed"
	fi
}

verify_sg() {
	log "[ast-grep]"
	npm_global_install "@ast-grep/cli@latest" "sg" || { fail "ast-grep npm install"; return; }
	if ! sg --version &>/dev/null; then
		fail "sg --version failed"
		return
	fi
	if sg -p 'export' -l ts .pi 2>/dev/null | head -1 | grep -q .; then
		pass "ast-grep $(sg --version 2>/dev/null | head -1)"
	else
		# Still pass if binary works
		pass "ast-grep $(sg --version 2>/dev/null | head -1) (pattern scan skipped)"
	fi
}

verify_gh() {
	log "[gh]"
	if ! have_cmd gh; then
		if [ -n "$(apt_get_cmd)" ] && sudo -n true 2>/dev/null; then
			log "  installing gh via apt..."
			sudo DEBIAN_FRONTEND=noninteractive "$(apt_get_cmd)" update -qq
			sudo DEBIAN_FRONTEND=noninteractive "$(apt_get_cmd)" install -y gh 2>/dev/null || true
		fi
	fi
	if have_cmd gh && gh --version &>/dev/null; then
		pass "gh $(gh --version 2>/dev/null | head -1)"
		if gh auth status &>/dev/null 2>&1; then
			pass "gh authenticated"
			if [ -d .git ]; then
				gh label create "harness" --color "0366d6" --description "Agentic harness managed" 2>/dev/null || true
				gh label create "harness-spec" --color "0e8a16" --description "Hardened specification" 2>/dev/null || true
				gh label create "harness-plan" --color "fbca04" --description "Structured plan generated" 2>/dev/null || true
				gh label create "harness-critic" --color "d73a4a" --description "Adversarial review" 2>/dev/null || true
			fi
		else
			warn "gh not authenticated (run: gh auth login)"
		fi
	else
		warn "gh not installed — https://cli.github.com/ (optional for issue specs)"
	fi
}

verify_sentrux() {
	log "[sentrux]"
	if ! have_cmd sentrux || [ "$FORCE" = true ]; then
		if curl -fsSL https://raw.githubusercontent.com/sentrux/sentrux/main/install.sh | sh; then
			export PATH="${HOME}/.local/bin:${PATH}"
		else
			fail "sentrux install script failed"
			return
		fi
	fi
	if ! sentrux --version &>/dev/null; then
		fail "sentrux --version failed"
		return
	fi
	sentrux plugin add-standard 2>/dev/null || warn "sentrux plugin add-standard skipped"
	_bootstrap="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)/harness-sentrux-bootstrap.mjs"
	if [ -f "$_bootstrap" ]; then
		node "$_bootstrap" --force 2>/dev/null ||
			warn "sentrux rules bootstrap failed (see harness-sentrux-setup skill)"
	fi
	if sentrux check . &>/dev/null; then
		pass "sentrux $(sentrux --version 2>/dev/null | head -1)"
	else
		warn "sentrux check . failed (rules may need manifest sync)"
	fi
}

log "Harness CLI verification (cwd: $ROOT)"
log ""

verify_firecrawl
verify_ctx7
verify_agent_browser
verify_ck
verify_biome
verify_sg
verify_gh
verify_sentrux

log ""
if [ "$FAILURES" -gt 0 ]; then
	log "FAILED: $FAILURES required tool(s). Fix errors above and re-run."
	exit 1
fi
if [ "$WARNINGS" -gt 0 ]; then
	log "OK with $WARNINGS warning(s) (optional tools or auth)."
else
	log "All harness CLI tools verified."
fi
exit 0
