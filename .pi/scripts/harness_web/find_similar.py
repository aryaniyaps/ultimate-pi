"""Seed-URL discovery (Exa findSimilar analog)."""

from __future__ import annotations

import re
from pathlib import Path

from .config import HarnessWebConfig
from .deep_search import run_deep_search
from .query_angles import AnglesPlan, SearchAngle
from .rank import RankedHit, fuse_angle_results, normalize_url, tokenize
from .scrape import fetch_page


def _extract_seed_phrases(url: str, *, config: HarnessWebConfig, fast: bool) -> list[str]:
    page = fetch_page(url, config=config, fast=fast, wait_ms=None)
    title = ""
    if hasattr(page, "css"):
        for sel in ("title", "h1"):
            nodes = page.css(sel)
            if nodes:
                title = (nodes[0].get_all_text(strip=True) or "").strip()
                if title:
                    break
    if not title and hasattr(page, "get_all_text"):
        title = (page.get_all_text(strip=True) or "")[:200].strip()
    title = re.sub(r"\s+", " ", title).strip()
    phrases: list[str] = []
    if title:
        phrases.append(title[:120])
    # Key tokens from title
    tokens = sorted(tokenize(title), key=len, reverse=True)[:6]
    if tokens:
        phrases.append(" ".join(tokens[:5]))
    phrases.append(f"similar to {title[:80]}" if title else f"related pages {url}")
    return [p for p in phrases if p.strip()][:3]


def run_find_similar(
    seed_url: str,
    *,
    config: HarnessWebConfig,
    final_limit: int = 10,
    per_angle_limit: int = 6,
    fast_fetch: bool = True,
) -> tuple[AnglesPlan, list[dict]]:
    phrases = _extract_seed_phrases(seed_url, config=config, fast=fast_fetch)
    angles = tuple(
        SearchAngle(f"similar_{i + 1}", q, f"Derived from seed {seed_url}")
        for i, q in enumerate(phrases)
    )
    plan = AnglesPlan(intent=f"pages similar to {seed_url}", angles=angles)
    from .multi_search import multi_search

    per_angle = multi_search(plan, per_angle_limit=per_angle_limit, config=config)
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
    ranked = fuse_angle_results(clean, final_limit=final_limit * 2, intent=plan.intent)

    # Boost overlap with seed text
    seed_norm = normalize_url(seed_url)
    seed_tokens = tokenize(" ".join(phrases))
    rescored: list[RankedHit] = []
    for h in ranked:
        if normalize_url(h.url) == seed_norm:
            continue
        blob = f"{h.title} {h.description}".lower()
        overlap = len(seed_tokens & tokenize(blob)) / max(len(seed_tokens), 1)
        rescored.append(
            RankedHit(
                url=h.url,
                title=h.title,
                description=h.description,
                score=h.score + 0.2 * overlap,
                angle_ids=h.angle_ids,
                ranks=h.ranks,
            )
        )
    rescored.sort(key=lambda x: -x.score)
    return plan, [h.to_web_dict() for h in rescored[:final_limit]]
