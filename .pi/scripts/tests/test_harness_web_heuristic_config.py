"""Unit tests for harness_web.heuristic_config."""

from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

from harness_web.heuristic_config import (
    _embedded_builtin_dict,
    _merge_config_dict,
    build_heuristic_angles,
    clear_heuristic_config_cache,
    heuristic_config_from_merged,
    load_heuristic_angles_config_cached,
)


class TestHeuristicConfig(unittest.TestCase):
    def tearDown(self) -> None:
        clear_heuristic_config_cache()

    def test_builtin_code_includes_stackoverflow(self) -> None:
        cfg = heuristic_config_from_merged(_embedded_builtin_dict())
        angles = build_heuristic_angles("rust async", category="code", config=cfg)
        ids = {a.id for a in angles}
        self.assertIn("stackoverflow", ids)
        self.assertIn("github", ids)
        self.assertTrue(any("site:stackoverflow.com" in a.query for a in angles))

    def test_shipped_code_includes_mdn_and_registries(self) -> None:
        pkg = Path(__file__).resolve().parents[2] / "harness" / "web-heuristic-angles.yaml"
        if not pkg.is_file():
            self.skipTest("package yaml missing")
        clear_heuristic_config_cache()
        cfg = load_heuristic_angles_config_cached((str(pkg),))
        angles = build_heuristic_angles("websocket api", category="code", config=cfg)
        ids = {a.id for a in angles}
        self.assertIn("mdn", ids)
        self.assertIn("package_registries", ids)
        self.assertLessEqual(len(angles), cfg.max_angles)

    def test_shipped_security_category(self) -> None:
        pkg = Path(__file__).resolve().parents[2] / "harness" / "web-heuristic-angles.yaml"
        if not pkg.is_file():
            self.skipTest("package yaml missing")
        clear_heuristic_config_cache()
        cfg = load_heuristic_angles_config_cached((str(pkg),))
        angles = build_heuristic_angles("jwt validation", category="security", config=cfg)
        ids = {a.id for a in angles}
        self.assertIn("owasp", ids)
        self.assertIn("cve_nvd", ids)

    def test_merge_extends_code_category(self) -> None:
        merged = _merge_config_dict(
            _embedded_builtin_dict(),
            {
                "max_angles": 12,
                "categories": {
                    "code": [
                        {
                            "id": "docs_rs",
                            "query": "{query} site:docs.rs",
                            "rationale": "Rust docs",
                        },
                    ],
                },
            },
        )
        cfg = heuristic_config_from_merged(merged)
        merged_ids = [a["id"] for a in merged["categories"]["code"]]
        self.assertIn("docs_rs", merged_ids)
        angles = build_heuristic_angles("tokio", category="code", config=cfg)
        ids = {a.id for a in angles}
        self.assertIn("stackoverflow", ids)
        self.assertIn("github", ids)

    def test_merge_adds_new_category(self) -> None:
        merged = _merge_config_dict(
            _embedded_builtin_dict(),
            {
                "categories": {
                    "security": [
                        {"id": "cve", "query": "{query} CVE", "rationale": "vulns"},
                        {
                            "id": "owasp",
                            "query": "{query} site:owasp.org",
                            "rationale": "guidance",
                        },
                    ],
                },
            },
        )
        cfg = heuristic_config_from_merged(merged)
        angles = build_heuristic_angles("jwt auth", category="security", config=cfg)
        ids = {a.id for a in angles}
        self.assertIn("cve", ids)
        self.assertIn("owasp", ids)

    def test_json_project_file_merges(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            proj = Path(tmp)
            harness_dir = proj / ".pi" / "harness"
            harness_dir.mkdir(parents=True)
            proj_file = harness_dir / "web-heuristic-angles.json"
            proj_file.write_text(
                json.dumps(
                    {
                        "categories": {
                            "code": [
                                {
                                    "id": "crates_io",
                                    "query": "{query} site:crates.io",
                                    "rationale": "crates",
                                },
                            ],
                        },
                    }
                ),
                encoding="utf-8",
            )
            clear_heuristic_config_cache()
            cfg = load_heuristic_angles_config_cached((str(proj_file),))
            angles = build_heuristic_angles("serde", category="code", config=cfg)
            ids = {a.id for a in angles}
            self.assertIn("crates_io", ids)


if __name__ == "__main__":
    unittest.main()
