---
description: Full harness bootstrap — Graphify knowledge graph setup, optional self-hosted firecrawl (Docker), CLI tools install, pi extension packages, and verification. Run once per project.
argument-hint: "[--skip-graphify] [--skip-tools] [--skip-firecrawl-self] [--force]"
---

# harness-setup — Full Harness Bootstrap

Bootstraps the complete ultimate-pi agentic harness: Graphify knowledge graph, CLI tools, pi extension packages, configuration files, and verification. Idempotent — safe to re-run, skips what's already installed.

## Parse arguments

Read `$ARGUMENTS` and map flags:

- `--skip-graphify`
- `--skip-tools`
- `--skip-firecrawl-self`
- `--force`

If a flag is unknown, stop and return:

`Usage: /harness-setup [--skip-graphify] [--skip-tools] [--skip-firecrawl-self] [--force]`

## Step 0 — Pre-flight Environment Check

```bash
which node && node --version
which npm && npm --version
which git && git --version
```

Block if node < 18, npm < 9, or git missing. Report versions and continue.

Read `.pi/auto-commit.json` for co-author + branch config. Read `.pi/settings.json` for extension packages list.

## Step 0.5 — Graphify Setup

Check if Graphify is installed and set up:

```bash
# Check Python 3.10+
python3 --version | grep -q "3\.1[0-9]" && echo "✓ Python 3.10+" || echo "✗ Need Python 3.10+"

# Check if Graphify is installed
if pip show graphifyy &>/dev/null; then
  echo "✓ Graphify installed"
  GRAPHIFY_INSTALLED=true
else
  echo "! Graphify not installed"
  GRAPHIFY_INSTALLED=false
fi

# Check if graph already exists
test -f graphify-out/graph.json && GRAPH_EXISTS=true || GRAPH_EXISTS=false
```

**Present to user:**

### Case A: Graphify installed + graph exists
> "Graphify ready. Existing graph: `graphify-out/`. Run `graphify . --update` to refresh."

### Case B: Graphify installed + no graph
> "Graphify installed but no graph built yet. Build one now?"

### Case C: Graphify not installed
> "Graphify not found. Install: `pip install graphifyy && graphify install`. Install now?"

### Case D: Python too old
> "Python 3.10+ required for Graphify. Current: `$(python3 --version)`. Install Python 3.10+ before continuing."

## Step 1 — Build Knowledge Graph

```bash
# Install if needed
if [ "$GRAPHIFY_INSTALLED" != "true" ]; then
  pip install graphifyy && graphify install
fi

# Build the graph (or update existing)
if [ "$GRAPH_EXISTS" = "true" ]; then
  graphify . --update --wiki
else
  graphify . --wiki
fi

# Install git hooks — auto-update graph on commit/checkout
graphify hook install

# Quick stats
echo "Graph built. Output: graphify-out/"
ls graphify-out/
```

Read and summarize `graphify-out/GRAPH_REPORT.md` — show god nodes and surprising connections.

Create project directories needed for graphify + harness workflow:
```bash
mkdir -p ./raw .pi/harness/specs .pi/harness/runs .pi/harness/incidents .pi/harness/debates
```

## Step 1.5 — Optional Self-Hosted Firecrawl

Ask: "Use self-hosted Firecrawl (local Docker) or cloud (api.firecrawl.dev)? [cloud/self]"
Default: **cloud**.

If user chooses **self**:

### 1.5.1 — Docker Engine Install

