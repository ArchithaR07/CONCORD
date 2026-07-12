#!/usr/bin/env python3
"""
scripts/run_pipeline.py — Legacy A2 L3-L12 pipeline script, ported to a1build.

NOTE: In the unified system you should run the top-level run_pipeline.py
(a1build/run_pipeline.py) which runs L0 through L16 in one shot.

This script is kept for reference / standalone testing of L3-L12 only.
It assumes obligations.json already exists in outputs/ (produced by
run_pipeline.py or prepare_obligations.py).

Usage (from a1build/ with venv active):
    python scripts/run_pipeline.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.engine.models import config
from backend.engine.rules.io_utils import load_json, save_json
from backend.engine.rules.pipeline import run_pipeline


def main():
    obligations_path = config.OUTPUTS_DIR / "obligations.json"
    if not obligations_path.exists():
        print("outputs/obligations.json not found.")
        print("Run the unified pipeline first: python run_pipeline.py")
        sys.exit(1)

    data = load_json(obligations_path)
    obligations = data if isinstance(data, list) else data.get("obligations", [])

    # Normalise schema keys so A2 rule modules are happy
    for obl in obligations:
        if "policy_file" in obl and "doc_id" not in obl:
            obl["doc_id"] = obl["policy_file"]
        if "policy_name" in obl and "policy" not in obl:
            obl["policy"] = obl["policy_name"]
        if "revision_status" not in obl:
            obl["revision_status"] = "unknown"

    print(f"Loaded {len(obligations)} obligations.")

    result = run_pipeline(obligations, alpha=config.DEFAULT_ALPHA)

    save_json(result["candidate_pairs"],      config.OUTPUTS_DIR / "candidate_pairs.json")
    save_json(result["rule_verdicts"],        config.OUTPUTS_DIR / "rule_verdicts.json")
    save_json(result["trust_scores"],         config.OUTPUTS_DIR / "trust_scores.json")
    save_json(result["resolved_findings"],    config.OUTPUTS_DIR / "resolved_findings.json")
    save_json(result["escalated_pairs"],      config.OUTPUTS_DIR / "escalated_pairs.json")
    save_json(result["obligation_staleness"], config.OUTPUTS_DIR / "staleness.json")
    save_json(result["staleness_by_document"],config.OUTPUTS_DIR / "staleness_by_document.json")
    save_json(result["graph_export"],         config.OUTPUTS_DIR / "graph_export.json")
    save_json(result["scores"],               config.OUTPUTS_DIR / "scores.json")

    n_conflict  = sum(1 for f in result["resolved_findings"] if f["finding_type"] == "CONFLICT")
    n_redundant = sum(1 for f in result["resolved_findings"] if f["finding_type"] == "REDUNDANT")
    n_keystone  = sum(1 for f in result["resolved_findings"] if f.get("is_keystone"))

    print("\n--- L3-L12 PIPELINE SUMMARY ---")
    print(f"Candidate pairs (L3):     {len(result['candidate_pairs'])}")
    print(f"Rule verdicts  (L4):      {len(result['rule_verdicts'])}")
    print(f"  -> ESCALATE:            {sum(1 for v in result['rule_verdicts'] if v['verdict'] == 'ESCALATE')}")
    print(f"Resolved findings (L6):   {len(result['resolved_findings'])}  ({n_conflict} CONFLICT, {n_redundant} REDUNDANT)")
    print(f"  -> keystone-flagged:    {n_keystone}")
    print(f"Escalated for review:     {len(result['escalated_pairs'])}")
    print(f"Stale obligations (L7):   {sum(1 for s in result['obligation_staleness'] if s.get('stale'))} / {len(result['obligation_staleness'])}")
    print(f"Graph nodes/edges (L8-9): {len(result['graph_export']['nodes'])} / {len(result['graph_export']['edges'])}")
    print(f"Org-wide health score:    {result['scores']['org_wide_score']}")
    print(f"\nAll artifacts written to {config.OUTPUTS_DIR}/")


if __name__ == "__main__":
    main()
