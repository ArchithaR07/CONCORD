"""
L6 -- ARBITRATE + PRECEDENCE ENGINE (Person A2). Architecture doc \u00a74.5.

Input : rule_verdicts.json (L4) [+ llm_verdicts.json from A1, if present]
        + trust_scores.json (L5 -- real or stub)
        + obligations.json
Output: resolved_findings.json (resolved_finding.schema.json)
        escalated_pairs.json  (verdict=ESCALATE, handed off for LLM Bench / manual review)

The 4-step precedence hierarchy, checked in order, first match wins:
  1. EXTERNAL MANDATE  -- binding external regulation wins outright
  2. SPECIFICITY        -- narrower scope governs for its subset (lex specialis)
  3. RECENCY             -- more recently reviewed policy is current intent
  4. AUTHORITY            -- configurable owner-seniority tiebreaker

This is deliberately NOT an LLM call: subset-detection between two
structured scopes is a set operation (see stub_scope.scope_relation),
which is what makes this cheap per the architecture doc.
"""
from datetime import date

from backend.engine.models import config
from backend.engine.stubs.stub_scope import scope_relation


def _policy_ref(obl):
    section = (obl.get("section") or "").strip()
    return f"{obl['policy_name']} \u00a7{section}" if section else obl["policy_name"]


def _authority_rank(policy_name):
    low = (policy_name or "").lower()
    best = config.AUTHORITY_RANK["default"]
    for key, rank in config.AUTHORITY_RANK.items():
        if key == "default":
            continue
        if key in low:
            best = max(best, rank)
    return best


def resolve_precedence(obl_a, obl_b):
    """
    Returns {resolution, reasoning_chain, precedence_basis} per \u00a74.5's
    output shape.
    """
    chain = []
    name_a, name_b = _policy_ref(obl_a), _policy_ref(obl_b)

    # ---- 1. external mandate ------------------------------------------
    mandate_a, mandate_b = obl_a.get("external_mandate"), obl_b.get("external_mandate")
    if mandate_a and not mandate_b:
        chain.append(f"{name_a} traces to a binding external mandate ({mandate_a}); {name_b} does not.")
        chain.append(f"Verdict: {name_a} governs outright -- regulatory override, not open to internal precedence.")
        return {"resolution": f"{name_a} governs (regulatory override: {mandate_a})",
                "reasoning_chain": chain, "precedence_basis": "regulatory_override"}
    if mandate_b and not mandate_a:
        chain.append(f"{name_b} traces to a binding external mandate ({mandate_b}); {name_a} does not.")
        chain.append(f"Verdict: {name_b} governs outright -- regulatory override, not open to internal precedence.")
        return {"resolution": f"{name_b} governs (regulatory override: {mandate_b})",
                "reasoning_chain": chain, "precedence_basis": "regulatory_override"}
    if mandate_a and mandate_b:
        chain.append(f"Both sides trace to an external mandate ({mandate_a} / {mandate_b}) -- no outright winner here, continuing to specificity.")
    else:
        chain.append("No external regulatory mandate found on either side.")

    # ---- 2. specificity --------------------------------------------------
    rel = scope_relation(obl_a["scope"], obl_b["scope"])
    if rel == "subset_1_in_2":
        chain.append(f"{name_a}'s scope is a strict subset of {name_b}'s -- specificity rule applies.")
        chain.append(f"Verdict: {name_a} is operative for its (narrower) scope; {name_b} remains operative elsewhere.")
        return {"resolution": f"{name_a} governs for its scope", "reasoning_chain": chain, "precedence_basis": "specificity"}
    if rel == "subset_2_in_1":
        chain.append(f"{name_b}'s scope is a strict subset of {name_a}'s -- specificity rule applies.")
        chain.append(f"Verdict: {name_b} is operative for its (narrower) scope; {name_a} remains operative elsewhere.")
        return {"resolution": f"{name_b} governs for its scope", "reasoning_chain": chain, "precedence_basis": "specificity"}
    chain.append("Scopes genuinely overlap without one subsuming the other -- specificity does not resolve this; continuing to recency.")

    # ---- 3. recency --------------------------------------------------
    date_a, date_b = obl_a.get("last_reviewed"), obl_b.get("last_reviewed")
    if date_a and date_b:
        if date_a != date_b:
            winner, wname, loser_name, wdate = (
                (obl_a, name_a, name_b, date_a) if date_a > date_b else (obl_b, name_b, name_a, date_b)
            )
            chain.append(f"Both sides have a review date ({date_a} vs {date_b}); {wname} is more recent.")
            chain.append(f"Verdict: {wname} is treated as current intent (reviewed {wdate}).")
            return {"resolution": f"{wname} governs (more recently reviewed)", "reasoning_chain": chain, "precedence_basis": "recency"}
        chain.append("Both sides have the same review date -- recency does not resolve this; continuing to authority.")
    elif date_a and not date_b:
        chain.append(f"Only {name_a} has a known review date ({date_a}); {name_b}'s is unknown.")
        chain.append(f"Verdict: {name_a} is treated as current intent (only side with a dated review).")
        return {"resolution": f"{name_a} governs (only side with a known review date)", "reasoning_chain": chain, "precedence_basis": "recency"}
    elif date_b and not date_a:
        chain.append(f"Only {name_b} has a known review date ({date_b}); {name_a}'s is unknown.")
        chain.append(f"Verdict: {name_b} is treated as current intent (only side with a dated review).")
        return {"resolution": f"{name_b} governs (only side with a known review date)", "reasoning_chain": chain, "precedence_basis": "recency"}
    else:
        chain.append("Neither side has a usable review date -- recency does not resolve this; continuing to authority.")

    # ---- 4. authority (final tiebreaker) --------------------------------
    rank_a, rank_b = _authority_rank(obl_a["policy_name"]), _authority_rank(obl_b["policy_name"])
    if rank_a != rank_b:
        winner_name = name_a if rank_a > rank_b else name_b
        chain.append(f"Authority tiebreaker: {obl_a['policy_name']} (rank {rank_a}) vs {obl_b['policy_name']} (rank {rank_b}).")
        chain.append(f"Verdict: {winner_name} governs (higher-authority policy owner).")
        return {"resolution": f"{winner_name} governs (authority tiebreaker)", "reasoning_chain": chain, "precedence_basis": "authority"}

    chain.append(f"Authority tiebreaker also ties ({obl_a['policy_name']} and {obl_b['policy_name']} share rank {rank_a}).")
    chain.append("Verdict: unresolved by the automated hierarchy -- flagged for manual review.")
    return {"resolution": "Unresolved -- both policies at equal precedence; manual review required",
            "reasoning_chain": chain, "precedence_basis": "unresolved"}


