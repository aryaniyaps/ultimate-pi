"""Merge Gleeson / Musk prompts corpus chunk into graphify-books-out/graph.json."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.cluster import cluster, score_all
from graphify.export import to_html, to_json
from graphify.report import generate
from networkx.readwrite import json_graph

SRC = "graphify-books-corpus/aigleeson_musk_first_principles_prompts.md"
AUTHOR = "Louis Gleeson (@aigleeson)"


def _md5_file(p: Path) -> str:
    h = hashlib.md5()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _node(nid: str, label: str, **extra) -> dict:
    base = {
        "id": nid,
        "label": label,
        "file_type": "document",
        "source_file": SRC,
        "source_location": extra.pop("source_location", "Curated thread summary"),
        "source_url": "https://x.com/aigleeson/status/1994035862372536811",
        "captured_at": "2026-05-10",
        "author": AUTHOR,
        "contributor": None,
    }
    base.update(extra)
    return base


def _edge(s: str, t: str, relation: str, score: float, loc: str, conf: str = "INFERRED") -> dict:
    return {
        "source": s,
        "target": t,
        "relation": relation,
        "confidence": conf,
        "confidence_score": score,
        "source_file": SRC,
        "source_location": loc,
        "weight": 1.0,
    }


def build_fragment() -> dict:
    root = "gleeson_musk_thread_root"
    nodes = [
        _node(
            root,
            "Musk-style first-principles prompts (Gleeson X thread, Nov 2025)",
            source_location="Title / overview",
        ),
        _node(
            "gleeson_musk_concept_physicist_vs_pattern_ai",
            "Physicist-style truth vs LLM pattern-matching (combined clarity)",
            source_location="Epilogue framing",
        ),
        _node(
            "gleeson_musk_meta_stacked_prompt",
            "Stacked meta-prompt: truths, strip assumptions, optimal solution, hidden constraints, rebuild from first principles",
            source_location="After prompt 15",
        ),
        _node(
            "gleeson_musk_meta_rebuilt_from_raw_truth",
            "Mind-shift question: If I rebuilt this from raw truth, what would it become?",
            source_location="Closing",
        ),
    ]
    prompts = [
        (
            "gleeson_musk_prompt_01_physics",
            '1. "What are the physics of this problem?"',
            "Constraints, forces, bottlenecks",
        ),
        (
            "gleeson_musk_prompt_02_no_assumptions",
            '2. "If I couldn’t rely on existing assumptions, how would I solve this?"',
            "Break invisible cages",
        ),
        (
            "gleeson_musk_prompt_03_components",
            '3. "What are the problem’s fundamental components?"',
            "Atomic decomposition",
        ),
        (
            "gleeson_musk_prompt_04_optimal_no_cost",
            '4. "What would the optimal solution look if cost didn’t exist?"',
            "Ideal before constraints",
        ),
        (
            "gleeson_musk_prompt_05_cut_90",
            '5. "If I were forced to cut 90% of this, what would remain?"',
            "Brutal prioritization",
        ),
        (
            "gleeson_musk_prompt_06_pre_mortem",
            '6. "If this failed completely, what would be the root cause?"',
            "Pre-mortem",
        ),
        (
            "gleeson_musk_prompt_07_ignore_norms",
            '7. "What would a solution look like if I ignored industry norms?"',
            "Non-obvious path",
        ),
        (
            "gleeson_musk_prompt_08_impossible_vs_feels",
            '8. "What part is actually impossible vs only feels impossible?"',
            "Physics vs fear",
        ),
        (
            "gleeson_musk_prompt_09_mvb",
            '9. "What is the minimum viable breakthrough?"',
            "Foundational leap",
        ),
        (
            "gleeson_musk_prompt_10_restart",
            '10. "If I restarted today knowing what I know, what would I build?"',
            "Clean slate",
        ),
        (
            "gleeson_musk_prompt_11_hidden_constraints",
            '11. "What hidden constraints am I not questioning?"',
            "Self-imposed ceilings",
        ),
        (
            "gleeson_musk_prompt_12_physics_not_politics",
            '12. "How would I solve this if I only cared about physics, not politics?"',
            "Uncompromised version first",
        ),
        (
            "gleeson_musk_prompt_13_10x_faster",
            '13. "If I had to achieve this 10× faster, what would I do?"',
            "Speed forcing function",
        ),
        (
            "gleeson_musk_prompt_14_scale_millions",
            '14. "What would this look like if it had to scale to millions?"',
            "Orders of magnitude",
        ),
        (
            "gleeson_musk_prompt_15_leverage",
            '15. "Which part of this solution creates the most leverage?"',
            "Multiplier / leverage point",
        ),
    ]
    for nid, label, _hint in prompts:
        nodes.append(_node(nid, label, source_location="Prompt list"))

    edges = []
    for nid, _lbl, _h in prompts:
        edges.append(_edge(root, nid, "illustrates", 0.9, "Thread structure"))

    edges += [
        _edge(
            "gleeson_musk_meta_stacked_prompt",
            "gleeson_musk_prompt_01_physics",
            "builds_on",
            0.85,
            "Meta-prompt encodes physics framing",
        ),
        _edge(
            "gleeson_musk_meta_stacked_prompt",
            "gleeson_musk_prompt_02_no_assumptions",
            "builds_on",
            0.85,
            "Strip assumptions",
        ),
        _edge(
            "gleeson_musk_meta_stacked_prompt",
            "gleeson_musk_prompt_11_hidden_constraints",
            "builds_on",
            0.85,
            "Hidden constraints",
        ),
        _edge(
            "gleeson_musk_meta_rebuilt_from_raw_truth",
            "gleeson_musk_meta_stacked_prompt",
            "conceptually_related_to",
            0.9,
            "Same first-principles move",
        ),
        _edge(
            root,
            "gleeson_musk_concept_physicist_vs_pattern_ai",
            "rationale_for",
            0.75,
            "Why combine Musk framing with AI",
        ),
        # Cross-corpus bridges (existing book-graph node IDs)
        _edge(
            "gleeson_musk_prompt_15_leverage",
            "effective_engineer_leverage",
            "semantically_similar_to",
            0.72,
            "Leverage as multiplier",
        ),
        _edge(
            "gleeson_musk_prompt_11_hidden_constraints",
            "meadows_systems_ch6_leverage",
            "conceptually_related_to",
            0.65,
            "Hidden levers / intervention points",
        ),
        _edge(
            "gleeson_musk_meta_stacked_prompt",
            "ousterhout_design_strategic_programming",
            "conceptually_related_to",
            0.68,
            "Strategic vs tactical investment in problem solving",
        ),
    ]

    hyperedges = [
        {
            "id": "gleeson_musk_hyper_fifteen_prompts",
            "member_nodes": [p[0] for p in prompts],
            "description": "Fifteen Musk-style diagnostic prompts as a single toolkit",
            "source_location": "Prompt list",
            "confidence": "INFERRED",
            "confidence_score": 0.8,
        }
    ]

    return {"nodes": nodes, "edges": edges, "hyperedges": hyperedges, "input_tokens": 0, "output_tokens": 0}


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    out_dir = repo / "graphify-books-out"
    graph_path = out_dir / "graph.json"
    md_path = repo / SRC
    if not md_path.is_file():
        raise SystemExit(f"Missing corpus file: {md_path}")

    frag = build_fragment()
    data = json.loads(graph_path.read_text(encoding="utf-8"))
    G = json_graph.node_link_graph(data, edges="links")

    hyp = list(G.graph.get("hyperedges", []))
    hyp.extend(frag["hyperedges"])
    G.graph["hyperedges"] = hyp

    new_ids = {n["id"] for n in frag["nodes"]}
    overlap = new_ids & set(G.nodes())
    if overlap:
        print("Replacing existing nodes:", overlap)
        G.remove_nodes_from(overlap)

    for n in frag["nodes"]:
        G.add_node(n["id"], **{k: v for k, v in n.items() if k != "id"})

    for e in frag["edges"]:
        G.add_edge(
            e["source"],
            e["target"],
            relation=e["relation"],
            confidence=e["confidence"],
            confidence_score=e["confidence_score"],
            source_file=e["source_file"],
            source_location=e["source_location"],
            weight=e["weight"],
        )

    communities = cluster(G)
    cohesion = score_all(G, communities)
    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)

    labels_path = out_dir / ".graphify_labels.json"
    labels: dict[int, str] = {}
    if labels_path.exists():
        try:
            labels = {int(k): v for k, v in json.loads(labels_path.read_text(encoding="utf-8")).items()}
        except Exception:
            labels = {}
    for cid in communities:
        if cid not in labels:
            labels[cid] = f"Community {cid}"

    questions = suggest_questions(G, communities, labels)
    detection = {
        "total_files": 29,
        "total_words": 0,
        "needs_graph": True,
        "warning": None,
        "files": {"paper": [], "code": [], "document": [str(md_path.resolve())], "image": [], "video": []},
        "skipped_sensitive": [],
        "graphifyignore_patterns": 0,
    }
    report = generate(
        G,
        communities,
        cohesion,
        labels,
        gods,
        surprises,
        detection,
        {"input": 0, "output": 0},
        "books/ + graphify-books-corpus/",
        suggested_questions=questions,
    )
    (out_dir / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
    to_json(G, communities, str(graph_path))

    analysis = {
        "communities": {str(k): v for k, v in communities.items()},
        "cohesion": {str(k): v for k, v in cohesion.items()},
        "gods": gods,
        "surprises": surprises,
        "questions": questions,
    }
    (out_dir / ".graphify_analysis.json").write_text(json.dumps(analysis, indent=2), encoding="utf-8")
    labels_path.write_text(json.dumps({str(k): v for k, v in labels.items()}, indent=2), encoding="utf-8")

    try:
        to_html(
            G,
            communities,
            str(out_dir / "graph.html"),
            community_labels=labels or None,
        )
    except ValueError as e:
        print("Skipped graph.html:", e)

    # Manifest entry for incremental (absolute path keys, same as existing manifest)
    manifest_path = out_dir / "manifest.json"
    manifest = {}
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception:
            manifest = {}
    key = str(md_path.resolve())
    manifest[key] = {"mtime": md_path.stat().st_mtime, "hash": _md5_file(md_path)}
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"Merged Gleeson corpus: +{len(frag['nodes'])} nodes, +{len(frag['edges'])} edges")
    print(f"Graph now: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities")


if __name__ == "__main__":
    main()
