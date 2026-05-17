"""DuckDuckGo HTML SERP search via HTTP Fetcher."""

from __future__ import annotations

from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from scrapling.fetchers import Fetcher, StealthyFetcher

from .config import HarnessWebConfig

DDG_HTML_URL = "https://html.duckduckgo.com/html/"
CHALLENGE_MARKERS = (
    "anomaly-modal",
    "bots use duckduckgo",
    "please complete the following challenge",
    "duckduckgo.com/y.js",
)


def _unwrap_ddg_href(href: str) -> str:
    if not href:
        return ""
    if href.startswith("//"):
        href = "https:" + href
    parsed = urlparse(href)
    if "duckduckgo.com" in (parsed.hostname or "") and parsed.path.startswith("/l/"):
        qs = parse_qs(parsed.query)
        if "uddg" in qs and qs["uddg"]:
            return unquote(qs["uddg"][0])
    return href


def _looks_like_challenge(html: str) -> bool:
    lower = html.lower()
    return any(m in lower for m in CHALLENGE_MARKERS)


def _parse_serp(page: Any, limit: int) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for block in page.css(".result"):
        if len(results) >= limit:
            break
        links = block.css(".result__a")
        if not links:
            continue
        link = links[0]
        href = _unwrap_ddg_href(link.attrib.get("href", ""))
        if not href.startswith("http"):
            continue
        title = (link.text or "").strip()
        snippet_el = block.css(".result__snippet")
        description = ""
        if snippet_el:
            description = (snippet_el[0].get_all_text(strip=True) or "").strip()
        results.append({"url": href, "title": title, "description": description})
    return results


def search_ddg(
    query: str,
    *,
    limit: int,
    config: HarnessWebConfig,
    impersonate: bool = True,
) -> list[dict[str, str]]:
    kwargs: dict = {
        "params": {"q": query},
        "timeout": config.timeout_sec,
    }
    if config.proxy:
        kwargs["proxy"] = config.proxy
    if impersonate:
        kwargs["impersonate"] = "chrome"

    page = Fetcher.get(DDG_HTML_URL, **kwargs)
    status = getattr(page, "status", 200)
    html = getattr(page, "html_content", "") or ""

    if status == 403 or _looks_like_challenge(html):
        page = StealthyFetcher.fetch(
            DDG_HTML_URL,
            params={"q": query},
            timeout=config.timeout_ms,
            proxy=config.proxy,
            headless=True,
        )
        html = getattr(page, "html_content", "") or ""
        if _looks_like_challenge(html):
            raise SystemExit(
                "Search engine blocked (403/challenge page). "
                "Try later, set HARNESS_WEB_PROXY, or reduce query rate."
            )

    parsed = _parse_serp(page, limit)
    if not parsed and html:
        # Empty selector set — likely HTML shape change
        if "result__a" not in html:
            raise SystemExit(
                "Could not parse DuckDuckGo HTML results (page layout may have changed)."
            )
    return parsed
