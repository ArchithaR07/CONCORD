#!/usr/bin/env python3
"""
prepare_obligations.py — legacy A2 helper script, ported to a1build.

NOTE: This script is only needed if you want to run the pipeline from the
raw CSV labels (obligation_extracts_labels.csv) instead of the .md policy
files. In the unified system, L0 INGEST + L1 EXTRACT + L2 LENS already
produce obligations.json from the .md files. Run run_pipeline.py instead.

This script exists as a fallback / data-prep utility.

Usage (from a1build/ with venv active):
    python scripts/prepare_obligations.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
from backend.engine.models import config
from backend.engine.rules.io_utils import save_json, now_iso
from backend.engine.rules.text_signals import parse_period, parse_revision
from backend.engine.stubs.stub_embeddings import compute_stub_embeddings
from backend.engine.stubs.stub_scope import extract_stub_scope, extract_external_mandate
from backend.engine.stubs.stub_topic import assign_topic

ACTION_MAP = {
    "MANDATORY": "REQUIRE",
    "PROHIBITION": "PROHIBIT",
    "RECOMMENDED": "RECOMMEND",
    "DISCRETIONARY": "PERMIT",
}
STRENGTH_MAP = {
    "MANDATORY": "mandatory",
    "PROHIBITION": "mandatory",
    "RECOMMENDED": "recommended",
    "DISCRETIONARY": "optional",
}


def _clean(v, default=None):
    if v is None:
        return default
    try:
        if pd.isna(v):
            return default
    except (TypeError, ValueError):
        pass
    return v


def main():
    obligations_csv = config.SAMPLE_DATA_DIR / "obligation_extracts_labels.csv"
    metadata_csv = config.SAMPLE_DATA_DIR / "policy_metadata.csv"

    if not obligations_csv.exists():
        print(f"obligation_extracts_labels.csv not found in {config.SAMPLE_DATA_DIR}")
        sys.exit(1)

    df_obs = pd.read_csv(obligations_csv)
    df_meta = pd.read_csv(metadata_csv)
    print(f"Loaded {len(df_obs)} obligations and {len(df_meta)} policy metadata rows.")

    # Build metadata lookup
    meta_map = {}
    for _, row in df_meta.iterrows():
        meta_map[row["file"]] = {
            "title": row["title"],
            "department": row["department"],
            "last_reviewed": row["last_reviewed"],
            "status": row["status"],
            "version": row["version"],
        }

    texts = df_obs["obligation_text"].fillna("").tolist()
    print("Computing stub embeddings (TF-IDF + SVD)...")
    embeddings = compute_stub_embeddings(texts, n_components=100)

    obligations = []
    for i, row in df_obs.iterrows():
        text = _clean(row["obligation_text"], "") or ""
        policy_file = _clean(row["policy_file"], "")
        meta = meta_map.get(policy_file, {
            "title": policy_file.replace(".md", ""),
            "department": "Operations",
            "last_reviewed": "2024-01-01",
            "status": "active",
            "version": "1.0",
        })

        strength_val = _clean(row["strength"], "must").strip().lower()
        if strength_val in ["must", "required", "shall"]:
            action, strength = "REQUIRE", "mandatory"
        elif strength_val == "prohibited":
            action, strength = "PROHIBIT", "mandatory"
        elif strength_val in ["recommended", "should"]:
            action, strength = "RECOMMEND", "recommended"
        else:
            action, strength = "REQUIRE", "mandatory"

        last_reviewed = meta["last_reviewed"]
        try:
            age_years = float(2026 - int(str(last_reviewed).split("-")[0]))
        except Exception:
            age_years = 2.0

        scope = extract_stub_scope(meta["title"], text)
        user_scope = _clean(row.get("scope"), "Global").strip()
        if user_scope:
            scope["department"] = [user_scope.lower()]

        obligations.append({
            "id": f"OBL-{i+1:05d}",
            "policy_file": policy_file,           # A1 key
            "policy_name": meta["title"],          # A1 key
            "department": meta["department"],
            "section": "General",
            "obligation": None,
            "action": action,
            "scope": scope,
            "strength": strength,
            "frequency": "Continuous",
            "topic": _clean(row["topic"], "General"),
            "external_mandate": extract_external_mandate(text),
            "raw_text": text,
            "embedding": embeddings[i].tolist(),
            "last_reviewed": last_reviewed,
            "revision_status": meta["status"],
            "age_years": age_years,
            "source_file": policy_file,
            "source_type": "uploaded_org_policy_md",
            "extraction_method": "csv_import",
            "extraction_confidence": 1.0,
        })

    out_path = config.OUTPUTS_DIR / "obligations.json"
    config.OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    save_json(obligations, out_path)
    print(f"Wrote {len(obligations)} obligations -> {out_path}")


if __name__ == "__main__":
    main()
