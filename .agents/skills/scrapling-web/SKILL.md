---
name: scrapling-web
description: |
  Harness web search and scrape via pi tools web_search and web_fetch (harness-web.py).
  Use for any non-API web task: search, scrape URLs, map site links, bulk research fetches.
  Replaces Firecrawl in ultimate-pi harness agents. Triggers on: search the web,
  scrape URL, fetch page, research online, web_search, web_fetch, .web/ artifacts.
---

# scrapling-web (harness-web)

Local web layer for harness agents — **no API keys** for default search/scrape.
Pi registers **`web_search`** and **`web_fetch`** (wrap `harness-web.py` with Scrapling bootstrap).
Optional **self-hosted SearXNG** — see `/harness-setup` Step 4.0b.

## Agent tools (preferred)

| Task | Tool |
|------|------|
| Search (SERP) | `web_search` with `query` |
| Search + multi-scrape | `web_search` with `bulk: true` |
| Scrape URL | `web_fetch` with `url` (default mode `scrape`) |
| Map same-host links | `web_fetch` with `mode: map` |
| Static / simple page | `web_fetch` with `fast: true` |

**Never before search/fetch:** resolve `UP_PKG`, `ls harness-web.py`, `python3 -c "import scrapling"`, or Firecrawl/curl/wget/scrapling CLI for SERP or page fetch.

Full JSON/markdown lives under **`.web/`** (gitignored). Use `read` on `output` paths after tool calls.

## Install (once per machine — setup/humans only)

```bash
command -v uv &>/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh
uv tool install "scrapling[fetchers]"
scrapling install   # browser binaries for default stealth scrape
```

Verify: `bash "$UP_PKG/.pi/scripts/harness-cli-verify.sh"`  
Config diagnostics: `python3 "$UP_PKG/.pi/scripts/harness-web.py" status` (JSON; setup only)

## Bash fallback (if pi tools unavailable)

| Task | Command |
|------|---------|
| Search | `python3 "$UP_PKG/.pi/scripts/harness-web.py" search "query" -o .web/search.json --limit 5` |
| Scrape | `python3 "$UP_PKG/.pi/scripts/harness-web.py" scrape "<url>" -o .web/page.md` |
| Fast/static | add `--fast` |
| Map | `python3 "$UP_PKG/.pi/scripts/harness-web.py" map "<url>" -o .web/map.json` |
| Bulk | `python3 "$UP_PKG/.pi/scripts/harness-web.py" bulk-scrape "query" -o .web/bulk/` |

## Search JSON shape (Firecrawl-compatible)

```bash
jq -r '.data.web[].url' .web/search.json
```

Each entry: `url`, `title`, `description`.

## Fetch modes

| Mode | When |
|------|------|
| **stealth** (default) | Arbitrary URLs, JS-heavy sites |
| **fast** (`fast: true` / `--fast`) | Static docs, example.com, localhost |
| **auto** (`HARNESS_WEB_FETCH_MODE=auto`) | fast for known-static hosts, else stealth |

| Search backend | Behavior |
|--------------|----------|
| `ddg_html` (default) | DuckDuckGo HTML SERP |
| `searxng` | JSON at `HARNESS_WEB_SEARXNG_URL` — bootstrap via `harness-searxng-bootstrap.mjs` |

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `HARNESS_WEB_FETCH_MODE` | `stealth` | `stealth` \| `fast` \| `auto` |
| `HARNESS_WEB_SEARCH_ENGINE` | `ddg_html` | `ddg_html` \| `searxng` |
| `HARNESS_WEB_SEARXNG_URL` | (unset) | Required when `SEARCH_ENGINE=searxng` |

## Escalation

1. `web_search` / `web_fetch`
2. `web_fetch` with `fast: true` for static hosts
3. `web_fetch` with `mode: map` then targeted fetches
4. Site-specific Scrapling only when tools are insufficient (not for routine SERP/fetch)

## Gaps vs Firecrawl

| Firecrawl | Harness path |
|-----------|----------------|
| `interact` | gstack browse or manual browser |
| `agent` | Agent reasoning + graphify |
| `parse` (PDF) | pypdf, markitdown |
| `crawl` | `web_search` bulk or map + multiple `web_fetch` |

## Ethics

Respect site terms and rate limits. SERP scraping is for dev research, not high-volume harvesting.