Check if Docker is already available:
```bash
if ! command -v docker &>/dev/null; then
	# Detect OS and install Docker Engine
	if [ -f /etc/os-release ]; then
		. /etc/os-release
		case "$ID" in
			ubuntu|debian)
				curl -fsSL https://get.docker.com | sh
				;;
				fedora|rhel|centos)
				curl -fsSL https://get.docker.com | sh
				;;
				arch)
				pacman -S --noconfirm docker
				;;
			*)
				echo "Unsupported distro: $ID. Install Docker manually: https://docs.docker.com/engine/install/"
				;;
		esac
	elif command -v brew &>/dev/null; then
		# macOS — install Docker Desktop via brew
		brew install --cask docker
	else
		echo "Cannot detect OS. Install Docker manually: https://docs.docker.com/engine/install/"
	fi

	# Enable and start Docker
	sudo systemctl enable --now docker 2>/dev/null || true

	# Add current user to docker group (no sudo needed)
	sudo usermod -aG docker $USER 2>/dev/null || true
	newgrp docker 2>/dev/null || echo "Docker group added. Restart terminal or run: newgrp docker"
fi
```

Verify:
```bash
docker --version
docker compose version
```

Block if Docker install fails. Show manual install link.

### 1.5.2 — Set Up Self-Hosted Firecrawl Files

The `firecrawl/` directory in the project root contains all self-hosted config:

```
firecrawl/
├── docker-compose.yaml   # Multi-service compose (API, Playwright, Redis, RabbitMQ, Postgres, SearXNG)
├── README.md             # Self-hosted usage docs
├── .env.template         # Environment variables template
└── searxng/
    ├── searxng.env       # SearXNG-specific env
    └── settings.yml      # SearXNG engine config
```

Create `.env` from template if missing:
```bash
if [ ! -f firecrawl/.env ]; then
	if [ -f firecrawl/.env.template ]; then
		cp firecrawl/.env.template firecrawl/.env
		echo "Created firecrawl/.env from template."
	else
		cat > firecrawl/.env << 'EOF'
# Firecrawl Self-Hosted Configuration
PORT=3002
INTERNAL_PORT=3002
REDIS_URL=redis://redis:6379
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
USE_DB_AUTHENTICATION=false
NUM_WORKERS_PER_QUEUE=8
CRAWL_CONCURRENT_REQUESTS=10
MAX_CONCURRENT_JOBS=5
BROWSER_POOL_SIZE=5
BULL_AUTH_KEY=changeme
SEARXNG_EXTERNAL_PORT=8080
# Optional AI: uncomment and set
# OPENAI_API_KEY=
# OPENAI_BASE_URL=
# MODEL_NAME=
# OLLAMA_BASE_URL=
EOF
		echo "Created firecrawl/.env with defaults."
	fi
fi
```

### 1.5.3 — Start Services

```bash
docker compose -f firecrawl/docker-compose.yaml up -d
```

Wait for health:
```bash
echo "Waiting for services to be healthy..."
for i in $(seq 1 30); do
	if curl -sf http://localhost:3002/v1/health &>/dev/null; then
		echo "✓ Firecrawl API is healthy"
		break
	fi
	sleep 2
done
```

### 1.5.4 — Verify Self-Hosted Instance

```bash
curl -sf http://localhost:3002/v1/health && echo "✓ Self-hosted Firecrawl running on :3002" || echo "✗ Firecrawl not healthy yet — check: docker compose -f firecrawl/docker-compose.yaml logs"
docker compose -f firecrawl/docker-compose.yaml ps
```

If user chose **cloud**, skip all 1.5.x steps. Just note:
> "Using cloud Firecrawl. Ensure `FIRECRAWL_API_KEY` is set. Run `firecrawl login` in Step 2.1."

## Step 2 — Install Global CLI Packages

Check each package first. Install only if missing unless `--force` flag.

### 2.1 — firecrawl-cli (Web Search + Scrape + Crawl + Interact + Download + Parse)

```bash
if ! command -v firecrawl &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g firecrawl-cli@latest
fi
```

Verify:
```bash
firecrawl --status
```

**If self-hosted mode (Step 1.5 was chosen):** skip cloud auth. Point CLI at local instance:
```bash
export FIRECRAWL_API_URL=http://localhost:3002
export FIRECRAWL_API_KEY=""
```
Add to shell profile for persistence:
```bash
echo 'export FIRECRAWL_API_URL=http://localhost:3002' >> ~/.bashrc 2>/dev/null
echo 'export FIRECRAWL_API_KEY=""' >> ~/.bashrc 2>/dev/null
```

