import json
from pathlib import Path
from networkx.readwrite import json_graph
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_html


def main():
    data = json.loads(Path('graphify-books-out/graph.json').read_text())
    G = json_graph.node_link_graph(data, edges='links')

    analysis = json.loads(Path('graphify-books-out/.graphify_analysis.json').read_text())
    communities = {int(k): v for k, v in analysis['communities'].items()}
    cohesion = {int(k): v for k, v in analysis['cohesion'].items()}
    gods = analysis['gods']
    surprises = analysis['surprises']

    raw_labels = json.loads(Path('graphify-books-out/.graphify_labels_input.json').read_text())
    labels = {}
    for cid in communities:
        if str(cid) in raw_labels:
            labels[cid] = raw_labels[str(cid)]
        else:
            labels[cid] = f'Community {cid}'

    Path('graphify-books-out/.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}, indent=2))

    questions = suggest_questions(G, communities, labels)

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

    report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, 'books/', suggested_questions=questions)
    Path('graphify-books-out/GRAPH_REPORT.md').write_text(report)
    print('Wrote GRAPH_REPORT.md (with labels and cross-book communities)')

    to_html(G, communities, 'graphify-books-out/graph.html', community_labels=labels)
    print('Wrote graph.html')

    print()
    print(f'Final: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities')

    cross_book_edges = 0
    book_of = {nid: G.nodes[nid].get('source_file', '') for nid in G.nodes()}
    for u, v in G.edges():
        if book_of.get(u) and book_of.get(v) and book_of[u] != book_of[v]:
            cross_book_edges += 1
    print(f'Cross-book edges: {cross_book_edges} (was ~14 before linking pass)')


if __name__ == '__main__':
    main()
