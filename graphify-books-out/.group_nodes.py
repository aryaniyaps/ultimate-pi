import json
from pathlib import Path
from networkx.readwrite import json_graph

data = json.loads(Path('graphify-books-out/graph.json').read_text())
G = json_graph.node_link_graph(data, edges='links')


def book_key(sf):
    if not sf:
        return 'unknown'
    name = sf.split('/')[-1].lower()
    if 'kahneman' in name: return 'kahneman_tfs'
    if 'ariely' in name or 'predictably' in name: return 'ariely_irrational'
    if 'cialdini' in name or 'influence' in name: return 'cialdini_influence'
    if 'greene' in name or 'laws of human nature' in name: return 'greene_laws'
    if 'dweck' in name or 'mindset' in name: return 'dweck_mindset'
    if 'frankl' in name or 'search for meaning' in name: return 'frankl_meaning'
    if 'haidt' in name or 'happiness' in name: return 'haidt_happiness'
    if 'murphy' in name or 'subconscious' in name: return 'murphy_subconscious'
    if 'crucial conversations' in name: return 'crucial_conversations'
    if 'fundamentals of software architecture' in name: return 'fund_arch'
    if 'designing data-intensive' in name: return 'ddia'
    if 'computer systems' in name and 'programmer' in name: return 'csapp'
    if 'team topologies' in name: return 'team_topologies'
    if 'thinking in systems' in name: return 'meadows_systems'
    if 'pragmatic programmer' in name: return 'pragmatic_prog'
    if 'code complete' in name: return 'mcconnell_codecomp'
    if 'philosophy of software design' in name: return 'ousterhout_design'
    if 'effective engineer' in name: return 'effective_engineer'
    if 'introduction to algorithms' in name: return 'clrs'
    if 'pmbok' in name or 'project management body of knowledge' in name: return 'pmbok'
    if 'kerzner' in name or ('project management' in name and 'systems approach' in name): return 'kerzner_pm'
    if 'berkun' in name or 'making things happen' in name: return 'berkun_mth'
    if 'peopleware' in name: return 'peopleware'
    if 'high output management' in name or 'andrew s. grove' in name: return 'grove_hom'
    if "manager's path" in name or 'fournier' in name: return 'fournier_manpath'
    if 'elegant puzzle' in name or 'larson, william' in name: return 'larson_elegant'
    if 'scaling teams' in name: return 'scaling_teams'
    if 'lean lexicon' in name: return 'lean_lexicon'
    return 'unknown'


THEMES = {
    'T1_cognitive': {'kahneman_tfs', 'ariely_irrational', 'cialdini_influence', 'greene_laws'},
    'T2_self_comm': {'dweck_mindset', 'frankl_meaning', 'haidt_happiness', 'murphy_subconscious', 'crucial_conversations'},
    'T3_arch_systems': {'fund_arch', 'ddia', 'csapp', 'team_topologies', 'meadows_systems'},
    'T4_craft_algos': {'pragmatic_prog', 'mcconnell_codecomp', 'ousterhout_design', 'effective_engineer', 'clrs'},
    'T5_project_exec': {'pmbok', 'kerzner_pm', 'berkun_mth', 'peopleware'},
    'T6_leadership_lean': {'grove_hom', 'fournier_manpath', 'larson_elegant', 'scaling_teams', 'lean_lexicon'},
}

nodes_by_theme = {t: [] for t in THEMES}
unknowns = []
for nid, ndata in G.nodes(data=True):
    bk = book_key(ndata.get('source_file', ''))
    placed = False
    for theme, books in THEMES.items():
        if bk in books:
            nodes_by_theme[theme].append({
                'id': nid,
                'label': ndata.get('label', nid),
                'book': bk,
                'source_file': ndata.get('source_file', ''),
                'degree': G.degree(nid),
            })
            placed = True
            break
    if not placed:
        unknowns.append((nid, ndata.get('source_file', '')))

god_per_theme = {}
for theme, nodes in nodes_by_theme.items():
    nodes.sort(key=lambda n: -n['degree'])
    god_per_theme[theme] = [
        {'id': n['id'], 'label': n['label'], 'book': n['book']}
        for n in nodes[:8]
    ]

print('Nodes per theme:')
for t, ns in nodes_by_theme.items():
    print(f'  {t}: {len(ns)} nodes')
print(f'Unknowns: {len(unknowns)}')
print()
print('God nodes per theme (cross-theme context):')
for t, gs in god_per_theme.items():
    print(f'  {t}:')
    for g in gs[:5]:
        print(f"    [{g['book']}] {g['label']}")

Path('graphify-books-out/.theme_nodes').mkdir(exist_ok=True)
for theme, nodes in nodes_by_theme.items():
    other_gods = []
    for other_t, gods in god_per_theme.items():
        if other_t != theme:
            other_gods.extend(gods)
    payload = {
        'theme': theme,
        'theme_nodes': [
            {'id': n['id'], 'label': n['label'], 'book': n['book']}
            for n in nodes
        ],
        'cross_theme_god_nodes': other_gods,
    }
    Path(f'graphify-books-out/.theme_nodes/{theme}.json').write_text(
        json.dumps(payload, indent=2)
    )

print()
print('Wrote per-theme node lists to graphify-books-out/.theme_nodes/')
