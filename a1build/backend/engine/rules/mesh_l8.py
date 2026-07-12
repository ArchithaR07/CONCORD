
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
