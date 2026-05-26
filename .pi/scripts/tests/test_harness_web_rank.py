"""Unit tests for harness_web.rank (no network)."""

from __future__ import annotations

import unittest

from harness_web.rank import RankedHit, fuse_angle_results, lexical_rerank, normalize_url, tokenize


class TestNormalizeUrl(unittest.TestCase):
    def test_strips_tracking(self) -> None:
        a = normalize_url("https://Example.com/path?utm_source=x&id=1")
        b = normalize_url("https://example.com/path?id=1")
        self.assertEqual(a, b)

    def test_trailing_slash(self) -> None:
        self.assertEqual(
            normalize_url("https://example.com/foo/"),
            normalize_url("https://example.com/foo"),
        )


class TestRrfFusion(unittest.TestCase):
    def test_merges_duplicate_urls(self) -> None:
        angle_results = {
            "a": [
                {"url": "https://x.com/1", "title": "T1", "description": "d1"},
                {"url": "https://x.com/2", "title": "T2", "description": "d2"},
            ],
            "b": [
                {"url": "https://x.com/1", "title": "T1b", "description": "d1b"},
            ],
        }
        fused = fuse_angle_results(angle_results, final_limit=5)
        self.assertEqual(len(fused), 2)
        top = fused[0]
        self.assertEqual(top.url, "https://x.com/1")
        self.assertIn("a", top.angle_ids)
        self.assertIn("b", top.angle_ids)
        self.assertGreater(top.score, fused[1].score)


class TestLexicalRerank(unittest.TestCase):
    def test_boosts_intent_overlap(self) -> None:
        hits = [
            RankedHit("https://a", "unrelated", "noise", 0.52, ["a"]),
            RankedHit("https://b", "kubernetes architecture", "how kubernetes works", 0.50, ["b"]),
        ]
        reranked = lexical_rerank(hits, "kubernetes architecture")
        self.assertEqual(reranked[0].url, "https://b")
        self.assertGreater(reranked[0].score, reranked[1].score)


class TestTokenize(unittest.TestCase):
    def test_min_length(self) -> None:
        self.assertIn("hello", tokenize("hello hi"))