**If cloud mode:** authenticate if not already:
```bash
firecrawl login --browser
# OR
firecrawl login --api-key "<key>"
```

Install skills and run quick smoke test:
```bash
firecrawl setup skills
mkdir -p .firecrawl
firecrawl scrape "https://firecrawl.dev" -o .firecrawl/install-check.md
```

### 2.2 — ctx7 (Context7 Library Docs + Skills Management)

```bash
if ! command -v ctx7 &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g ctx7@latest
fi
```

Verify: `ctx7 --help`

Offer login for higher rate limits:
```bash
ctx7 login
ctx7 whoami
```

### 2.3 — agent-browser (Vercel Labs Browser Automation for AI Agents)

```bash
if ! command -v agent-browser &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g agent-browser
fi
```

Verify:
```bash
agent-browser --version
```

Create config directory:
```bash
mkdir -p .pi/harness
```

Create default browser config if missing:
```bash
if [ ! -f .pi/harness/browser.json ]; then
	echo '{"headless": true, "timeout": 30000, "viewport": {"width": 1280, "height": 720}}' > .pi/harness/browser.json
fi
```

### 2.4 — ck-search (Semantic Code Search)

```bash
if ! command -v ck &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g @beaconbay/ck-search
fi
```

Verify: `ck --version`

Register as MCP server (if Claude MCP available):
```bash
claude mcp list 2>/dev/null && claude mcp add ck-search -s user -- ck --serve || echo "MCP not available — ck will be used as CLI only"
```

### 2.5 — biome (Lint + Format Gate)

```bash
if ! command -v biome &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g @biomejs/biome
fi
```

Check if project already has biome config:
```bash
ls biome.json 2>/dev/null && echo "biome.json found — using project config" || echo "No biome.json — using defaults"
```

Verify: `biome --version`

### 2.6 — ast-grep (AST-Aware Structural Code Search)

```bash
if ! command -v sg &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g @ast-grep/cli@latest
fi
```

Verify:
```bash
sg --version && echo "✓ ast-grep installed" || echo "✗ ast-grep install failed"
```

ast-grep is the primary code search tool. It uses tree-sitter for AST-aware pattern matching — understands code structure, not just text. Replaces grep for code search tasks.

Quick smoke test:
```bash
# Search for function definitions across the codebase
sg -p 'function $NAME($$$ARGS) { $$$BODY }' --json 2>/dev/null | head -5 && echo "✓ ast-grep pattern matching works" || echo "! ast-grep smoke test — may need language-specific config"
```

### 2.7 — gh CLI (GitHub Issues Spec Storage — ADR-025)

```bash
if ! command -v gh &>/dev/null || [ "$FORCE" = "true" ]; then
	echo "gh CLI not found. Install: https://cli.github.com/"
fi
```

Verify and authenticate:
```bash
gh auth status && echo "gh authenticated" || echo "Run: gh auth login"
```

Create harness labels if authenticated:
```bash
if gh auth status &>/dev/null; then
	gh label create "harness" --color "0366d6" --description "Agentic harness managed" 2>/dev/null
	gh label create "harness-spec" --color "0e8a16" --description "Hardened specification" 2>/dev/null
	gh label create "harness-plan" --color "fbca04" --description "Structured plan generated" 2>/dev/null
	gh label create "harness-critic" --color "d73a4a" --description "Adversarial review" 2>/dev/null
fi
```

### 2.8 — sentrux (Architectural Quality Gate + MCP Sensor)

```bash
if ! command -v sentrux &>/dev/null || [ "$FORCE" = "true" ]; then
	curl -fsSL https://raw.githubusercontent.com/sentrux/sentrux/main/install.sh | sh
fi
```

Verify:
```bash
sentrux --version && echo "✓ sentrux installed" || echo "✗ sentrux install failed"
```

