# Firecrawl Self-Hosted

Web scraping infrastructure for the pi harness. Runs entirely in Docker — no local source checkout needed.

## Quick Start

```bash
# 1. Create your env file
cp .env.template .env
# Edit .env if needed (defaults work for local dev)

# 2. Pull pre-built images and start
docker compose -f firecrawl/docker-compose.yaml up -d

# 3. Verify
curl http://localhost:3002/v1/health
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| `api` | 3002 | Firecrawl API + Bull queue UI at `/admin/<BULL_AUTH_KEY>/queues` |
| `playwright-service` | 3000 (internal) | Headless browser rendering |
| `redis` | 6379 (internal) | Job queue backing store |
| `rabbitmq` | 5672 (internal) | Message broker for workers |
| `nuq-postgres` | 5432 (internal) | Crawl state persistence |
| `searxng` | 8080 | Metasearch engine for `/search` API |
| `searxng-valkey` | 6379 (internal) | SearXNG cache |

## Configuration

All config lives in `.env`. See `.env.template` for all available options.

### Enabling AI features

Uncomment and set `OPENAI_API_KEY` in `.env`. Also supports Ollama and any OpenAI-compatible endpoint.

### Using local builds instead of pre-built images

Flip the `image:` ↔ `build:` lines in `docker-compose.yaml` for `api`, `playwright-service`, and `nuq-postgres`. You'll need the Firecrawl repo checked out alongside this one at `../firecrawl-selfhosted/apps/`.

## SDK Usage

When using Firecrawl SDKs with a self-hosted instance, pass the base URL — no API key required:

```js
const client = new Firecrawl({ apiKey: "", baseUrl: "http://localhost:3002" });
```
