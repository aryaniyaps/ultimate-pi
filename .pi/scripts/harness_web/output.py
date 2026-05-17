"""Write harness-web artifacts (JSON + markdown)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from scrapling.core.shell import Convertor


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, payload: Any) -> None:
    ensure_parent(path)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_search_results(
    path: Path,
    results: list[dict[str, str]],
    query: str,
    *,
    engine: str,
) -> None:
    """Firecrawl-compatible envelope: data.web[].url|title|description."""
    write_json(
        path,
        {
            "query": query,
            "engine": engine,
            "data": {
                "web": [
                    {
                        "url": r["url"],
                        "title": r.get("title", ""),
                        "description": r.get("description", ""),
                    }
                    for r in results
                ]
            },
        },
    )


def write_page_markdown(path: Path, page: Any, *, main_content_only: bool = True) -> None:
    ensure_parent(path)
    try:
        Convertor.write_content_to_file(
            page,
            str(path.resolve()),
            css_selector=None,
            main_content_only=main_content_only,
        )
    except ModuleNotFoundError as err:
        if "markdownify" not in str(err):
            raise
        text = page.get_all_text(strip=True) if hasattr(page, "get_all_text") else str(page)
        path.write_text(text + "\n", encoding="utf-8")