Install all 52 language plugins:
```bash
sentrux plugin add-standard 2>/dev/null || echo "Plugins already installed or failed"
```

Configure MCP server in `.pi/mcp.json` (see Step 4.3).

Generate architectural rules from the harness manifest (creates/updates `.sentrux/rules.toml`):
```bash
npm run harness:sentrux-sync
```

Edit layers/boundaries in `.pi/harness/sentrux/architecture.manifest.json` when the repo layout changes, then re-run sync. Custom TOML below the `harness:managed` markers is preserved.

Verify rules:
```bash
sentrux check . && echo "✓ sentrux rules pass" || echo "✗ sentrux check failed"
```

Set up structural regression baseline (optional):
```bash
sentrux gate --save . 2>/dev/null || echo "Baseline will be saved on first gate run"
```

## Step 3 — Pi Extension Packages

Install pi extension packages from `.pi/settings.json`:

```bash
cd .pi/npm
npm install
```

Verify each package:

| Package | Purpose | Phase |
|---------|---------|-------|
| `@posthog/pi` | Analytics event capture | F0 |
| `pi-lean-ctx` | Context runtime (read/bash/find/grep/MCP bridge) | F0 |
| `@tintinweb/pi-subagents` | L4 critic sub-agent spawn/control | P16 |
| `@yeliu84/pi-model-router` | Per-turn intelligent model routing (auto high/medium/low tier selection) | F0 |

## Step 3.5 — Model Router Configuration (Dynamic)

`.pi/model-router.json` is **user-specific** (differs per user's providers).
It is gitignored. Generate it dynamically from your `.env`.

The script below:
1. Detects available AI providers from env vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, and `OPENAI_API_BASE` to detect opencode gateway)
2. Generates a full `model-router.json` with `auto`, `cheap`, and `deep` profiles
3. Only writes if file doesn't exist yet (safe to re-run, will skip existing)

```bash
# Verify package installed first
ls .pi/npm/node_modules/@yeliu84/pi-model-router/package.json 2>/dev/null \
  && echo "✓ model-router package" \
  || echo "✗ model-router package — run: cd .pi/npm && npm install"

# Generate config from detected providers (only if missing)
if [ -f .pi/model-router.json ]; then
  echo "✓ .pi/model-router.json already exists — preserving user config"
else
  node << 'GENDONE'
const fs = require('fs');
const path = '.pi/model-router.json';

// --- Detect providers from env ---
const hasOpenCode = process.env.OPENAI_API_BASE?.includes('opencode.ai');
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const hasGoogle = !!process.env.GOOGLE_API_KEY;

// If opencode gateway is detected, prefer opencode-go/ models
// Otherwise use standard provider prefixes
const P = hasOpenCode ? 'opencode-go' : 'openai';

function model(prefix, name) { return `${prefix}/${name}`; }

// Best available high-end model per provider
const highModel = hasOpenCode
  ? model('opencode-go', 'deepseek-v4-pro')
  : hasOpenAI
    ? model('openai', 'gpt-5.4-pro')
    : hasAnthropic
      ? 'anthropic/claude-3-5-sonnet-20241022'
      : 'google/gemini-2.5-flash-001';

const mediumModel = hasOpenCode
  ? model('opencode-go', 'qwen3.6-plus')
  : hasOpenAI
    ? model('openai', 'gpt-5.4-nano')
    : hasAnthropic
      ? 'anthropic/claude-3-5-sonnet-20241022'
      : 'google/gemini-flash-latest';

const lowModel = hasOpenCode
  ? model('opencode-go', 'deepseek-v4-flash')
  : hasOpenAI
    ? model('openai', 'gpt-5.4-nano')
    : hasAnthropic
      ? 'anthropic/claude-3-haiku-20240307'
      : 'google/gemini-flash-lite-latest';

const fallbacks = [];
if (hasAnthropic && !highModel.startsWith('anthropic/')) fallbacks.push('anthropic/claude-3-5-sonnet-20241022');
if (hasGoogle && !highModel.startsWith('google/')) fallbacks.push('google/gemini-flash-latest');

const config = {
  defaultProfile: 'auto',
  debug: false,
  classifierModel: mediumModel,
  phaseBias: 0.5,
  maxSessionBudget: 1.0,
  largeContextThreshold: 100000,
  rules: [
    {
      matches: ['deploy', 'production', 'release'],
      tier: 'high',
      reason: 'Safety check for production tasks'
    },
    { matches: 'changelog', tier: 'low' }
  ],
  profiles: {
    auto: {
      high: { model: highModel, thinking: 'high', fallbacks },
      medium: { model: mediumModel, thinking: 'medium' },
      low: { model: lowModel, thinking: 'low' }
    },
    cheap: {
      high: { model: mediumModel, thinking: 'low' },
      medium: { model: lowModel, thinking: 'off' },
      low: { model: lowModel, thinking: 'off' }
    },
    deep: {
      high: { model: highModel, thinking: 'xhigh', fallbacks },
      medium: { model: mediumModel, thinking: 'medium' },
      low: { model: lowModel, thinking: 'low' }
    }
  }
};

fs.mkdirSync('.pi', { recursive: true });
fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
console.log('✓ Generated .pi/model-router.json from detected providers:');
if (hasOpenCode) console.log('  Provider: opencode gateway');
if (hasOpenAI) console.log('  Detected: OPENAI_API_KEY');
if (hasAnthropic) console.log('  Detected: ANTHROPIC_API_KEY');
if (hasGoogle) console.log('  Detected: GOOGLE_API_KEY');
console.log(`  High tier: ${highModel}`);
console.log(`  Medium tier: ${mediumModel}`);
console.log(`  Low tier: ${lowModel}`);
GENDONE
fi
```

