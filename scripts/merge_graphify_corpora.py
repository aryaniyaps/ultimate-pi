#!/usr/bin/env python3
"""
Merge graphify-out with optional graphify-books-out and graphify-yt-transcripts-out into graphify-out.

(Books/YouTube dirs were removed after a successful one-time merge; restore them from git to re-run.)

- Prefixes all book and YouTube node IDs to avoid collisions and preserve provenance.
- Merges hyperedges (normalizing books' member_nodes -> nodes).
- Adds cross-corpus INFERRED edges via token overlap / Jaccard on normalized labels.
- Re-clusters with graphify, writes graph.json, GRAPH_REPORT.md, analysis, labels, and graph.html (full viz via explicit node_limit).
"""
from __future__ import annotations

import json
import re
import shutil
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import networkx as nx
from networkx.readwrite import json_graph

from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.cluster import cluster, score_all
from graphify.export import to_html, to_json
from graphify.report import generate

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "graphify-out"
MAIN_JSON = ROOT / "graphify-out" / "graph.json"
BOOKS_JSON = ROOT / "graphify-books-out" / "graph.json"
YT_JSON = ROOT / "graphify-yt-transcripts-out" / "graph.json"
YT_SEM = ROOT / "graphify-yt-transcripts-out" / "semantic_extraction.json"

BOOK_PREFIX = "books__"
YT_PREFIX = "yt__"


def _norm_tokens(text: str) -> set[str]:
    s = re.sub(r"[^a-z0-9\s]", " ", (text or "").lower())
    return {t for t in s.split() if len(t) > 2}


def load_node_link(path: Path) -> nx.Graph:
    data = json.loads(path.read_text(encoding="utf-8"))
    return json_graph.node_link_graph(data, edges="links")


def load_youtube_nx(path: Path) -> nx.Graph:
    data = json.loads(path.read_text(encoding="utf-8"))
    G = nx.Graph()
    for n in data.get("nodes", []):
        nid = n["id"]
        attrs = {k: v for k, v in n.items() if k != "id"}
        if "source_file" not in attrs or attrs["source_file"] in (None, ""):
            attrs["source_file"] = "graphify-yt-transcripts-out/transcripts"
        if "file_type" not in attrs:
            attrs["file_type"] = "document"
        G.add_node(nid, **attrs)
    for e in data.get("edges", []):
        u, v = e["source"], e["target"]
        if u not in G or v not in G:
            continue
        ed = {k: v for k, v in e.items() if k not in ("source", "target")}
        G.add_edge(u, v, **ed)
    return G


def prefix_graph(G: nx.Graph, prefix: str) -> tuple[nx.Graph, dict[str, str]]:
    """Return new graph with prefixed node ids; mapping old_id -> new_id."""
    mapping = {n: f"{prefix}{n}" for n in G.nodes()}
    H = nx.relabel_nodes(G, mapping, copy=True)
    return H, mapping


def strip_community(G: nx.Graph) -> None:
    for _, d in G.nodes(data=True):
        d.pop("community", None)


def collect_hyperedges_main(data: dict) -> list[dict]:
    g = data.get("graph") or {}
    return list(g.get("hyperedges") or [])


def collect_hyperedges_books(data: dict, id_map: dict[str, str]) -> list[dict]:
    out: list[dict] = []
    for h in (data.get("graph") or {}).get("hyperedges") or []:
        members = h.get("member_nodes") or h.get("nodes") or []
        remapped = [id_map[m] for m in members if m in id_map]
        if len(remapped) < 2:
            continue
        h2 = dict(h)
        h2["nodes"] = remapped
        h2.pop("member_nodes", None)
        if "label" not in h2 and h2.get("description"):
            h2["label"] = str(h2["description"])[:200]
        if "relation" not in h2:
            h2["relation"] = "participate_in"
        if "confidence" not in h2:
            h2["confidence"] = "INFERRED"
        if "confidence_score" not in h2:
            h2["confidence_score"] = 0.7
        out.append(h2)
    return out


def collect_hyperedges_yt(semantic: dict, id_map: dict[str, str]) -> list[dict]:
    out: list[dict] = []
    for h in semantic.get("hyperedges") or []:
        nodes = h.get("nodes") or []
        remapped = [id_map[n] for n in nodes if n in id_map]
        if len(remapped) < 2:
            continue
        h2 = dict(h)
        h2["nodes"] = remapped
        out.append(h2)
    return out


