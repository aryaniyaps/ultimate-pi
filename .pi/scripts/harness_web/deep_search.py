"""WRS deep search orchestration."""

from __future__ import annotations

import os
from pathlib import Path

from .config import HarnessWebConfig
from .multi_search import multi_search
from .query_angles import AnglesPlan, resolve_angles
from .rank import fuse_angle_results


def _rerank_mode() -> str:
    mode = os.environ.get("HARNESS_WEB_RERANK", "off").strip().lower()
    if mode in ("off", "lexical", "embed"):
        return mode
    return "off"


def run_deep_search(
    query: str,
    *,
    config: HarnessWebConfig,
    angles_file: Path | None = None,
    expand_heuristic: bool = False,
    category: str | None = None,
    per_angle_limit: int = 8,
    final_limit: int = 10,
) -> tuple[AnglesPlan, list[dict]]:
    plan = resolve_angles(
        query,
        angles_file=angles_file,
        expand_heuristic=expand_heuristic,
        category=category,
    )
    per_angle = multi_search(plan, per_angle_limit=per_angle_limit, config=config)
    # Strip internal tags before fusion
    clean: dict[str, list[dict[str, str]]] = {}
    for aid, rows in per_angle.items():
        clean[aid] = [
            {
                "url": r.get("url", ""),
                "title": r.get("title", ""),
                "description": r.get("description", ""),
            }
            for r in rows
        ]
    ranked = fuse_angle_results(
        clean,
        final_limit=final_limit,
        intent=plan.intent,
        rerank_mode=_rerank_mode(),
    )
    return plan, [h.to_web_dict() for h in ranked]
