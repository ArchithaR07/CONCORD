"""
L9 -- CENTRALITY (Person A2). Architecture doc \u00a74.2 -- Differentiator #2.

Input : the networkx.Graph built by L8 MESH
Output: keystone_score per node (continuous, already in [0,1]) + a
        boolean is_keystone convenience flag (top KEYSTONE_TOP_PCT of
        nonzero scores) + graph_export.json (graph_export.schema.json)

keystone_score(node) = 0.5 * betweenness_centrality(node) + 0.5 * degree_centrality(node)

This is the exact formula from \u00a74.2 of the architecture doc -- betweenness
weighted by trust_score so a high-confidence conflict counts for more than
a shaky escalated one, degree unweighted (pure connectivity count).
"""
import numpy as np
import networkx as nx

from backend.engine.models import config
from backend.engine.rules.io_utils import now_iso


def compute_keystone_scores(G):
    if G.number_of_nodes() == 0:
        return {}, {}, {}
    betweenness = nx.betweenness_centrality(G, weight="trust_score")
    degree = nx.degree_centrality(G)
    keystone = {n: 0.5 * betweenness[n] + 0.5 * degree[n] for n in G.nodes}
    return keystone, betweenness, degree


def determine_is_keystone(keystone_scores, top_pct=None):
    top_pct = top_pct if top_pct is not None else config.KEYSTONE_TOP_PCT
    nonzero = [v for v in keystone_scores.values() if v > 0]
    if not nonzero:
        return {n: False for n in keystone_scores}
    cutoff = np.percentile(nonzero, 100 * (1 - top_pct))
    return {n: (v >= cutoff and v > 0) for n, v in keystone_scores.items()}


def export_graph(G, keystone_scores, betweenness, degree, is_keystone, top_pct=None):
    top_pct = top_pct if top_pct is not None else config.KEYSTONE_TOP_PCT
    nodes = []
    for n, data in G.nodes(data=True):
        nodes.append({
            "id": n,
            "policy": data.get("policy"),
            "policy_file": data.get("policy_file"),
            "section": data.get("section"),
            "topic": data.get("topic"),
            "degree": G.degree(n),
            "betweenness": round(betweenness.get(n, 0.0), 5),
            "keystone_score": round(keystone_scores.get(n, 0.0), 5),
            "is_keystone": bool(is_keystone.get(n, False)),
        })
    edges = []
    for u, v, data in G.edges(data=True):
        for finding_id in data.get("finding_ids", []):
            edges.append({
                "source": u,
                "target": v,
                "trust_score": data.get("trust_score"),
                "finding_type": ",".join(sorted(data.get("finding_types", []))),
                "finding_id": finding_id,
            })
    return {
        "nodes": nodes,
        "edges": edges,
        "generated_at": now_iso(),
        "params": {"keystone_top_pct": top_pct},
    }


def enrich_findings_with_keystone(resolved_findings, is_keystone):
    for f in resolved_findings:
        a_key = is_keystone.get(f["obligation_id_a"], False)
        b_key = is_keystone.get(f["obligation_id_b"], False)
        f["is_keystone"] = bool(a_key or b_key)
    return resolved_findings


def one_hop_impact(G, obligation_id):
    """Policy change impact analysis (\u00a74.2's stated payoff): 1-hop neighbors
    sorted by edge trust_score are "immediately impacted"; 2-hop are
    "secondary impact". A direct graph traversal, no pipeline re-run."""
    if obligation_id not in G:
        return {"immediate": [], "secondary": []}
    immediate = sorted(
        G[obligation_id].items(),
        key=lambda kv: kv[1].get("trust_score", 0),
        reverse=True,
    )
    immediate_ids = {n for n, _ in immediate}
    secondary_ids = set()
    for n in immediate_ids:
        secondary_ids.update(set(G[n]) - immediate_ids - {obligation_id})
    return {
        "immediate": [{"obligation_id": n, "trust_score": d.get("trust_score")} for n, d in immediate],
        "secondary": sorted(secondary_ids),
    }