def build_token_index(G: nx.Graph) -> tuple[dict[str, set[str]], dict[str, str]]:
    """node_id -> tokens, node_id -> display string for matching."""
    tokens: dict[str, set[str]] = {}
    labels: dict[str, str] = {}
    for nid, d in G.nodes(data=True):
        lab = d.get("norm_label") or d.get("label") or str(nid)
        labels[nid] = lab if isinstance(lab, str) else str(lab)
        tokens[nid] = _norm_tokens(labels[nid])
    return tokens, labels


def add_cross_corpus_edges(
    G: nx.Graph,
    parts: list[tuple[str, nx.Graph, dict[str, set[str]], dict[str, str]]],
    *,
    max_edges: int = 12000,
    min_jaccard: float = 0.32,
    min_shared: int = 2,
    max_per_target_corpus: int = 2,
) -> int:
    """
    parts: (name, subgraph, tokens_map, labels_map) for each corpus.
    Adds INFERRED semantically_similar_to edges only between different corpora (id prefix).
    """
    inverted: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for corpus, _Sg, tok_map, _lab in parts:
        for nid, toks in tok_map.items():
            for t in toks:
                inverted[t].append((corpus, nid))

    token_maps = {name: tm for name, _Sg, tm, _ in parts}
    def corpus_of(nid: str) -> str:
        if nid.startswith(BOOK_PREFIX):
            return "books"
        if nid.startswith(YT_PREFIX):
            return "yt"
        return "main"

    existing = {frozenset((u, v)) for u, v in G.edges()}
    added = 0

    for corpus_a, _Ga, tok_a, _lab_a in parts:
        for u, tu in tok_a.items():
            if not tu:
                continue
            cand: set[str] = set()
            for t in tu:
                for corp_b, v in inverted[t]:
                    if corp_b == corpus_a:
                        continue
                    if corpus_of(u) == corpus_of(v):
                        continue
                    cand.add(v)

            scored: list[tuple[float, str]] = []
            for v in cand:
                tv = None
                for name in token_maps:
                    if v in token_maps[name]:
                        tv = token_maps[name][v]
                        break
                if not tv:
                    continue
                inter = len(tu & tv)
                if inter < min_shared:
                    continue
                union = len(tu | tv) or 1
                j = inter / union
                if j < min_jaccard:
                    continue
                scored.append((j, v))

            scored.sort(reverse=True)
            tgt_corpus_count: dict[str, int] = defaultdict(int)
            for j, v in scored:
                if added >= max_edges:
                    return added
                cb = corpus_of(v)
                if tgt_corpus_count[cb] >= max_per_target_corpus:
                    continue
                pair = frozenset((u, v))
                if pair in existing:
                    continue
                existing.add(pair)
                tgt_corpus_count[cb] += 1
                rationale = f"cross_corpus token overlap jaccard={j:.2f}"
                G.add_edge(
                    u,
                    v,
                    relation="semantically_similar_to",
                    confidence="INFERRED",
                    confidence_score=min(0.95, 0.55 + 0.4 * j),
                    source_file="graphify_merge/cross_corpus",
                    source_location=f"{corpus_a}->{cb}",
                    weight=1.0,
                    rationale=rationale[:500],
                )
                added += 1
    return added


def auto_community_labels(
    G: nx.Graph, communities: dict[int, list[str]]
) -> dict[int, str]:
    """Short names from highest-degree node labels in each community."""
    deg = dict(G.degree())
    out: dict[int, str] = {}
    for cid, members in communities.items():
        ranked = sorted(members, key=lambda n: deg.get(n, 0), reverse=True)
        bits: list[str] = []
        seen_words: set[str] = set()
        for nid in ranked[:12]:
            lab = G.nodes[nid].get("label") or nid
            if not isinstance(lab, str):
                lab = str(lab)
            # shorten
            short = lab.strip()
            if len(short) > 42:
                short = short[:39] + "…"
            w = _norm_tokens(short)
            if not w:
                continue
            if short and short not in bits:
                bits.append(short)
            seen_words |= w
            if len(bits) >= 3:
                break
        if bits:
            name = " · ".join(bits[:3])
        else:
            name = f"Community {cid}"
        if len(name) > 90:
            name = name[:87] + "…"
        out[cid] = name
    return out


