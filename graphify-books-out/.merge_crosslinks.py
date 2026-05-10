import json
from pathlib import Path
from networkx.readwrite import json_graph
import networkx as nx
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json, to_html


def main():
    data = json.loads(Path('graphify-books-out/graph.json').read_text())
    G_orig = json_graph.node_link_graph(data, edges='links')

    valid_ids = set(G_orig.nodes())

    crosslink_files = sorted(Path('graphify-books-out').glob('.crosslink_T*.json'))
    print(f'Loading {len(crosslink_files)} crosslink files...')

    all_new_edges = []
    invalid_count = 0
    same_book_count = 0
    duplicate_count = 0

    book_of_node = {nid: G_orig.nodes[nid].get('source_file', '') for nid in valid_ids}
    existing_edge_set = set()
    for u, v in G_orig.edges():
        existing_edge_set.add(frozenset([u, v]))

    seen_new_pairs = set()

    per_theme_stats = {}
    for cf in crosslink_files:
        theme = cf.stem.replace('.crosslink_', '')
        try:
            cdata = json.loads(cf.read_text())
        except Exception as e:
            print(f'  {theme}: BAD JSON - {e}')
            continue

        ok = 0
        for e in cdata.get('edges', []):
            s = e.get('source')
            t = e.get('target')
            if s not in valid_ids or t not in valid_ids:
                invalid_count += 1
                continue
            if book_of_node.get(s) == book_of_node.get(t):
                same_book_count += 1
                continue
            pair = frozenset([s, t])
            if pair in existing_edge_set or pair in seen_new_pairs:
                duplicate_count += 1
                continue
            seen_new_pairs.add(pair)

            new_edge = {
                'source': s,
                'target': t,
                'relation': e.get('relation', 'semantically_similar_to'),
                'confidence': e.get('confidence', 'INFERRED'),
                'confidence_score': float(e.get('confidence_score', 0.7)),
                'source_file': e.get('source_file', f'cross-book-linking/{theme}'),
                'source_location': e.get('source_location', 'cross-book pass'),
                'weight': float(e.get('weight', 1.0)),
                'rationale': e.get('rationale', ''),
            }
            all_new_edges.append(new_edge)
            ok += 1

        per_theme_stats[theme] = ok

    for theme, n in per_theme_stats.items():
        print(f'  {theme}: {n} valid new edges')
    print()
    print(f'Total valid new cross-book edges: {len(all_new_edges)}')
    print(f'Filtered out: {invalid_count} bad-id, {same_book_count} same-book, {duplicate_count} duplicate')

    G = G_orig.copy()
    for e in all_new_edges:
        G.add_edge(
            e['source'], e['target'],
            relation=e['relation'],
            confidence=e['confidence'],
            confidence_score=e['confidence_score'],
            source_file=e['source_file'],
            source_location=e['source_location'],
            weight=e['weight'],
            rationale=e.get('rationale', ''),
        )

    print()
    print(f'Graph before: {G_orig.number_of_nodes()} nodes, {G_orig.number_of_edges()} edges')
    print(f'Graph after:  {G.number_of_nodes()} nodes, {G.number_of_edges()} edges')
    print(f'Net edges added: {G.number_of_edges() - G_orig.number_of_edges()}')

    print()
    print('Re-clustering...')
    communities = cluster(G)
    cohesion = score_all(G, communities)
    print(f'Communities: {len(communities)} (was 274 before crosslinks)')

    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)

    detection = {
        'total_files': 28,
        'total_words': 0,
        'needs_graph': True,
        'warning': None,
        'files': {'paper': [], 'code': [], 'document': [], 'image': [], 'video': []},
        'skipped_sensitive': [],
        'graphifyignore_patterns': 0,
    }
    tokens = {'input': 0, 'output': 0}

    labels = {cid: f'Community {cid}' for cid in communities}
    questions = suggest_questions(G, communities, labels)

    report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, 'books/', suggested_questions=questions)
    Path('graphify-books-out/GRAPH_REPORT.md').write_text(report)
    to_json(G, communities, 'graphify-books-out/graph.json')

    analysis = {
        'communities': {str(k): v for k, v in communities.items()},
        'cohesion': {str(k): v for k, v in cohesion.items()},
        'gods': gods,
        'surprises': surprises,
        'questions': questions,
    }
    Path('graphify-books-out/.graphify_analysis.json').write_text(json.dumps(analysis, indent=2))
    print('Wrote graph.json, GRAPH_REPORT.md, analysis cache')

    print()
    print(f'God nodes (top 10):')
    for g in gods[:10]:
        print(f'  - {g["label"]} ({g.get("degree", 0)} edges)')


if __name__ == '__main__':
    main()
