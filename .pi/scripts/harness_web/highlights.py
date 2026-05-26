"""Query-aligned excerpt extraction from page markdown."""

from __future__ import annotations

import re
from typing import Any


def _tokenize(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]{3,}", text.lower()) if len(t) >= 3}


def extract_highlights(
    markdown: str,
    query: str,
    *,
    max_spans: int = 5,
    max_chars_per_span: int = 400,
) -> list[dict[str, Any]]:
    q_tokens = _tokenize(query)
    if not q_tokens:
        return []

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", markdown) if p.strip()]
    if not paragraphs:
        paragraphs = [line.strip() for line in markdown.splitlines() if line.strip()]

    scored: list[tuple[float, int, str]] = []
    for idx, para in enumerate(paragraphs):
        if len(para) < 40:
            continue
        tokens = _tokenize(para)
        if not tokens:
            continue
        overlap = len(q_tokens & tokens) / max(len(q_tokens), 1)
        scored.append((overlap, idx, para))

    scored.sort(key=lambda x: (-x[0], x[1]))
    out: list[dict[str, Any]] = []
    for score, idx, para in scored[:max_spans]:
        if score <= 0:
            continue
        text = para[:max_chars_per_span]
        if len(para) > max_chars_per_span:
            text += "…"
        out.append({"score": round(score, 4), "paragraph_index": idx, "text": text})
    return out
