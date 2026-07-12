"""
L8 -- MESH (Person A2).

Input : resolved_findings.json (L6) + obligations.json
Output: a live networkx.Graph (L9 CENTRALITY consumes it directly; the
        JSON export happens after L9 adds keystone_score, see
        centrality_l9.export_graph)

Nodes = obligations that appear in at least one finding (isolated
obligations with no findings have degree 0 / betweenness 0 by
definition, so they're excluded rather than cluttering the graph with
meaningless singleton nodes).
Edges = findings, weighted by trust_score (conflict/redundancy relations
are symmetric, hence an undirected graph).
"""
import networkx as nx


def build_graph(resolved_findings, obligations_by_id):
    G = nx.Graph()

    def _ensure_node(obl_id):
        if obl_id in G:
            return
        o = obligations_by_id.get(obl_id, {})
        G.add_node(
            obl_id,
            policy=o.get("policy"),
            doc_id=o.get("policy_file"),
            section=o.get("section"),
            topic=o.get("topic"),
        )

    for f in resolved_findings:
        a, b = f["obligation_id_a"], f["obligation_id_b"]
        _ensure_node(a)
        _ensure_node(b)
        if G.has_edge(a, b):
            edge = G[a][b]
            edge["finding_ids"].append(f["finding_id"])
            edge["finding_types"].add(f["finding_type"])
            edge["trust_score"] = max(edge["trust_score"], f["trust_score"])
        else:
            G.add_edge(
                a, b,
                finding_ids=[f["finding_id"]],
                finding_types={f["finding_type"]},
                trust_score=f["trust_score"],
            )
    return G