def polish_labels(labels: dict[int, str], G: nx.Graph, communities: dict[int, list[str]]) -> dict[int, str]:
    """Short-circuit noisy labels from ingested graph-report summary nodes."""
    out = dict(labels)
    for cid, name in list(out.items()):
        nlow = name.lower()
        if "graph report" in nlow and "communities" in nlow:
            out[cid] = "Ingested graph-report hubs (books merge artifact)"
        elif "communities (" in nlow and "thin omitted" in nlow:
            out[cid] = "Book community index nodes (metadata)"
    return out


def main() -> None:
    for p in (BOOKS_JSON, YT_JSON):
        if not p.exists():
            print(
                f"Missing {p}. Books/YouTube graphs were merged into graphify-out and "
                "the source dirs were removed; restore graphify-books-out/ and "
                "graphify-yt-transcripts-out/ from git (or a backup) to re-run this merge.",
                file=sys.stderr,
            )
            raise SystemExit(1)

    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    backup = OUT / f"graph.json.pre-merge-{ts}.bak"
    if MAIN_JSON.exists():
        shutil.copy2(MAIN_JSON, backup)
        print(f"Backed up graph.json -> {backup.name}")

    raw_main = json.loads(MAIN_JSON.read_text(encoding="utf-8"))
    raw_books = json.loads(BOOKS_JSON.read_text(encoding="utf-8"))

    G_main = load_node_link(MAIN_JSON)
    G_books = load_node_link(BOOKS_JSON)
    G_yt = load_youtube_nx(YT_JSON)

    strip_community(G_main)
    strip_community(G_books)
    strip_community(G_yt)

    G_books_p, map_b = prefix_graph(G_books, BOOK_PREFIX)
    G_yt_p, map_y = prefix_graph(G_yt, YT_PREFIX)

    G = nx.compose_all([G_main, G_books_p, G_yt_p])

    hyper: list[dict] = []
    hyper += collect_hyperedges_main(raw_main)
    hyper += collect_hyperedges_books(raw_books, map_b)
    if YT_SEM.exists():
        sem = json.loads(YT_SEM.read_text(encoding="utf-8"))
        hyper += collect_hyperedges_yt(sem, map_y)
    G.graph["hyperedges"] = hyper
    print(f"Merged hyperedges: {len(hyper)}")

    parts = []
    for name, sub in (
        ("main", G_main),
        ("books", G_books_p),
        ("yt", G_yt_p),
    ):
        tm, lm = build_token_index(sub)
        parts.append((name, sub, tm, lm))

    n_cross = add_cross_corpus_edges(G, parts)
    print(f"Cross-corpus edges added: {n_cross}")
    print(f"Combined graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    communities = cluster(G)
    cohesion = score_all(G, communities)
    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)

    labels = polish_labels(auto_community_labels(G, communities), G, communities)
    questions = suggest_questions(G, communities, labels)

    detection = {
        "total_files": 0,
        "total_words": 0,
        "needs_graph": True,
        "warning": None,
        "files": {"paper": [], "code": [], "document": [], "image": [], "video": []},
        "skipped_sensitive": [],
        "graphifyignore_patterns": 0,
    }
    tokens = {"input": 0, "output": 0}

    report = generate(
        G,
        communities,
        cohesion,
        labels,
        gods,
        surprises,
        detection,
        tokens,
        str(ROOT),
        suggested_questions=questions,
    )
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")

    ok = to_json(G, communities, str(OUT / "graph.json"), force=True)
    if not ok:
        raise SystemExit("to_json refused to write; check stderr")

    analysis = {
        "communities": {str(k): v for k, v in communities.items()},
        "cohesion": {str(k): v for k, v in cohesion.items()},
        "gods": gods,
        "surprises": surprises,
        "questions": questions,
        "merge_meta": {
            "merged_at": datetime.now(timezone.utc).isoformat(),
            "sources": ["graphify-out", "graphify-books-out", "graphify-yt-transcripts-out"],
            "cross_corpus_edges": n_cross,
            "hyperedges": len(hyper),
        },
    }
    (OUT / ".graphify_analysis.json").write_text(
        json.dumps(analysis, indent=2), encoding="utf-8"
    )
    (OUT / ".graphify_labels.json").write_text(
        json.dumps({str(k): v for k, v in labels.items()}, indent=2),
        encoding="utf-8",
    )

    n = G.number_of_nodes()
    to_html(
        G,
        communities,
        str(OUT / "graph.html"),
        community_labels=labels,
        node_limit=n,
    )
    print(f"Wrote graph.html ({n} nodes, node_limit=n for graphify viz cap)")


if __name__ == "__main__":
    main()