Do NOT block. If generation fails, warn in report and continue.

**Router activation happens automatically** — the agent should output the following as its next message (this activates the router in the current session):

> `/router profile auto`

The pi TUI will intercept this and activate the `auto` profile. Then continue to Step 4.

## Step 4 — Configuration Files

### 4.1 — .gitignore Entries

Ensure `.gitignore` contains:
```
.firecrawl/
.raw/
.vault-meta/
.pi/harness/critics/
.pi/harness/plans/
.pi/harness/specs/

# Model router config (user-specific — generated from env)
.pi/model-router.json

# sentrux baselines and local meta (rules.toml is committed)
.sentrux/*
!.sentrux/
!.sentrux/rules.toml
```

### 4.2 — MCP Server Configuration

Add sentrux MCP server to `.pi/mcp.json`:
```json
{
  "mcpServers": {
    "context-mode": {
      "command": "context-mode"
    },
    "sentrux": {
      "command": "sentrux",
      "args": ["--mcp"]
    }
  }
}
```

This gives agents real-time access to structural health metrics:
- `scan` — quality signal, file count, bottleneck detection
- `session_start` / `session_end` — baseline comparison, degradation detection
- `check_rules` — architectural constraint enforcement
- `health`, `rescan`, `evolution`, `dsm`, `test_gaps`

### 4.3 — Project AGENTS.md

Create a minimal `AGENTS.md` in the project root for agent onboarding:

