"""Route harness-web search to the configured SERP backend."""

from __future__ import annotations

from .config import HarnessWebConfig, validate_search_config
from .search_ddg import search_ddg
from .search_searxng import search_searxng


def search(
    query: str,
    *,
    limit: int,
    config: HarnessWebConfig,
) -> list[dict[str, str]]:
    validate_search_config(config)
    engine = config.search_engine
    if engine == "searxng":
        return search_searxng(query, limit=limit, config=config)
    if engine == "ddg_html":
        return search_ddg(query, limit=limit, config=config)
    raise SystemExit(f"Unsupported HARNESS_WEB_SEARCH_ENGINE={engine!r}")
