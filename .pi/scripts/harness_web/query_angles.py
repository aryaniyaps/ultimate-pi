"""Parse and validate WRS search angles (YAML/JSON)."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore[import-untyped]
except ImportError:
    yaml = None  # type: ignore[assignment]


@dataclass(frozen=True)
class SearchAngle:
    id: str
    query: str
    rationale: str = ""


@dataclass(frozen=True)
class AnglesPlan:
    intent: str
    angles: tuple[SearchAngle, ...]
    category: str | None = None


def _heuristic_angles(query: str, *, category: str | None = None) -> AnglesPlan:
    """Emergency fallback when no expander output — templates from YAML config."""
    from .heuristic_config import build_heuristic_angles, load_heuristic_angles_config

    q = query.strip()
    cfg = load_heuristic_angles_config()
    built = build_heuristic_angles(q, category=category, config=cfg)
    if len(built) < 2:
        built = (
            SearchAngle("definitional", q, "Core intent phrasing"),
            SearchAngle("official", f"{q} official documentation", "Authoritative sources"),
        )
    return AnglesPlan(intent=q, angles=built, category=category or None)


def _parse_angle_item(raw: Any, idx: int) -> SearchAngle:
    if isinstance(raw, str):
        s = raw.strip()
        if not s:
            raise ValueError(f"angles[{idx}]: empty query string")
        return SearchAngle(id=f"angle_{idx + 1}", query=s)
    if not isinstance(raw, dict):
        raise ValueError(f"angles[{idx}]: expected object or string")
    aid = str(raw.get("id") or raw.get("name") or f"angle_{idx + 1}").strip()
    query = str(raw.get("query") or "").strip()
    if not query:
        raise ValueError(f"angles[{idx}]: missing query")
    rationale = str(raw.get("rationale") or raw.get("reason") or "").strip()
    return SearchAngle(id=aid or f"angle_{idx + 1}", query=query, rationale=rationale)


def _load_structured(data: dict[str, Any]) -> AnglesPlan:
    intent = str(data.get("intent") or data.get("query") or "").strip()
    raw_angles = data.get("angles")
    if not isinstance(raw_angles, list) or not raw_angles:
        raise ValueError("angles: expected non-empty list")
    angles = tuple(_parse_angle_item(item, i) for i, item in enumerate(raw_angles))
    if len(angles) < 2:
        raise ValueError("angles: need at least 2 entries for deep search")
    if len(angles) > 8:
        angles = angles[:8]
    category = data.get("category")
    cat_str = str(category).strip() if category else None
    return AnglesPlan(intent=intent or angles[0].query, angles=angles, category=cat_str)


def load_angles_file(path: Path) -> AnglesPlan:
    text = path.read_text(encoding="utf-8")
    # Strip markdown fences if present
    fenced = re.search(r"```(?:ya?ml|json)?\s*\n([\s\S]*?)```", text)
    if fenced:
        text = fenced.group(1)
    text = text.strip()
    if not text:
        raise ValueError(f"empty angles file: {path}")

    data: Any
    if text.startswith("{"):
        data = json.loads(text)
    elif yaml is not None:
        data = yaml.safe_load(text)
    else:
        raise SystemExit(
            "angles file is YAML but PyYAML is not installed. "
            "Use JSON angles or: pip install pyyaml"
        )
    if not isinstance(data, dict):
        raise ValueError("angles file root must be an object")
    return _load_structured(data)


def resolve_angles(
    query: str,
    *,
    angles_file: Path | None = None,
    expand_heuristic: bool = False,
    category: str | None = None,
) -> AnglesPlan:
    if angles_file is not None:
        return load_angles_file(angles_file)
    if expand_heuristic:
        return _heuristic_angles(query, category=category)
    raise SystemExit(
        "deep search requires --angles-file (.web/angles.yaml from web-query-expander) "
        "or --expand-heuristic for emergency fallback"
    )
