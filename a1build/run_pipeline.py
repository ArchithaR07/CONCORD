import sys
import time
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from backend.engine.models import (
    l0_ingest, l1_extract, l2_lens,
    l4_llm_bench, l5_trust_reconcile, config,
)
from backend.engine.rules.io_utils import index_by_id
from backend.engine.rules.filter_l3 import generate_candidate_pairs
from backend.engine.rules.rule_bench_l4 import run_rule_bench
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
from backend.engine.models import crucible_l15, synod_l16


def main():
    t0 = time.time()
    print("=" * 70)
    print("CONCORD — Unified Pipeline (v2)")
    print("=" * 70)

    # --- L0 INGEST ---
    print("\n--- L0 INGEST ---")
    l0_ingest.run()

    # --- L1 EXTRACT ---
    print("\n--- L1 EXTRACT ---")
    obligations = l1_extract.run()

    # --- L2 LENS ---
    print("\n--- L2 LENS ---")
    obligations = l2_lens.run()

    obligations_by_id = index_by_id(obligations, key="id")

    # --- L3 FILTER ---
    print("\n--- L3 FILTER ---")
    candidate_pairs = generate_candidate_pairs(obligations)
    candidate_pairs_by_id = index_by_id(candidate_pairs, key="pair_id")
    
    out_path = config.OUTPUTS_DIR / "candidate_pairs.json"
    out_path.write_text(json.dumps(candidate_pairs, indent=2), encoding="utf-8")
    print(f"Generated {len(candidate_pairs)} candidate pairs.")

    # --- L4 RULE BENCH ---
    print("\n--- L4 RULE BENCH ---")
    rule_verdicts = run_rule_bench(candidate_pairs, obligations_by_id)
    out_path = config.OUTPUTS_DIR / "rule_verdicts.json"
    out_path.write_text(json.dumps(rule_verdicts, indent=2), encoding="utf-8")
    print(f"Generated {len(rule_verdicts)} rule verdicts.")

    # --- L4 LLM BENCH (only for ESCALATEd pairs) ---
    print("\n--- L4 LLM BENCH ---")
    escalated_pairs_for_llm = []
    for v in rule_verdicts:
        if v["verdict"] == "ESCALATE":
            pid = v["pair_id"]
            escalated_pairs_for_llm.append(candidate_pairs_by_id[pid])
            
    llm_verdicts = l4_llm_bench.run_on_candidate_pairs(obligations_by_id, escalated_pairs_for_llm)

    # --- L5 TRUST RECONCILE ---
    print("\n--- L5 TRUST RECONCILE ---")
    trust_scores = l5_trust_reconcile.run()
    trust_scores_by_pair = index_by_id(trust_scores, key="pair_id")

    # --- L6 ARBITRATE ---
    print("\n--- L6 ARBITRATE ---")
    # For A2's rule bench, it merged llm verdicts if run from pipeline, but we run A1's l5 first.
    # L6 arbitrate needs the rule_verdicts, but wait, the llm_verdicts resolve the ESCALATEd pairs!
    # Let's merge the LLM verdicts back into rule_verdicts for L6 to process, OR trust_scores has everything.
    # We will let L6 run. It looks at rule_verdicts and trust_scores.
    # Wait, A2's `build_resolved_findings` looks at `rule_verdicts`. It ignores ESCALATEd pairs.
    # We need to inject LLM verdicts into rule_verdicts so they aren't skipped by L6.
    
    for v in rule_verdicts:
        if v["verdict"] == "ESCALATE":
            pid = v["pair_id"]
            # Check if LLM bench resolved it
            for llm_v in llm_verdicts:
                if llm_v["pair_id"] == pid and llm_v.get("verdict"):
                    v["verdict"] = llm_v["verdict"]
                    v["explanation"] = llm_v.get("explanation", v["explanation"])
                    if "evidence" not in v:
                        v["evidence"] = {}
                    v["evidence"]["llm_reasoning"] = llm_v.get("scope_analysis", "")
                    break

    resolved_findings, escalated_pairs = build_resolved_findings(rule_verdicts, trust_scores_by_pair, obligations_by_id)

    # --- L7 DECAY ---
    print("\n--- L7 DECAY ---")
    obligation_staleness = run_decay(obligations)
    staleness_by_doc = rollup_by_document(obligation_staleness, obligations_by_id)
    stale_by_obl = index_by_id(obligation_staleness, key="obligation_id")
    resolved_findings = merge_staleness_into_findings(resolved_findings, stale_by_obl)

    out_path = config.OUTPUTS_DIR / "staleness.json"
    out_path.write_text(json.dumps(staleness_by_doc, indent=2), encoding="utf-8")

    # --- L11 COMPASS ---
    print("\n--- L11 COMPASS ---")
    resolved_findings = apply_compass_mapping(resolved_findings)

    # --- L12 VOICE ---
    print("\n--- L12 VOICE ---")
    resolved_findings = apply_voice_explanations(resolved_findings)

    out_path = config.OUTPUTS_DIR / "resolved_findings.json"
    out_path.write_text(json.dumps(resolved_findings, indent=2), encoding="utf-8")
    print(f"Generated {len(resolved_findings)} resolved findings.")

    out_path = config.OUTPUTS_DIR / "escalated_pairs.json"
    out_path.write_text(json.dumps(escalated_pairs, indent=2), encoding="utf-8")

    # --- L8 MESH ---
    print("\n--- L8 MESH ---")
    G = build_graph(resolved_findings, obligations_by_id)

    # --- L9 CENTRALITY ---
    print("\n--- L9 CENTRALITY ---")
    keystone_scores, betweenness, degree = compute_keystone_scores(G)
    is_keystone = determine_is_keystone(keystone_scores)
    graph_export = export_graph(G, keystone_scores, betweenness, degree, is_keystone)
    resolved_findings = enrich_findings_with_keystone(resolved_findings, is_keystone)

    out_path = config.OUTPUTS_DIR / "graph_export.json"
    out_path.write_text(json.dumps(graph_export, indent=2), encoding="utf-8")

    # --- L10 SCORE ---
    print("\n--- L10 SCORE ---")
    alpha = config.DEFAULT_ALPHA
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

    out_path = config.OUTPUTS_DIR / "scores.json"
    out_path.write_text(json.dumps(scores, indent=2), encoding="utf-8")

    # --- L15 CRUCIBLE ---
    print("\n--- L15 CRUCIBLE ---")
    crucible_l15.run()

    # --- L16 SYNOD ---
    print("\n--- L16 SYNOD ---")
    synod_l16.run()

    print("\n" + "=" * 70)
    print(f"Done in {time.time() - t0:.1f}s. Unified Outputs in {config.OUTPUTS_DIR}/")
    print("=" * 70)


if __name__ == "__main__":
    main()
