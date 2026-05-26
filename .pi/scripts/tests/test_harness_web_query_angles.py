"""Unit tests for harness_web.query_angles (no network)."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from harness_web.query_angles import AnglesPlan, load_angles_file, resolve_angles


class TestResolveAngles(unittest.TestCase):
    def test_heuristic_code_category(self) -> None:
        plan = resolve_angles("rust async", expand_heuristic=True, category="code")
        ids = {a.id for a in plan.angles}
        self.assertIn("github", ids)
        self.assertGreaterEqual(len(plan.angles), 2)
        self.assertLessEqual(len(plan.angles), 5)


class TestLoadFile(unittest.TestCase):
    def test_load_json_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "angles.json"
            p.write_text(
                json.dumps(
                    {
                        "intent": "load test",
                        "angles": [
                            {"id": "a", "query": "first angle query"},
                            {"id": "b", "query": "second angle query"},
                        ],
                    }
                ),
                encoding="utf-8",
            )
            plan = load_angles_file(p)
            self.assertIsInstance(plan, AnglesPlan)
            self.assertEqual(plan.intent, "load test")
            self.assertEqual(len(plan.angles), 2)


if __name__ == "__main__":
    unittest.main()
