"""SearXNG JSON search API (self-hosted instances)."""

from __future__ import annotations

import json
import ssl
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import ProxyHandler, Request, build_opener, urlopen

from .config import HarnessWebConfig


def _open_url(url: str, *, config: HarnessWebConfig) -> tuple[int, str]:
    req = Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "ultimate-pi-harness-web/1.0"},
        method="GET",
    )
    if config.proxy:
        opener = build_opener(ProxyHandler({"http": config.proxy, "https": config.proxy}))
        resp = opener.open(req, timeout=config.timeout_sec)
    else:
        ctx = ssl.create_default_context()
        resp = urlopen(req, timeout=config.timeout_sec, context=ctx)
    try:
        status = getattr(resp, "status", 200) or 200
        body = resp.read().decode("utf-8", errors="replace")
        return status, body
    finally:
        resp.close()


def _parse_results(payload: Any, limit: int) -> list[dict[str, str]]:
    raw = payload.get("results") if isinstance(payload, dict) else None
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    for item in raw:
        if len(out) >= limit:
            break
        if not isinstance(item, dict):
            continue
        url = (item.get("url") or "").strip()
        if not url.startswith("http"):
            continue
        title = (item.get("title") or "").strip()
        description = (item.get("content") or item.get("snippet") or "").strip()
        out.append({"url": url, "title": title, "description": description})
    return out


def search_searxng(
    query: str,
    *,
    limit: int,
    config: HarnessWebConfig,
) -> list[dict[str, str]]:
    base = config.searxng_url
    if not base:
        raise SystemExit("HARNESS_WEB_SEARXNG_URL is not set")

    qs = urlencode({"q": query, "format": "json", "pageno": "1"})
    url = f"{base}/search?{qs}"

    try:
        status, body = _open_url(url, config=config)
    except HTTPError as err:
        status = err.code
        body = err.read().decode("utf-8", errors="replace") if err.fp else ""
    except URLError as err:
        raise SystemExit(
            f"SearXNG request failed ({err.reason}). "
            f"Is the instance running at {base}? "
            "Run: node \"$UP_PKG/.pi/scripts/harness-searxng-bootstrap.mjs\""
        ) from err

    if status == 403:
        raise SystemExit(
            "SearXNG returned 403 for format=json. Enable json under search.formats "
            "in settings.yml (see .searxng/core-config/settings.yml or SearXNG docs)."
        )
    if status != 200:
        snippet = body[:200].replace("\n", " ")
        raise SystemExit(f"SearXNG search failed (HTTP {status}): {snippet}")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError as err:
        raise SystemExit(f"SearXNG returned non-JSON response from {url}") from err

    results = _parse_results(payload, limit)
    if not results and isinstance(payload, dict):
        unresponsive = payload.get("unresponsive_engines")
        if unresponsive:
            raise SystemExit(
                f"SearXNG returned no results; upstream engines unresponsive: {unresponsive}"
            )
    return results