def _severity(finding_type, tier):
    if finding_type != "CONFLICT":
        return "N/A"
    return tier if tier in ("HIGH", "MEDIUM") else "LOW"


def build_resolved_findings(rule_verdicts, trust_scores_by_pair, obligations_by_id):
    """Returns (resolved_findings, escalated_pairs) -- two lists."""
    findings = []
    escalated = []
    fid_counter = 1

    for v in rule_verdicts:
        pair_id = v["pair_id"]
        trust = trust_scores_by_pair.get(pair_id, {"trust_score": 0.0, "confidence_tier": "LOW", "verdict_source": ["rule_bench"]})
        obl_a = obligations_by_id.get(v["obligation_id_1"])
        obl_b = obligations_by_id.get(v["obligation_id_2"])
        if obl_a is None or obl_b is None:
            continue

        if v["verdict"] == "ESCALATE":
            escalated.append({
                "pair_id": pair_id,
                "obligation_id_a": obl_a["id"],
                "obligation_id_b": obl_b["id"],
                "policy_a": _policy_ref(obl_a),
                "policy_b": _policy_ref(obl_b),
                "rule_bench_note": v["explanation"],
                "trust_score_so_far": trust["trust_score"],
                "status": "AWAITING_LLM_BENCH",
            })
            continue

        if v["verdict"] not in ("CONFLICT", "REDUNDANT"):
            continue  # COMPLEMENTARY / UNRELATED are not surfaced as findings

        finding_id = f"FIND-{fid_counter:05d}"
        fid_counter += 1

        precedence = None
        if v["verdict"] == "CONFLICT":
            precedence = resolve_precedence(obl_a, obl_b)

        findings.append({
            "finding_id": finding_id,
            "finding_type": v["verdict"],
            "severity": _severity(v["verdict"], trust["confidence_tier"]),
            "trust_score": trust["trust_score"],
            "confidence_tier": trust["confidence_tier"],
            "verdict_source": trust.get("verdict_source", ["l5_model"]),
            "is_keystone": None,  # back-filled by L9 CENTRALITY
            "obligation_id_a": obl_a["id"],
            "obligation_id_b": obl_b["id"],
            "policy_a": _policy_ref(obl_a),
            "policy_b": _policy_ref(obl_b),
            "description": v["explanation"],
            "scope_analysis": f"scope_relation={v['evidence']['scope_relation']}",
            "precedence_resolution": precedence,
            "stale_flag": False,  # merged in after L7 runs, see merge_staleness_into_findings
            "recommendation": _recommendation(v["verdict"], precedence, obl_a, obl_b),
            "compliance_impact": [],
        })

    return findings, escalated


def _recommendation(finding_type, precedence, obl_a, obl_b):
    if finding_type == "REDUNDANT":
        return (f"Consolidate into a single canonical clause; retire the duplicate in "
                f"{_policy_ref(obl_b)} in favor of {_policy_ref(obl_a)} "
                f"(or vice versa) to reduce policy debt.")
    if precedence and precedence["precedence_basis"] != "unresolved":
        return (f"Adopt \"{precedence['resolution']}\" as the operative rule; formally amend the "
                f"losing policy to cross-reference this exception instead of silently conflicting.")
    return "Escalate to policy owners for manual reconciliation -- automated precedence hierarchy could not resolve this pair."
