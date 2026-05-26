"""Build evidence-bundle.json from search-deep + optional highlight fetches."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def build_evidence_bundle(
    search_deep_path: Path,
    *,
    highlight_files: dict[str, Path] | None = None,
    query: str = "",
) -> dict[str, Any]:
    data = json.loads(search_deep_path.read_text(encoding="utf-8"))
    intent = data.get("query") or query
    hits = data.get("data", {}).get("web", [])
    sources: list[dict[str, Any]] = []
    for hit in hits:
        url = hit.get("url", "")
        entry: dict[str, Any] = {
            "url": url,
            "title": hit.get("title", ""),
            "description": hit.get("description", ""),
            "score": hit.get("score"),
            "angle_ids": hit.get("angle_ids", []),
        }
        if highlight_files and url in highlight_files:
            hp = highlight_files[url]
            if hp.exists():
                try:
                    entry["highlights"] = json.loads(hp.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    pass
        sources.append(entry)
    return {
        "intent": intent,
        "mode": data.get("mode", "deep"),
        "engine": data.get("engine", ""),
        "sources": sources,
    }


def write_evidence_bundle(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
