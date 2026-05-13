#!/usr/bin/env python3
"""Write graphify-out/graph.html from existing graph.json (full graph, bypasses 5k default cap)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from networkx.readwrite import json_graph

from graphify.export import to_html

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "graphify-out"


def main() -> None:
    gj = OUT / "graph.json"
    if not gj.exists():
        print(f"Missing {gj}", file=sys.stderr)
        sys.exit(1)
    G = json_graph.node_link_graph(json.loads(gj.read_text(encoding="utf-8")), edges="links")
    analysis_path = OUT / ".graphify_analysis.json"
    if not analysis_path.exists():
        print(f"Missing {analysis_path}", file=sys.stderr)
        sys.exit(1)
    analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
    communities = {int(k): v for k, v in analysis["communities"].items()}
    labels_path = OUT / ".graphify_labels.json"
    labels: dict[int, str] = {}
    if labels_path.exists():
        labels = {int(k): v for k, v in json.loads(labels_path.read_text(encoding="utf-8")).items()}
    n = G.number_of_nodes()
    # graphify skips full HTML when n > default limit; pass explicit limit for full-node viz.
    to_html(
        G,
        communities,
        str(OUT / "graph.html"),
        community_labels=labels or None,
        node_limit=n,
    )
    print(f"Wrote {OUT / 'graph.html'} ({n} nodes)")


if __name__ == "__main__":
    main()
