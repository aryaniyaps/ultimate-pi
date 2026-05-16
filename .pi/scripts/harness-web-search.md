# harness-web search (internal)

## Engine

Default: DuckDuckGo static HTML — `GET https://html.duckduckgo.com/html/?q=…`

Implemented in `harness_web/search_ddg.py` via `Fetcher.get` (HTTP, not a browser per query).

## Selectors

| Field | CSS |
|-------|-----|
| Result block | `.result` |
| Title + link | `.result__a` |
| Snippet | `.result__snippet` |

DDG redirect URLs (`//duckduckgo.com/l/?uddg=…`) are unwrapped to the target `uddg` parameter.

## Challenge detection

If status 403 or HTML contains challenge markers (`anomaly-modal`, etc.), retry **once** with `StealthyFetcher`, then exit with a clear “search engine blocked” message.

## Output

`.web/search.json` — envelope compatible with legacy Firecrawl skills:

```json
{
  "query": "...",
  "engine": "ddg_html",
  "data": { "web": [{ "url", "title", "description" }] }
}
```
