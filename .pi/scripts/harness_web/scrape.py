"""Scrape and map URLs via Scrapling fetchers."""

from __future__ import annotations

import time
from urllib.parse import urljoin, urlparse

from scrapling.fetchers import Fetcher, StealthyFetcher, StealthySession

from .config import HarnessWebConfig
from .output import write_page_markdown


def _fetch_kwargs(config: HarnessWebConfig, *, wait_ms: int | None = None) -> dict:
    kw: dict = {"timeout": config.timeout_ms}
    if config.proxy:
        kw["proxy"] = config.proxy
    if wait_ms is not None:
        kw["wait"] = wait_ms
    return kw


def fetch_page(url: str, *, config: HarnessWebConfig, fast: bool, wait_ms: int | None):
    kw = _fetch_kwargs(config, wait_ms=wait_ms)
    if fast:
        return Fetcher.get(url, timeout=config.timeout_sec, proxy=config.proxy)
    return StealthyFetcher.fetch(url, **kw)


def scrape_url(
    url: str,
    output: str,
    *,
    config: HarnessWebConfig,
    fast: bool,
    wait_ms: int | None,
) -> None:
    from pathlib import Path

    page = fetch_page(url, config=config, fast=fast, wait_ms=wait_ms)
    write_page_markdown(Path(output), page, main_content_only=True)


def scrape_url_with_highlights(
    url: str,
    markdown_output: str,
    highlights_output: str | None,
    *,
    config: HarnessWebConfig,
    fast: bool,
    wait_ms: int | None,
    highlight_query: str,
) -> None:
    import json
    from pathlib import Path

    from .highlights import extract_highlights

    page = fetch_page(url, config=config, fast=fast, wait_ms=wait_ms)
    md_path = Path(markdown_output)
    write_page_markdown(md_path, page, main_content_only=True)
    if highlights_output and highlight_query.strip():
        text = md_path.read_text(encoding="utf-8")
        spans = extract_highlights(text, highlight_query)
        hp = Path(highlights_output)
        hp.parent.mkdir(parents=True, exist_ok=True)
        hp.write_text(
            json.dumps({"url": url, "query": highlight_query, "highlights": spans}, indent=2)
            + "\n",
            encoding="utf-8",
        )


def map_url(
    url: str,
    output: str,
    *,
    config: HarnessWebConfig,
    fast: bool,
    limit: int,
) -> None:
    import json
    from pathlib import Path

    page = fetch_page(url, config=config, fast=fast, wait_ms=None)
    base = urlparse(url)
    host = (base.hostname or "").lower()
    links: list[dict[str, str]] = []
    seen: set[str] = set()

    for el in page.css("a[href]"):
        if len(links) >= limit:
            break
        href = (el.attrib.get("href") or "").strip()
        if not href or href.startswith("#") or href.lower().startswith("javascript:"):
            continue
        absolute = urljoin(url, href)
        parsed = urlparse(absolute)
        if (parsed.hostname or "").lower() != host:
            continue
        if absolute in seen:
            continue
        seen.add(absolute)
        title = (el.get_all_text(strip=True) or "").strip()
        links.append({"url": absolute, "title": title})

    out = Path(output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"url": url, "links": links}, indent=2) + "\n", encoding="utf-8")


def bulk_scrape(
    urls: list[str],
    out_dir: str,
    *,
    config: HarnessWebConfig,
    fast: bool,
    sleep_sec: float,
) -> list[str]:
    from pathlib import Path

    root = Path(out_dir)
    root.mkdir(parents=True, exist_ok=True)
    failures: list[str] = []

    if fast:
        for i, url in enumerate(urls):
            if i and sleep_sec > 0:
                time.sleep(sleep_sec)
            safe = urlparse(url).netloc.replace(".", "_") + ".md"
            dest = root / safe
            try:
                scrape_url(url, str(dest), config=config, fast=True, wait_ms=None)
            except Exception as err:  # noqa: BLE001
                failures.append(f"{url}: {err}")
        return failures

    kw = _fetch_kwargs(config)
    with StealthySession(headless=True, **kw) as session:
        for i, url in enumerate(urls):
            if i and sleep_sec > 0:
                time.sleep(sleep_sec)
            safe = urlparse(url).netloc.replace(".", "_") + ".md"
            dest = root / safe
            try:
                page = session.fetch(url)
                write_page_markdown(dest, page, main_content_only=True)
            except Exception as err:  # noqa: BLE001
                failures.append(f"{url}: {err}")
    return failures
