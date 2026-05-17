"""Environment and defaults for harness-web."""

from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import urlparse

SUPPORTED_SEARCH_ENGINES = frozenset({"ddg_html", "searxng"})


def _int_env(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _fetch_mode() -> str:
    mode = os.environ.get("HARNESS_WEB_FETCH_MODE", "stealth").strip().lower()
    if mode in ("stealth", "fast", "auto"):
        return mode
    return "stealth"


def _normalize_searxng_url(raw: str) -> str:
    url = raw.strip().rstrip("/")
    if not url:
        return ""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise SystemExit(
            f"Invalid HARNESS_WEB_SEARXNG_URL={raw!r} — expected http(s)://host[:port]"
        )
    return url


_STATIC_HOSTS = frozenset(
    {
        "example.com",
        "www.example.com",
        "localhost",
        "127.0.0.1",
    }
)


def host_is_static(url: str) -> bool:
    try:
        host = (urlparse(url).hostname or "").lower()
    except ValueError:
        return False
    if host in _STATIC_HOSTS:
        return True
    if host.endswith(".localhost"):
        return True
    return False


@dataclass(frozen=True)
class HarnessWebConfig:
    fetch_mode: str
    search_engine: str
    searxng_url: str | None
    proxy: str | None
    rate_limit_ms: int
    timeout_ms: int

    @property
    def timeout_sec(self) -> int:
        return max(1, self.timeout_ms // 1000)

    def use_fast_for_url(self, url: str, cli_fast: bool) -> bool:
        if cli_fast:
            return True
        if self.fetch_mode == "fast":
            return True
        if self.fetch_mode == "auto" and host_is_static(url):
            return True
        return False


def validate_search_config(config: HarnessWebConfig) -> None:
    engine = config.search_engine
    if engine not in SUPPORTED_SEARCH_ENGINES:
        supported = ", ".join(sorted(SUPPORTED_SEARCH_ENGINES))
        raise SystemExit(
            f"Unsupported HARNESS_WEB_SEARCH_ENGINE={engine!r} (supported: {supported})"
        )
    if engine == "searxng" and not config.searxng_url:
        raise SystemExit(
            "HARNESS_WEB_SEARCH_ENGINE=searxng requires HARNESS_WEB_SEARXNG_URL "
            "(e.g. http://127.0.0.1:8080). Run /harness-setup and choose SearXNG, or set both in .env."
        )


def load_config() -> HarnessWebConfig:
    proxy = os.environ.get("HARNESS_WEB_PROXY", "").strip() or None
    engine = os.environ.get("HARNESS_WEB_SEARCH_ENGINE", "ddg_html").strip() or "ddg_html"
    searx_raw = os.environ.get("HARNESS_WEB_SEARXNG_URL", "").strip()
    searxng_url = _normalize_searxng_url(searx_raw) if searx_raw else None
    config = HarnessWebConfig(
        fetch_mode=_fetch_mode(),
        search_engine=engine,
        searxng_url=searxng_url,
        proxy=proxy,
        rate_limit_ms=_int_env("HARNESS_WEB_RATE_LIMIT_MS", 2000),
        timeout_ms=_int_env("HARNESS_WEB_TIMEOUT_MS", 30000),
    )
    validate_search_config(config)
    return config
