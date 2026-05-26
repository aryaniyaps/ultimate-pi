"""Parallel SERP queries per search angle."""

from __future__ import annotations

import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from .config import HarnessWebConfig
from .query_angles import AnglesPlan, SearchAngle
from .search import search


def _concurrency() -> int:
    raw = os.environ.get("HARNESS_WEB_DEEP_CONCURRENCY", "4").strip()
    try:
        return max(1, min(8, int(raw)))
    except ValueError:
        return 4


def multi_search(
    plan: AnglesPlan,
    *,
    per_angle_limit: int,
    config: HarnessWebConfig,
    rate_limit_ms: int | None = None,
) -> dict[str, list[dict[str, str]]]:
    """Run search() for each angle; return angle_id -> hits."""
    sleep_sec = (rate_limit_ms if rate_limit_ms is not None else config.rate_limit_ms) / 1000.0
    results: dict[str, list[dict[str, str]]] = {}
    angles = list(plan.angles)

    def run_one(angle: SearchAngle) -> tuple[str, list[dict[str, str]]]:
        hits = search(angle.query, limit=per_angle_limit, config=config)
        tagged = []
        for i, h in enumerate(hits):
            row = dict(h)
            row["_angle_id"] = angle.id
            row["_angle_rank"] = str(i + 1)
            tagged.append(row)
        return angle.id, tagged

    if len(angles) == 1:
        aid, hits = run_one(angles[0])
        results[aid] = hits
        return results

    with ThreadPoolExecutor(max_workers=min(_concurrency(), len(angles))) as pool:
        futures = {pool.submit(run_one, a): a for a in angles}
        done = 0
        for fut in as_completed(futures):
            aid, hits = fut.result()
            results[aid] = hits
            done += 1
            if done < len(angles) and sleep_sec > 0:
                time.sleep(sleep_sec)

    return results