```markdown
# ultimate-pi: Agentic Harness

Purpose: Agentic coding harness — architecture, research, decisions, implementation.
Owner: pi-mono + user
Created: $(date +%Y-%m-%d)

## Structure

- graphify-out/ → Knowledge graph (run `graphify .` to build)
- ./raw/ → Source documents for graphify ingestion
- .pi/harness/specs/ → Harness contracts and schema docs
- .pi/harness/incidents/ → Incident and override records
- .pi/skills/ → Agent skills
- .pi/agents/ → Specialized agents

## Graphify-First Workflow

1. Run `graphify . --wiki` to build the knowledge graph
2. Read `graphify-out/GRAPH_REPORT.md` for god nodes and surprising connections
3. Query: `graphify query "question"`
4. Harness contracts and governance records in `.pi/harness/specs/` and `.pi/harness/incidents/`

## Conventions

- Graph before grep — always consult the knowledge graph first
- ./raw/ is source storage for graphify
- Decisions and incidents in `.pi/harness/` with structured artifacts
- `graphify . --update` after significant changes
- ast-grep (`sg`) is the default code search tool — use `sg -p 'pattern'` for structural search, never grep for code
- Create `.sg/rules/` for project-wide code quality rules
```

## Step 5 — Verification

Run full verification suite:

```bash
# CLI tools
firecrawl --status 2>/dev/null && echo "✓ firecrawl" || echo "✗ firecrawl"
ctx7 --help 2>/dev/null && echo "✓ ctx7" || echo "✗ ctx7"
agent-browser --version 2>/dev/null && echo "✓ agent-browser" || echo "✗ agent-browser"
ck --version 2>/dev/null && echo "✓ ck-search" || echo "✗ ck-search"
biome --version 2>/dev/null && echo "✓ biome" || echo "✗ biome"
sg --version 2>/dev/null && echo "✓ ast-grep" || echo "✗ ast-grep"
gh --version 2>/dev/null && echo "✓ gh" || echo "✗ gh"
sentrux --version 2>/dev/null && echo "✓ sentrux" || echo "✗ sentrux"

# pi extensions
cd .pi/npm && npm ls 2>/dev/null && echo "✓ pi extensions" || echo "✗ pi extensions"

# graphify knowledge graph
pip show graphifyy 2>/dev/null && echo "✓ graphify installed" || echo "✗ graphify not installed"
ls graphify-out/graph.json 2>/dev/null && echo "✓ knowledge graph built" || echo "✗ no graph built yet"
graphify hook status 2>/dev/null && echo "✓ graphify git hooks installed" || echo "✗ graphify git hooks not installed"

# model router
ls .pi/npm/node_modules/@yeliu84/pi-model-router/package.json 2>/dev/null && echo "✓ model-router package" || echo "✗ model-router package"
ls .pi/model-router.json 2>/dev/null && echo "✓ model-router config" || echo "✗ model-router config"

# raw folder for graphify sources
ls -d ./raw 2>/dev/null && echo "✓ ./raw directory exists" || echo "! ./raw directory missing"

# gitignore entries
grep -q '.firecrawl/' .gitignore 2>/dev/null && echo "✓ .gitignore" || echo "! .gitignore missing entries"
```

## Step 6 — Graph Knowledge Report Bootstrap

After graph is built, read and display key findings:

```bash
# Show graph stats
python3 -c "
import json
with open('graphify-out/graph.json') as f:
    g = json.load(f)
nodes = g['nodes']
edges = g['edges']
communities = len(set(n.get('community', 0) for n in nodes))
god_nodes = sorted(nodes, key=lambda n: n.get('degree', 0), reverse=True)[:5]
print(f'Nodes: {len(nodes)}  |  Edges: {len(edges)}  |  Communities: {communities}')
print(f'God nodes: {[n[\"label\"] for n in god_nodes]}')
" 2>/dev/null || echo "Graph not yet built"
```

Summarize `graphify-out/GRAPH_REPORT.md` to the user.

## Step 7 — Report

Output summary table:

| Component | Status | Detail |
|-----------|--------|--------|
| Knowledge Graph | ✓/✗ | `graphify-out/graph.json` — graph status |
| Graphify Hooks | ✓/✗ | git post-commit/post-checkout hooks |
| firecrawl-cli | ✓/✗ | Auth: yes/no |
| ctx7 | ✓/✗ | Login: yes/no |
| agent-browser | ✓/✗ | Config: .pi/harness/browser.json |
| ck-search | ✓/✗ | MCP: registered/CLI-only |
| biome | ✓/✗ | Project config: found/default |
| ast-grep | ✓/✗ | AST-aware code search (`sg`)
| gh CLI | ✓/✗ | Auth: yes/no |
| sentrux | ✓/✗ | Version + plugins: 52 languages |
| pi extensions | ✓/✗ | 4 packages |
| model router | ✓/✗ | Package + config verified, activation via `/router profile auto` |

