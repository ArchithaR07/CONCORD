#!/usr/bin/env python3
"""
Converts sample_data/policy_obligations.csv into outputs/obligations.json,
matching shared/schemas/obligation.schema.json.

WHY THIS SCRIPT EXISTS: A2's real input (obligations.json) is supposed to
come from A1's L0 INGEST -> L1 EXTRACT -> L2 LENS. A1 hasn't shipped yet,
and the hackathon's actual sample data arrives as a flat obligations CSV
rather than raw .md policy files -- so this script plays A1's role using
the stub modules in backend/engine/stubs/, purely so A2's L3-L10 can be
built and tested against real data today.

THE MOMENT A1 SHIPS A REAL obligations.json (with real sentence-transformer
embeddings + real LLM-extracted structured scope), skip this script
entirely and point run_pipeline.py at that file instead. See README.

Usage:
    python scripts/prepare_obligations.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
from backend.engine import config
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
    """pandas' nullable dtypes don't always survive df.where(pd.notna(df), None)
    cleanly (NaN can round-trip as the literal string 'nan' downstream) --
    check explicitly instead."""
    if v is None:
        return default
    try:
        if pd.isna(v):
            return default
    except (TypeError, ValueError):
        pass
    return v


def main():
    # Paths for new datasets
    obligations_csv = config.SAMPLE_DATA_DIR / "obligation_extracts_labels.csv"
    metadata_csv = config.SAMPLE_DATA_DIR / "policy_metadata.csv"

    df_obs = pd.read_csv(obligations_csv)
    df_meta = pd.read_csv(metadata_csv)

    print(f"Loaded {len(df_obs)} obligations and {len(df_meta)} policy metadata rows.")

    # Create metadata mapping
    meta_map = {}
    for _, row in df_meta.iterrows():
        meta_map[row["file"]] = {
            "title": row["title"],
            "department": row["department"],
            "last_reviewed": row["last_reviewed"],
            "status": row["status"],
            "version": row["version"]
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
            "version": "1.0"
        })

        strength_val = _clean(row["strength"], "must").strip().lower()
        
        # Determine action and strength
        if strength_val in ["must", "required", "shall"]:
            action = "REQUIRE"
            strength = "mandatory"
        elif strength_val == "prohibited":
            action = "PROHIBIT"
            strength = "mandatory"
        elif strength_val in ["recommended", "should"]:
            action = "RECOMMEND"
            strength = "recommended"
        else:
            action = "REQUIRE"
            strength = "mandatory"

        # Determine age
        last_reviewed = meta["last_reviewed"]
        try:
            year = int(last_reviewed.split("-")[0])
            age_years = float(2026 - year)
        except Exception:
            age_years = 2.0

        scope = extract_stub_scope(meta["title"], text)
        user_scope = _clean(row.get("scope"), "Global").strip()
        if user_scope:
            scope["department"] = [user_scope.lower()]

        obligations.append({
            "id": f"OBL-{i+1:05d}",
            "doc_id": policy_file,
            "policy": meta["title"],
            "section": "General",
            "obligation": None,
            "action": action,
            "scope": scope,
            "strength": strength,
            "frequency": "Continuous",
            "period_hours": None,
            "period_categorical": None,
            "topic": _clean(row["topic"], "General"),
            "external_mandate": extract_external_mandate(text),
            "raw_text": text,
            "embedding": embeddings[i].tolist(),
            "last_reviewed": last_reviewed,
            "revision_status": meta["status"],
            "age_years": age_years,
            "source_file": policy_file,
            "source_type": "uploaded_org_policy_md",
        })

    out_path = config.OUTPUTS_DIR / "obligations.json"
    # Ensure outputs directory exists
    config.OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    save_json({"generated_at": now_iso(), "count": len(obligations), "obligations": obligations}, out_path)
    print(f"Wrote {len(obligations)} obligations -> {out_path}")


if __name__ == "__main__":
    main()
