"""Load and merge WRS heuristic angle templates from YAML."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from .query_angles import SearchAngle

try:
    import yaml  # type: ignore[import-untyped]
except ImportError:
    yaml = None  # type: ignore[assignment]

CONFIG_BASENAME = "web-heuristic-angles.yaml"
CONFIG_JSON_BASENAME = "web-heuristic-angles.json"
ENV_CONFIG_FILE = "HARNESS_WEB_HEURISTIC_ANGLES_FILE"


@dataclass(frozen=True)
class HeuristicAnglesConfig:
    max_angles: int
    base: tuple[SearchAngle, ...]
    categories: dict[str, tuple[SearchAngle, ...]]


def _project_root() -> Path:
    env = os.environ.get("HARNESS_PROJECT_ROOT", "").strip()
    if env:
        return Path(env).resolve()
    return Path.cwd().resolve()


def _package_root() -> Path | None:
    env = os.environ.get("HARNESS_PKG_ROOT", "").strip()
    if env:
        return Path(env).resolve()
    here = Path(__file__).resolve()
    for anc in here.parents:
        if (anc / ".pi" / "harness" / CONFIG_BASENAME).is_file():
            return anc
    return None


def discover_heuristic_config_paths() -> list[Path]:
    """Package defaults first, then project override, then env file last (wins on id)."""
    paths: list[Path] = []
    pkg = _package_root()
    if pkg is not None:
        pkg_yaml = pkg / ".pi" / "harness" / CONFIG_BASENAME
        pkg_json = pkg / ".pi" / "harness" / CONFIG_JSON_BASENAME
        if pkg_yaml.is_file():
            paths.append(pkg_yaml)
        if pkg_json.is_file() and pkg_json not in paths:
            paths.append(pkg_json)
    proj_file = _project_root() / ".pi" / "harness" / CONFIG_BASENAME
    if proj_file.is_file() and proj_file not in paths:
        paths.append(proj_file)
    env_path = os.environ.get(ENV_CONFIG_FILE, "").strip()
    if env_path:
        p = Path(env_path).expanduser().resolve()
        if p.is_file() and p not in paths:
            paths.append(p)
    return paths


def _format_query(template: str, query: str) -> str:
    return template.replace("{query}", query.strip())


def _parse_angle_list(raw: Any, *, source: str) -> list[SearchAngle]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ValueError(f"{source}: expected list of angle objects")
    out: list[SearchAngle] = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            raise ValueError(f"{source}[{i}]: expected object")
        aid = str(item.get("id") or item.get("name") or f"angle_{i + 1}").strip()
        qtpl = str(item.get("query") or "").strip()
        if not aid or not qtpl:
            raise ValueError(f"{source}[{i}]: id and query required")
        rationale = str(item.get("rationale") or item.get("reason") or "").strip()
        out.append(
            SearchAngle(
                id=aid,
                query=qtpl,
                rationale=rationale,
            )
        )
    return out


def _merge_config_dict(accum: dict[str, Any], layer: dict[str, Any]) -> dict[str, Any]:
    out = dict(accum)
    if "max_angles" in layer:
        out["max_angles"] = layer["max_angles"]
    if "version" in layer:
        out["version"] = layer["version"]
    base_acc = list(out.get("base") or [])
    base_acc.extend(layer.get("base") or [])
    out["base"] = base_acc
    cats: dict[str, list[Any]] = dict(out.get("categories") or {})
    layer_cats = layer.get("categories")
    if isinstance(layer_cats, dict):
        for key, angles in layer_cats.items():
            cat = str(key).strip().lower()
            if not cat:
                continue
            existing = list(cats.get(cat) or [])
            if isinstance(angles, list):
                existing.extend(angles)
            cats[cat] = existing
    out["categories"] = cats
    return out


def _load_config_file(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        data = json.loads(text)
    elif yaml is not None:
        data = yaml.safe_load(text)
    else:
        raise ValueError(f"PyYAML required to load {path} (or use .json)")
    if not isinstance(data, dict):
        raise ValueError(f"{path}: root must be a mapping")
    return data


def _embedded_builtin_dict() -> dict[str, Any]:
    """Fallback when no config files load (stdlib shipped defaults)."""
    pkg = _package_root()
    if pkg is not None:
        for name in (CONFIG_JSON_BASENAME, CONFIG_BASENAME):
            pkg_file = pkg / ".pi" / "harness" / name
            if not pkg_file.is_file():
                continue
            try:
                return _load_config_file(pkg_file)
            except (ValueError, json.JSONDecodeError, OSError):
                continue
    from .heuristic_angles_shipped import SHIPPED_HEURISTIC_ANGLES

    return dict(SHIPPED_HEURISTIC_ANGLES)


def heuristic_config_from_merged(merged: dict[str, Any]) -> HeuristicAnglesConfig:
    max_angles = int(merged.get("max_angles") or 5)
    max_angles = max(2, min(max_angles, 8))

    base_templates = _parse_angle_list(merged.get("base"), source="base")
    raw_cats = merged.get("categories")
    categories: dict[str, tuple[SearchAngle, ...]] = {}
    if isinstance(raw_cats, dict):
        for key, raw_list in raw_cats.items():
            cat = str(key).strip().lower()
            if not cat:
                continue
            categories[cat] = tuple(
                _parse_angle_list(raw_list, source=f"categories.{cat}")
            )

    if "default" not in categories:
        categories["default"] = (
            SearchAngle("technical", "{query} how it works architecture", "Technical"),
            SearchAngle("criticism", "{query} limitations criticism", "Counterpoints"),
        )

    return HeuristicAnglesConfig(
        max_angles=max_angles,
        base=tuple(base_templates),
        categories=categories,
    )


@lru_cache(maxsize=8)
def load_heuristic_angles_config_cached(paths_key: tuple[str, ...]) -> HeuristicAnglesConfig:
    paths = [Path(p) for p in paths_key] if paths_key else discover_heuristic_config_paths()
    layers: list[dict[str, Any]] = []
    for p in paths:
        try:
            layers.append(_load_config_file(p))
        except (ValueError, json.JSONDecodeError, OSError):
            continue
    if layers:
        merged: dict[str, Any] = {}
        for layer in layers:
            merged = _merge_config_dict(merged, layer)
    else:
        merged = _embedded_builtin_dict()
    return heuristic_config_from_merged(merged)


def load_heuristic_angles_config() -> HeuristicAnglesConfig:
    paths = discover_heuristic_config_paths()
    return load_heuristic_angles_config_cached(tuple(str(p) for p in paths))


def clear_heuristic_config_cache() -> None:
    load_heuristic_angles_config_cached.cache_clear()


def build_heuristic_angles(
    query: str,
    *,
    category: str | None = None,
    config: HeuristicAnglesConfig | None = None,
) -> tuple[SearchAngle, ...]:
    cfg = config or load_heuristic_angles_config()
    q = query.strip()
    cat = (category or "").strip().lower()

    angles: list[SearchAngle] = []
    for tmpl in cfg.base:
        angles.append(
            SearchAngle(
                id=tmpl.id,
                query=_format_query(tmpl.query, q),
                rationale=tmpl.rationale,
            )
        )

    cat_angles = cfg.categories.get(cat) if cat else None
    if not cat_angles:
        cat_angles = cfg.categories.get("default", ())

    for tmpl in cat_angles:
        angles.append(
            SearchAngle(
                id=tmpl.id,
                query=_format_query(tmpl.query, q),
                rationale=tmpl.rationale,
            )
        )

    # Stable dedupe by id (first wins — base before category)
    seen: set[str] = set()
    unique: list[SearchAngle] = []
    for a in angles:
        if a.id in seen:
            continue
        seen.add(a.id)
        unique.append(a)

    return tuple(unique[: cfg.max_angles])