| .gitignore | ✓/✗ | 7 entries added |
| ./raw directory | ✓/✗ | Created for graphify source ingestion |
| Firecrawl mode | self/cloud | Self-hosted on :3002 / Cloud (api.firecrawl.dev) |
| Docker Engine | ✓/✗/N/A | Installed / Not needed (cloud mode) |

Next steps:
1. If tools missing: re-run with `--force` or install individually
2. If graph not built: run `graphify . --wiki`
3. If hooks not installed: run `graphify hook install`
4. If gh not authenticated: `gh auth login`
5. If self-hosted Firecrawl unhealthy: `docker compose -f firecrawl/docker-compose.yaml logs`
6. If sentrux plugins missing: `sentrux plugin add-standard`
7. First harness run: `/harness "your task description"`

## Guard Rails

- **Internet required**: Several tools need npm registry access. Block if offline.
- **Graphify requires Python 3.10+**: Check `python3 --version`. Block if too old.
- **Node.js >= 18 required**: Some pi packages use modern Node APIs.
- **Docker required for self-hosted**: Step 1.5 needs Docker Engine + Compose. Block if install fails.
- **Sufficient RAM for self-hosted**: Firecrawl stack needs ~8GB+ free (API: 8G, Playwright: 4G, others).
- **Idempotent**: All checks skip if already installed. `--force` overrides.
- **No destructive actions**: Creates files only if missing. Never overwrites existing content.
- **Partial success**: If some tools fail, report which and continue. User can fix individually.
- **Rate limits**: ctx7 login is optional. firecrawl auth is required for cloud; none needed for self-hosted.


## Error Handling

| Error | Action |
|-------|--------|
| Node < 18 | Block. Report required version. |
| npm not found | Block. Suggest install method per OS. |
| Python < 3.10 | Block. Report required Python version for Graphify. |
| Graphify install fails | Show pip error output. Suggest `pip install --upgrade pip` and retry. |
| graphify hook install fails | Hooks need `.git/` directory. Verify inside git repo. Manual: `git config core.hooksPath .pi/git-hooks` |
| firecrawl auth failed | Show manual login instructions. Continue with other tools. |
| gh not installed | Show GitHub CLI install link. Skip label creation. |
| pi packages install fail | Show error output. Check npm permissions. |
| graph already exists | Report state. Offer `graphify . --update` to refresh. |
| biome.json missing | Create minimal config. |
| settings.json not writable | Warn. Settings won't persist across sessions. |
| No internet | Block for tool installs. Continue for graphify-only steps if `--skip-tools`. |
| Docker not running | Start: `sudo systemctl start docker`. Block if cannot start. |
| Docker install fails | Show manual link: https://docs.docker.com/engine/install/. Block Step 1.5, continue rest. |
| Port 3002 already in use | Warn. User must free port or change `PORT` in `firecrawl/.env`. |
| Self-hosted health check timeout | Show logs: `docker compose -f firecrawl/docker-compose.yaml logs`. Continue — may need more time. |
| sentrux install fails | Show install script output. Fallback: download from https://github.com/sentrux/sentrux/releases/latest |

## Flags

| Flag | Effect |
|------|--------|
| `--skip-graphify` | Skip Step 1 (graph build). Use when graph already exists. |
| `--skip-tools` | Skip Step 2 (CLI tool installs). Use when tools already set up. |
| `--skip-firecrawl-self` | Skip Step 1.5 (self-hosted Firecrawl). Always use cloud. |
| `--force` | Reinstall all tools even if already present. Overwrite existing files. |

