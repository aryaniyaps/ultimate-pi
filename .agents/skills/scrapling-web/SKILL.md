---
name: scrapling-web
description: |
  Harness web search and scrape via the local harness-web CLI (Scrapling). Use for any
  non-API web task: search, scrape URLs, map site links, bulk research fetches.
  Replaces Firecrawl in ultimate-pi harness agents. Triggers on: search the web,
  scrape URL, fetch page, research online, harness-web, .web/ artifacts.
allowed-tools:
  - Bash(python3 *harness-web.py *)
  - Bash(python3 .pi/scripts/harness-web.py *)
  - Bash(scrapling *)
---

# scrapling-web (harness-web)

Local web layer for harness agents — **no API keys**, no Docker compose stack.
Uses [Scrapling](https://scrapling.readthedocs.io/) under `node $UP_PKG/.pi/scripts/harness-web.py`.

## Install (once per machine)

```bash
command -v uv &>/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh
uv tool install "scrapling[fetchers]"
scrapling install   # browser binaries for default stealth scrape
```

Verify: `bash "$UP_PKG/.pi/scripts/harness-cli-verify.sh"`

## Output directory

Write artifacts under **`.web/`** (gitignored), not `.firecrawl/`:

| Task | Command |
|------|---------|
| Search | `python3 "$UP_PKG/.pi/scripts/harness-web.py" search "query" -o .web/search.json --limit 5` |
| Scrape URL | `python3 "$UP_PKG/.pi/scripts/harness-web.py" scrape "<url>" -o .web/page.md` |
| Fast/static scrape | add `--fast` (example.com, raw docs, localhost) |
| Map same-host links | `python3 "$UP_PKG/.pi/scripts/harness-web.py" map "<url>" -o .web/map.json --limit 50` |
| Bulk | `python3 "$UP_PKG/.pi/scripts/harness-web.py" bulk-scrape "query" -o .web/bulk/ --limit 3` |

## Search JSON shape (Firecrawl-compatible)

```bash
jq -r '.data.web[].url' .web/search.json
jq -r '.data.web[] | "\(.title): \(.url)"' .web/search.json
```

Each entry: `url`, `title`, `description`.

## Fetch modes

| Mode | When |
|------|------|
| **stealth** (default scrape) | Arbitrary URLs, JS-heavy sites |
| **fast** (`--fast` or `HARNESS_WEB_FETCH_MODE=fast`) | Static docs, example.com, localhost |
| **auto** (`HARNESS_WEB_FETCH_MODE=auto`) | fast for known-static hosts, else stealth |

Search always uses lightweight HTTP to `html.duckduckgo.com/html/`; on 403/challenge, **one** stealth retry then fail clearly.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `HARNESS_WEB_FETCH_MODE` | `stealth` | `stealth` \| `fast` \| `auto` |
| `HARNESS_WEB_SEARCH_ENGINE` | `ddg_html` | SERP backend |
| `HARNESS_WEB_PROXY` | (unset) | Proxy URL for fetch/search |
| `HARNESS_WEB_RATE_LIMIT_MS` | `2000` | Delay between bulk scrapes |
| `HARNESS_WEB_TIMEOUT_MS` | `30000` | Per-request timeout |

## Escalation

1. `harness-web search` (HTTP SERP)
2. `harness-web scrape` (stealth default)
3. `harness-web scrape --fast` when the target is known static
4. `scrapling extract …` only when harness-web flags are insufficient

## Gaps vs old Firecrawl

| Firecrawl | Harness path |
|-----------|----------------|
| `interact` | No 1:1 — rare flows use gstack browse or Scrapling MCP session |
| `agent` (structured extract) | Agent reasoning + graphify, or site-specific selectors |
| `parse` (local PDF) | Dedicated doc tools (pypdf, markitdown) |
| `crawl` (site-wide) | `map` + `bulk-scrape` or future Spiders integration |

## Ethics

Respect site terms and rate limits. SERP scraping is for dev research, not high-volume harvesting.
See [Scrapling ethical considerations](https://scrapling.readthedocs.io/en/latest/cli/extract-commands.html#legal-and-ethical-considerations).

## Drawbacks of default stealth scrape

Higher latency and RAM (Chromium per session). Use `--fast` for static docs; reuse one `bulk-scrape` run (single `StealthySession`) instead of many cold starts.
