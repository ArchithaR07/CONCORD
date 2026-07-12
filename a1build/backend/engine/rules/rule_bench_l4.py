"""
L4 -- RULE BENCH half (Person A2). LLM Bench half is A1's.

Input : candidate_pairs.json (L3) + obligations.json (A1)
Output: rule_verdicts.json (verdict.schema.json, source="rule_bench")

Pure deterministic logic -- no model calls anywhere in this file. Escalated
pairs (verdict=ESCALATE) are exactly the ones that, in the full system,
get handed to A1's LLM Bench. Since A1's LLM Bench isn't wired in yet,
L6 falls back to treating ESCALATE as "needs review" rather than blocking.
"""
from backend.engine.models import config
from backend.engine.rules.text_signals import text_similarity_ratio, text_similarity_jaccard, periods_conflict
from backend.engine.stubs.stub_scope import scope_relation


def _evaluate_pair(pair, obl_a, obl_b):
    text_sim = text_similarity_ratio(obl_a["raw_text"], obl_b["raw_text"])
    content_overlap = text_similarity_jaccard(obl_a["raw_text"], obl_b["raw_text"])
    same_subject = content_overlap >= config.CONTENT_OVERLAP_THRESHOLD

    evidence = {
        "text_similarity_ratio": round(text_sim, 4),
        "content_overlap_jaccard": round(content_overlap, 4),
        "same_topic": obl_a["topic"] == obl_b["topic"],
        "action_pair": sorted([obl_a["action"], obl_b["action"]]),
        "period_1_hours": obl_a.get("period_hours"),
        "period_2_hours": obl_b.get("period_hours"),
        "scope_relation": "unknown",
        "rule_fired": None,
    }

    # Rule 1 -- near-identical text -> REDUNDANT, highest-confidence rule.
    if text_sim >= config.TEXT_SIMILARITY_REDUNDANT_THRESHOLD:
        evidence["rule_fired"] = "near_identical_text"
        return _verdict("REDUNDANT", config.RULE_SIGNAL_CLEAR, evidence,
                         f"Obligation text is {text_sim:.0%} identical across "
                         f"{obl_a['policy_name']} and {obl_b['policy_name']} -- same requirement, restated.")

    scope_rel = scope_relation(obl_a["scope"], obl_b["scope"])
    evidence["scope_relation"] = scope_rel
    same_topic = evidence["same_topic"]
    action_pair = frozenset([obl_a["action"], obl_b["action"]])

    # Rule 2 -- scopes are disjoint -> can't conflict, they don't overlap.
    if scope_rel == "disjoint":
        evidence["rule_fired"] = "disjoint_scope"
        return _verdict("COMPLEMENTARY", config.RULE_SIGNAL_CLEAR, evidence,
                         "Scopes do not overlap (different department/geography/system_type) -- "
                         "no shared ground for a conflict.")

    scope_overlaps = scope_rel in ("overlap", "equal", "subset_1_in_2", "subset_2_in_1")

    # Rule 3 -- contradictory actions (REQUIRE vs PROHIBIT) on the same topic
    # with overlapping scope -> CONFLICT. Gated on same_subject: the topic
    # bucket alone is too coarse (see config.CONTENT_OVERLAP_THRESHOLD) --
    # without lexical overlap this rule fires on unrelated clauses that
    # merely share a broad label, which is a real false-positive source,
    # not a hypothetical one (caught during self-eval, see README).
    if same_topic and scope_overlaps and action_pair in config.CONTRADICTORY_ACTION_PAIRS:
        if same_subject:
            evidence["rule_fired"] = "contradictory_action_same_scope"
            return _verdict("CONFLICT", config.RULE_SIGNAL_CLEAR, evidence,
                             f"{obl_a['policy_name']} {evidence['action_pair'][0]}s while "
                             f"{obl_b['policy_name']} {evidence['action_pair'][1]}s the same thing, "
                             f"in overlapping scope.")
        evidence["rule_fired"] = "contradictory_action_low_overlap"
        return _verdict("ESCALATE", config.RULE_SIGNAL_ESCALATE, evidence,
                         "Actions contradict and topic/scope overlap, but the two clauses share "
                         "too little vocabulary to confirm they're actually about the same "
                         "underlying rule -- needs semantic review before calling it a conflict.")

    # Rule 4 -- both specify a numeric mandated period on the same topic,
    # in overlapping scope, share enough vocabulary to be the same subject,
    # and the periods disagree beyond tolerance -> CONFLICT.
    p1, p2 = obl_a.get("period_hours"), obl_b.get("period_hours")
    if same_topic and scope_overlaps and p1 is not None and p2 is not None:
        if periods_conflict(p1, p2, config.PERIOD_TOLERANCE_FRACTION):
            if same_subject:
                evidence["rule_fired"] = "differing_mandated_period"
                return _verdict("CONFLICT", config.RULE_SIGNAL_CLEAR, evidence,
                                 f"Same topic, overlapping scope, but mandated periods differ "
                                 f"({p1:g}h vs {p2:g}h) -- more than the {config.PERIOD_TOLERANCE_FRACTION:.0%} tolerance band.")
            evidence["rule_fired"] = "differing_period_low_overlap"
            return _verdict("ESCALATE", config.RULE_SIGNAL_ESCALATE, evidence,
                             "Periods differ and topic/scope overlap, but the two clauses share "
                             "too little vocabulary to confirm they govern the same requirement.")

    # Rule 4b -- categorical period type mismatch (e.g. PERIODIC_MANDATORY vs
    # EVENT_DRIVEN_ONLY) on the same topic -- mirrors the CONF-002 pattern
    # in the provided conflicts.csv.
    c1, c2 = obl_a.get("period_categorical"), obl_b.get("period_categorical")
    if same_topic and scope_overlaps and c1 and c2 and c1 != c2:
        if same_subject:
            evidence["rule_fired"] = "differing_period_type"
            return _verdict("CONFLICT", config.RULE_SIGNAL_CLEAR, evidence,
                             f"Same topic, overlapping scope, but one obligation is {c1} "
                             f"and the other is {c2} -- structurally different compliance cadence.")
        evidence["rule_fired"] = "differing_period_type_low_overlap"
        return _verdict("ESCALATE", config.RULE_SIGNAL_ESCALATE, evidence,
                         "Period *type* differs (periodic vs. event-driven) and topic/scope overlap, "
                         "but low vocabulary overlap -- needs semantic review.")

    # Rule 5 -- one scope is a strict subset of the other -> the narrower one
    # is a specific exception to the general rule, not a contradiction.
    if same_topic and scope_rel in ("subset_1_in_2", "subset_2_in_1"):
        evidence["rule_fired"] = "scope_subset_no_contradiction"
        return _verdict("COMPLEMENTARY", config.RULE_SIGNAL_CLEAR, evidence,
                         "Same topic, but one obligation's scope is a strict subset of the "
                         "other's -- reads as a specific exception, not a contradiction.")

    # Rule 6 -- same topic, overlapping scope, non-contradictory actions, but
    # we don't have enough structured signal (no periods, ambiguous action
    # combo) to call it cleanly -> ESCALATE for LLM Bench / manual review.
    if same_topic and scope_overlaps:
        evidence["rule_fired"] = "ambiguous_params"
        return _verdict("ESCALATE", config.RULE_SIGNAL_ESCALATE, evidence,
                         "Same topic and overlapping scope, but rule engine cannot cleanly "
                         "determine agreement/contradiction from structured fields alone.")

    # Rule 7 -- fell through on topic mismatch alone (pair only qualified via
    # embedding similarity) -> weak signal, no rule fired.
    evidence["rule_fired"] = "no_rule_fired"
    return _verdict("UNRELATED", config.RULE_SIGNAL_NONE, evidence,
                     "No deterministic rule matched; embedding similarity alone is not "
                     "sufficient grounds for a verdict.")


def _verdict(verdict, rule_signal, evidence, explanation):
    return {
        "verdict": verdict,
        "confidence": rule_signal,
        "rule_signal": rule_signal,
        "explanation": explanation,
        "evidence": evidence,
        "source": "rule_bench",
    }


def run_rule_bench(candidate_pairs, obligations_by_id):
    """Returns a list of verdict.schema.json records, one per candidate pair."""
    verdicts = []
    for pair in candidate_pairs:
        obl_a = obligations_by_id.get(pair["obligation_id_1"])
        obl_b = obligations_by_id.get(pair["obligation_id_2"])
        if obl_a is None or obl_b is None:
            continue
        v = _evaluate_pair(pair, obl_a, obl_b)
        v["pair_id"] = pair["pair_id"]
        v["obligation_id_1"] = pair["obligation_id_1"]
        v["obligation_id_2"] = pair["obligation_id_2"]
        verdicts.append(v)
    return verdicts
