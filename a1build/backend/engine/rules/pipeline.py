"""
Orchestrates A2's full slice of CONCORD: L3 -> L4 -> (L5 stub) -> L6 -> L7
-> L8 -> L9 -> L10, and returns every artifact B/A1 need plus everything
L10 produces. This is the one place that calls all the layer modules in
order -- individual layers never import each other directly.
"""
from backend.engine.models import config
from backend.engine.rules.io_utils import index_by_id
from backend.engine.rules.filter_l3 import generate_candidate_pairs
from backend.engine.rules.rule_bench_l4 import run_rule_bench
from backend.engine.stubs.stub_trust import compute_stub_trust_scores
from backend.engine.rules.arbitrate_l6 import build_resolved_findings
from backend.engine.rules.decay_l7 import run_decay, rollup_by_document, merge_staleness_into_findings
from backend.engine.rules.mesh_l8 import build_graph
from backend.engine.rules.centrality_l9 import (
    compute_keystone_scores, determine_is_keystone, export_graph, enrich_findings_with_keystone,
)
from backend.engine.rules.score_l10 import (
    compute_per_policy_scores, compute_org_wide_score, compute_policy_debt_by_department, sensitivity_check,
)
from backend.engine.rules.compass_l11 import apply_compass_mapping
from backend.engine.rules.voice_l12 import apply_voice_explanations

def run_pipeline(obligations, alpha=None, embedding_threshold=None):
    alpha = alpha if alpha is not None else config.DEFAULT_ALPHA
    obligations_by_id = index_by_id(obligations, key="id")

    # L3
    candidate_pairs = generate_candidate_pairs(obligations, similarity_threshold=embedding_threshold)
    candidate_pairs_by_id = index_by_id(candidate_pairs, key="pair_id")

    # L4
    rule_verdicts = run_rule_bench(candidate_pairs, obligations_by_id)

    # L5 (STUB -- replace with A1's real output the moment it exists)
    trust_scores = compute_stub_trust_scores(rule_verdicts, candidate_pairs_by_id)
    trust_scores_by_pair = index_by_id(trust_scores, key="pair_id")

    # L6
    resolved_findings, escalated_pairs = build_resolved_findings(rule_verdicts, trust_scores_by_pair, obligations_by_id)

    # L7 (independent of L6, runs off obligations directly)
    obligation_staleness = run_decay(obligations)
    staleness_by_doc = rollup_by_document(obligation_staleness, obligations_by_id)
    stale_by_obl = index_by_id(obligation_staleness, key="obligation_id")
    resolved_findings = merge_staleness_into_findings(resolved_findings, stale_by_obl)
    
    # L11 COMPASS
    resolved_findings = apply_compass_mapping(resolved_findings)

    # L12 VOICE
    resolved_findings = apply_voice_explanations(resolved_findings)

    # L8
    G = build_graph(resolved_findings, obligations_by_id)

    # L9
    keystone_scores, betweenness, degree = compute_keystone_scores(G)
    is_keystone = determine_is_keystone(keystone_scores)
    graph_export = export_graph(G, keystone_scores, betweenness, degree, is_keystone)
    resolved_findings = enrich_findings_with_keystone(resolved_findings, is_keystone)

    # L10
    per_policy_scores = compute_per_policy_scores(resolved_findings, obligation_staleness, obligations_by_id, keystone_scores, alpha=alpha)
    org_wide_score = compute_org_wide_score(per_policy_scores)
    policy_debt = compute_policy_debt_by_department(resolved_findings, obligation_staleness, obligations_by_id, keystone_scores, alpha=alpha)
    sensitivity = sensitivity_check(resolved_findings, obligation_staleness, obligations_by_id, keystone_scores)

    scores = {
        "alpha_used": alpha,
        "org_wide_score": org_wide_score,
        "per_policy": per_policy_scores,
        "policy_debt_by_department": policy_debt,
        "sensitivity_check": sensitivity,
    }

    return {
        "candidate_pairs": candidate_pairs,
        "rule_verdicts": rule_verdicts,
        "trust_scores": trust_scores,
        "resolved_findings": resolved_findings,
        "escalated_pairs": escalated_pairs,
        "obligation_staleness": obligation_staleness,
        "staleness_by_document": staleness_by_doc,
        "graph_export": graph_export,
        "scores": scores,
    }
