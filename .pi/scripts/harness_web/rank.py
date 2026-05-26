"""URL normalization and RRF fusion for multi-angle SERP results."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import parse_qs, urlparse, urlunparse

RRF_K = 60

_TRACKING_PARAMS = frozenset(
    {
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "fbclid",
        "gclid",
        "mc_cid",
        "mc_eid",
    }
)


@dataclass
class RankedHit:
    url: str
    title: str
    description: str
    score: float
    angle_ids: list[str] = field(default_factory=list)
    ranks: dict[str, int] = field(default_factory=dict)

    def to_web_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "title": self.title,
            "description": self.description,
            "score": round(self.score, 6),
            "angle_ids": list(self.angle_ids),
            "ranks": dict(self.ranks),
        }


def normalize_url(url: str) -> str:
    u = url.strip()
    if not u:
        return ""
    parsed = urlparse(u)
    scheme = (parsed.scheme or "https").lower()
    host = (parsed.hostname or "").lower()
    if not host:
        return u
    port = parsed.port
    netloc = host
    if port and not ((scheme == "http" and port == 80) or (scheme == "https" and port == 443)):
        netloc = f"{host}:{port}"
    path = parsed.path or "/"
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    qs = parse_qs(parsed.query, keep_blank_values=False)
    filtered = []
    for key in sorted(qs.keys()):
        if key.lower() in _TRACKING_PARAMS:
            continue
        for val in qs[key]:
            filtered.append(f"{key}={val}")
    query = "&".join(filtered)
    return urlunparse((scheme, netloc, path, "", query, ""))


def tokenize(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]{3,}", text.lower()) if len(t) >= 3}


def lexical_rerank(hits: list[RankedHit], intent: str) -> list[RankedHit]:
    """Lightweight O3 boost when HARNESS_WEB_RERANK=lexical."""
    intent_tokens = tokenize(intent)
    if not intent_tokens:
        return hits

    def lex_score(h: RankedHit) -> float:
        blob = f"{h.title} {h.description}".lower()
        tokens = tokenize(blob)
        if not tokens:
            return 0.0
        overlap = len(intent_tokens & tokens) / max(len(intent_tokens), 1)
        return overlap

    scored = [(h, h.score + 0.15 * lex_score(h)) for h in hits]
    scored.sort(key=lambda x: x[1], reverse=True)
    out: list[RankedHit] = []
    for h, s in scored:
        out.append(
            RankedHit(
                url=h.url,
                title=h.title,
                description=h.description,
                score=s,
                angle_ids=h.angle_ids,
                ranks=h.ranks,
            )
        )
    return out


def fuse_angle_results(
    per_angle: dict[str, list[dict[str, str]]],
    *,
    final_limit: int = 10,
    intent: str = "",
    rerank_mode: str = "off",
) -> list[RankedHit]:
    """Reciprocal Rank Fusion across angle result lists."""
    accum: dict[str, dict[str, Any]] = {}

    for angle_id, results in per_angle.items():
        for rank_1based, item in enumerate(results, start=1):
            raw_url = (item.get("url") or "").strip()
            norm = normalize_url(raw_url)
            if not norm or not norm.startswith("http"):
                continue
            entry = accum.setdefault(
                norm,
                {
                    "url": raw_url,
                    "title": "",
                    "description": "",
                    "score": 0.0,
                    "angle_ids": [],
                    "ranks": {},
                },
            )
            entry["score"] += 1.0 / (RRF_K + rank_1based)
            if angle_id not in entry["angle_ids"]:
                entry["angle_ids"].append(angle_id)
            entry["ranks"][angle_id] = rank_1based
            title = (item.get("title") or "").strip()
            desc = (item.get("description") or "").strip()
            if title and not entry["title"]:
                entry["title"] = title
            if desc and (not entry["description"] or len(desc) > len(entry["description"])):
                entry["description"] = desc

    hits = [
        RankedHit(
            url=e["url"],
            title=e["title"],
            description=e["description"],
            score=e["score"],
            angle_ids=e["angle_ids"],
            ranks=e["ranks"],
        )
        for e in accum.values()
    ]
    hits.sort(key=lambda h: (-h.score, -len(h.angle_ids), min(h.ranks.values()) if h.ranks else 999))

    if rerank_mode == "lexical" and intent:
        hits = lexical_rerank(hits, intent)

    return hits[:final_limit]
