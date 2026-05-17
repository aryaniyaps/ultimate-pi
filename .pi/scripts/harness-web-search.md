# harness-web search (internal)

Routing: `harness_web/search.py` dispatches by `HARNESS_WEB_SEARCH_ENGINE`.

## Engines

| Value | Module | Notes |
|-------|--------|-------|
| `ddg_html` (default) | `search_ddg.py` | DuckDuckGo HTML SERP via Scrapling HTTP (+ one stealth retry on challenge) |
| `searxng` | `search_searxng.py` | Self-hosted JSON API — requires `HARNESS_WEB_SEARXNG_URL` |

Bootstrap local SearXNG: `node "$UP_PKG/.pi/scripts/harness-searxng-bootstrap.mjs"`

## DuckDuckGo HTML (`ddg_html`)

`GET https://html.duckduckgo.com/html/?q=…`

### Selectors

| Field | CSS |
|-------|-----|
| Result block | `.result` |
| Title + link | `.result__a` |
| Snippet | `.result__snippet` |

DDG redirect URLs (`//duckduckgo.com/l/?uddg=…`) are unwrapped to the target `uddg` parameter.

### Challenge detection

If status 403 or HTML contains challenge markers (`anomaly-modal`, etc.), retry **once** with `StealthyFetcher`, then exit with a clear “search engine blocked” message.

## SearXNG (`searxng`)

`GET {HARNESS_WEB_SEARXNG_URL}/search?q=…&format=json&pageno=1`

- No client API token (SearXNG has no standard search API key).
- `search.formats` in instance `settings.yml` must include `json` or the API returns **403**.
- Public instances are unsuitable (~4 JSON req/hr when limiter on; JSON often disabled). Use self-hosted bootstrap.

## Output

`.web/search.json` — envelope compatible with legacy Firecrawl skills:

```json
{
  "query": "...",
  "engine": "ddg_html",
  "data": { "web": [{ "url", "title", "description" }] }
}
```

`engine` reflects the active backend (`ddg_html` or `searxng`).
