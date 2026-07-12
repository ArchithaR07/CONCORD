"""
STUB for A1's L5 TRUST RECONCILE (architecture doc \u00a74.1).

The real L5 fits a logistic regression on findings_labels.csv over
[rule_signal, embedding_similarity, llm_confidence, agreement_bonus].
A1 owns that. Until it ships, A2 needs *a* trust_score per pair to build
and test L6 ARBITRATE, L8 MESH (edge weights), L9 CENTRALITY (betweenness
uses edge weight) and L10 SCORE (severity depends on tier) end-to-end.

This stub uses the doc's own documented fallback: "rule_signal gets the
highest starting weight because it's the only fully deterministic
component" (\u00a74.1) -- i.e. exactly the fallback the architecture doc
says to use when calibration can't run yet. There is no llm_confidence
signal available yet (LLM Bench isn't wired in), so agreement_bonus is
0 for every pair and llm_confidence is treated as absent (weight
redistributed to rule_signal + embedding_similarity).

SWAP THIS OUT the moment A1 ships real trust_scores.json -- L6 only ever
reads `verdict["trust_score"]` / `verdict["confidence_tier"]`, so nothing
downstream changes.
"""
from backend.engine.models import config


def compute_stub_trust_scores(rule_verdicts, candidate_pairs_by_id):
    """
    rule_verdicts: list from L4 (this stub has no llm_verdicts to merge yet).
    Returns: list of {pair_id, trust_score, confidence_tier, verdict_source}
    """
    w = config.STUB_TRUST_WEIGHTS
    out = []
    for v in rule_verdicts:
        pair = candidate_pairs_by_id.get(v["pair_id"], {})
        embedding_sim = pair.get("embedding_similarity", 0.0)
        rule_signal = v.get("rule_signal", 0.0)
        agreement_bonus = 0.0  # no llm_bench verdict to agree/disagree with yet

        trust_score = (
            w["rule_signal"] * rule_signal
            + w["embedding_similarity"] * embedding_sim
            + w["agreement_bonus"] * agreement_bonus
        )
        trust_score = max(0.0, min(1.0, trust_score))

        if trust_score >= config.TRUST_TIER_HIGH:
            tier = "HIGH"
        elif trust_score >= config.TRUST_TIER_MEDIUM:
            tier = "MEDIUM"
        else:
            tier = "LOW"

        out.append({
            "pair_id": v["pair_id"],
            "trust_score": round(trust_score, 4),
            "confidence_tier": tier,
            "verdict_source": ["rule_bench"],
        })
    return out
