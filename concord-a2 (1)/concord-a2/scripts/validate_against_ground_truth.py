#!/usr/bin/env python3
"""
Validates pipeline outputs against ground truth labels from findings_labels.csv.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
from backend.engine import config
from backend.engine.rules.io_utils import load_json


def _pair_key(a, b):
    return tuple(sorted([str(a).strip(), str(b).strip()]))


def main():
    findings_csv = config.SAMPLE_DATA_DIR / "findings_labels.csv"
    if not findings_csv.exists():
        print(f"findings_labels.csv not found in {config.SAMPLE_DATA_DIR}")
        sys.exit(1)

    df = pd.read_csv(findings_csv)
    print(f"Loaded {len(df)} labeled findings from ground truth.")

    # Load pipeline outputs
    resolved_findings_path = config.OUTPUTS_DIR / "resolved_findings.json"
    staleness_path = config.OUTPUTS_DIR / "staleness_by_document.json"

    if not resolved_findings_path.exists() or not staleness_path.exists():
        print("Pipeline outputs not found. Run scripts/run_pipeline.py first.")
        sys.exit(1)

    predicted_findings = load_json(resolved_findings_path)
    predicted_staleness = load_json(staleness_path)

    # Load obligations to map obligation_id to doc_id (file name)
    obligations_path = config.OUTPUTS_DIR / "obligations.json"
    if not obligations_path.exists():
        print("obligations.json not found.")
        sys.exit(1)
    obligations = load_json(obligations_path)["obligations"]
    obl_to_doc = {obl["id"]: obl["doc_id"] for obl in obligations}

    # Index predicted findings by policy pair file names
    pred_conflicts = set()
    pred_redundancies = set()
    for f in predicted_findings:
        doc_a = obl_to_doc.get(f["obligation_id_a"])
        doc_b = obl_to_doc.get(f["obligation_id_b"])
        if doc_a and doc_b:
            pair = _pair_key(doc_a, doc_b)
            if f["finding_type"] == "CONFLICT":
                pred_conflicts.add(pair)
            elif f["finding_type"] == "REDUNDANT":
                pred_redundancies.add(pair)

    # Index predicted staleness by policy file
    pred_stale_docs = set()
    for doc in predicted_staleness:
        if doc["staleness_status"] in ["STALE", "RETIRED"]:
            pred_stale_docs.add(doc["doc_id"])

    # Separate ground truth labels
    gt_conflicts = set()
    gt_redundancies = set()
    gt_stale_docs = set()

    for _, row in df.iterrows():
        f_type = str(row["finding_type"]).strip().upper()
        if f_type == "CONFLICT":
            gt_conflicts.add(_pair_key(row["policy_a"], row["policy_b"]))
        elif f_type == "REDUNDANCY":
            gt_redundancies.add(_pair_key(row["policy_a"], row["policy_b"]))
        elif f_type == "STALE":
            doc = str(row["policy"]).strip()
            if doc and doc != "nan":
                gt_stale_docs.add(doc)

    print("\n=== CONFLICT VALIDATION ===")
    print(f"Ground Truth Conflicts: {len(gt_conflicts)}")
    print(f"Pipeline Predicted Conflicts: {len(pred_conflicts)}")
    conflict_hits = gt_conflicts & pred_conflicts
    print(f"True Positives (Hits): {len(conflict_hits)}")
    conflict_recall = len(conflict_hits) / len(gt_conflicts) if gt_conflicts else 0.0
    print(f"Recall: {conflict_recall:.1%}")

    print("\n=== REDUNDANCY VALIDATION ===")
    print(f"Ground Truth Redundancies: {len(gt_redundancies)}")
    print(f"Pipeline Predicted Redundancies: {len(pred_redundancies)}")
    redundancy_hits = gt_redundancies & pred_redundancies
    print(f"True Positives (Hits): {len(redundancy_hits)}")
    redundancy_recall = len(redundancy_hits) / len(gt_redundancies) if gt_redundancies else 0.0
    print(f"Recall: {redundancy_recall:.1%}")

    print("\n=== STALENESS VALIDATION ===")
    print(f"Ground Truth Stale Policies: {len(gt_stale_docs)}")
    print(f"Pipeline Predicted Stale Policies: {len(pred_stale_docs)}")
    stale_hits = gt_stale_docs & pred_stale_docs
    print(f"True Positives (Hits): {len(stale_hits)}")
    stale_recall = len(stale_hits) / len(gt_stale_docs) if gt_stale_docs else 0.0
    print(f"Recall: {stale_recall:.1%}")


if __name__ == "__main__":
    main()
