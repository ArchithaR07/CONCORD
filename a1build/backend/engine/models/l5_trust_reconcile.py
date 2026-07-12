import json
import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (precision_recall_curve, precision_score,
                              recall_score, f1_score, classification_report)

from . import config

FEATURE_NAMES = ["rule_signal", "embedding_similarity", "llm_confidence", "agreement_bonus"]

POSITIVE_SUBTYPES = {"DIRECT_CONFLICT", "PARTIAL_CONFLICT", "REDUNDANCY"}
HARD_NEGATIVE_SUBTYPES = {"FALSE_POSITIVE_PRONE"}
PAIRWISE_FINDING_TYPES = {"CONFLICT", "REDUNDANCY"}  # STALE is single-policy, excluded

TOPIC_FROM_DESC_RE = re.compile(r"\bon ([a-zA-Z][a-zA-Z\- ]*)\.?\s*$")
#Ground-truth label extraction from findings_labels.csv
def _extract_topic(row: pd.Series) -> str | None:
    for field in ("description", "explanation"):
        text = row.get(field)
        if isinstance(text, str):
            m = TOPIC_FROM_DESC_RE.search(text)
            if m:
                return m.group(1).strip().lower()
    return None


def load_ground_truth_labels(findings_csv: Path = config.FINDINGS_LABELS_CSV) -> list:
    df = pd.read_csv(findings_csv)
    df = df[df["finding_type"].isin(PAIRWISE_FINDING_TYPES)].copy()

    records = []
    for _, row in df.iterrows():
        if pd.isna(row.get("policy_a")) or pd.isna(row.get("policy_b")):
            continue  # not actually a pairwise row despite the finding_type
        pair = frozenset({row["policy_a"], row["policy_b"]})
        subtype = row["finding_subtype"]
        is_finding = 1 if subtype in POSITIVE_SUBTYPES else 0
        records.append({
            "policy_pair": pair,
            "topic": _extract_topic(row),
            "is_finding": is_finding,
            "subtype": subtype,
        })
    return records


def _match_label(pair_policy_a: str, pair_policy_b: str, pair_topic: str,
                  ground_truth: list) -> tuple[int, str]:
    pair_key = frozenset({pair_policy_a, pair_policy_b})
    candidates = [r for r in ground_truth if r["policy_pair"] == pair_key]
    if not candidates:
        return 0, "unmatched_implicit_negative"

    topic_matches = [r for r in candidates if r["topic"] and r["topic"] == pair_topic]
    if topic_matches:
        r = topic_matches[0]
        return r["is_finding"], r["subtype"]
    topicless_matches = [r for r in candidates if not r["topic"]]
    if topicless_matches:
        r = topicless_matches[0]
        return r["is_finding"], r["subtype"]

    return 0, "unmatched_implicit_negative"
def build_feature_table(candidate_pairs: list, rule_verdicts: list, llm_verdicts: list) -> pd.DataFrame:
    rule_by_pair = {v.get("pair_id"): v for v in rule_verdicts if v.get("pair_id")}
    llm_by_pair = {v.get("pair_id"): v for v in llm_verdicts if v.get("pair_id")}

    rows = []
    for cp in candidate_pairs:
        key = cp.get("pair_id")
        rule_v = rule_by_pair.get(key, {})
        llm_v = llm_by_pair.get(key, {})

        rule_signal = rule_v.get("rule_signal", 0.0)
        embedding_similarity = cp.get("embedding_similarity", 0.0)
        llm_confidence = llm_v.get("confidence", 0.0)
        agreement_bonus = 1.0 if (rule_v.get("verdict") and llm_v.get("verdict")
                                   and rule_v["verdict"] == llm_v["verdict"]) else 0.0

        rows.append({
            "pair_id": key,
            "obligation_a_id": cp.get("obligation_id_1") or cp.get("obligation_a_id"),
            "obligation_b_id": cp.get("obligation_id_2") or cp.get("obligation_b_id"),
            "policy_a": cp.get("policy_a", ""),
            "policy_b": cp.get("policy_b", ""),
            "topic": cp.get("topic"),
            "rule_signal": rule_signal,
            "embedding_similarity": embedding_similarity,
            "llm_confidence": llm_confidence,
            "agreement_bonus": agreement_bonus,
            "rule_verdict": rule_v.get("verdict"),
            "llm_verdict": llm_v.get("verdict"),
        })

    return pd.DataFrame(rows)


def attach_labels(feature_df: pd.DataFrame, ground_truth: list) -> pd.DataFrame:
    """Vectorized replacement for the old iterrows loop.
    Runs in O(n log n) via pandas merge instead of O(n * m) Python loops."""
    if not ground_truth:
        feature_df = feature_df.copy()
        feature_df["is_finding"] = 0
        feature_df["label_source"] = "unmatched_implicit_negative"
        return feature_df
    gt_df = pd.DataFrame(ground_truth)
    gt_df["pair_key"] = gt_df["policy_pair"].apply(
        lambda s: "|".join(sorted(s))
    )
    gt_df["topic"] = gt_df["topic"].fillna("")
    feature_df = feature_df.copy()
    pa = feature_df["policy_a"].astype(str)
    pb = feature_df["policy_b"].astype(str)
    swap = pa > pb
    feature_df["pair_key"] = np.where(swap, pb + "|" + pa, pa + "|" + pb)
    feature_df["topic_norm"] = feature_df["topic"].fillna("")
    gt_topic = gt_df[gt_df["topic"] != ""][["pair_key", "topic", "is_finding", "subtype"]].copy()
    gt_topic.rename(columns={"topic": "topic_norm"}, inplace=True)
    gt_topic = gt_topic.drop_duplicates(subset=["pair_key", "topic_norm"], keep="first")
    merged1 = feature_df[["pair_key", "topic_norm"]].merge(
        gt_topic, on=["pair_key", "topic_norm"], how="left"
    )
    gt_topicless = gt_df[gt_df["topic"] == ""][["pair_key", "is_finding", "subtype"]].copy()
    gt_topicless.rename(columns={"is_finding": "is_finding_fb", "subtype": "subtype_fb"}, inplace=True)
    gt_topicless = gt_topicless.drop_duplicates(subset=["pair_key"], keep="first")
    merged2 = feature_df[["pair_key"]].merge(
        gt_topicless, on="pair_key", how="left"
    )
    is_finding = merged1["is_finding"].where(
        merged1["is_finding"].notna(),
        merged2["is_finding_fb"]
    ).fillna(0).astype(int)

    label_source = merged1["subtype"].where(
        merged1["subtype"].notna(),
        merged2["subtype_fb"]
    ).fillna("unmatched_implicit_negative")

    feature_df["is_finding"] = is_finding.values
    feature_df["label_source"] = label_source.values
    feature_df.drop(columns=["pair_key", "topic_norm"], inplace=True)
    return feature_df


def _pooled_cv_predictions(X: np.ndarray, y: np.ndarray, n_pos: int) -> np.ndarray:
    from sklearn.model_selection import StratifiedKFold

    n_splits = 5 if n_pos >= 20 else 3
    splitter = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=config.RANDOM_STATE)

    probs_oof = np.zeros(len(y), dtype=float)
    for train_idx, test_idx in splitter.split(X, y):
        fold_clf = LogisticRegression(class_weight="balanced", max_iter=200, solver="liblinear")
        fold_clf.fit(X[train_idx], y[train_idx])
        probs_oof[test_idx] = fold_clf.predict_proba(X[test_idx])[:, 1]
    return probs_oof

def fit_trust_model(feature_df: pd.DataFrame) -> dict:
    X = feature_df[FEATURE_NAMES].values
    y = feature_df["is_finding"].values

    n_pos, n_neg = int(y.sum()), int((1 - y).sum())
    report = {"n_pairs": len(y), "n_positive": n_pos, "n_negative": n_neg}

    if n_pos < 3 or n_neg < 3:
        print(f"[L5] Only {n_pos} positive / {n_neg} negative labeled pairs — "
              f"too few to fit at all. Using documented fallback prior.")
        weights = {"rule_signal": 0.45, "embedding_similarity": 0.20,
                   "llm_confidence": 0.20, "agreement_bonus": 0.15}
        report["method"] = "fallback_prior_weights"
        report["weights"] = weights
        thresholds = {"HIGH": 0.70, "MEDIUM": 0.40}
        report["thresholds"] = thresholds
        return {"report": report, "model": None, "fallback_weights": weights,
                "thresholds": thresholds}
    probs_oof = _pooled_cv_predictions(X, y, n_pos)
    cv_scheme = "stratified_3fold" if n_pos < 20 else "stratified_5fold"

    preds_oof = (probs_oof >= 0.5).astype(int)
    report["method"] = "logistic_regression_fitted"
    report["cv_scheme"] = cv_scheme
    report["cv_precision_at_0.5"] = float(precision_score(y, preds_oof, zero_division=0))
    report["cv_recall_at_0.5"] = float(recall_score(y, preds_oof, zero_division=0))
    report["cv_f1_at_0.5"] = float(f1_score(y, preds_oof, zero_division=0))
    report["cv_classification_report"] = classification_report(y, preds_oof, zero_division=0)
    if n_pos < 15:
        report["caveat"] = (
            f"Only {n_pos} positively-labeled pairs survived matching against "
            f"findings_labels.csv (see calibration_report's label_coverage note). "
            f"Metrics above are pooled cross-validation, the most stable estimate "
            f"this sample size supports — treat them as directional, not final, "
            f"and prioritize collecting more labeled pairs before trusting this "
            f"model's precision/recall in production."
        )

    clf = LogisticRegression(class_weight="balanced", max_iter=200, solver="liblinear")
    clf.fit(X, y)
    report["coefficients"] = dict(zip(FEATURE_NAMES, clf.coef_[0].tolist()))
    report["intercept"] = float(clf.intercept_[0])
    precisions, recalls, pr_thresholds = precision_recall_curve(y, probs_oof)
    precisions, recalls = precisions[:-1], recalls[:-1]

    high_candidates = [t for p, t in zip(precisions, pr_thresholds) if p >= 0.70]
    medium_candidates = [t for p, t in zip(precisions, pr_thresholds) if p >= 0.50]

    high_cut = min(high_candidates) if high_candidates else 0.75
    medium_cut = min(medium_candidates) if medium_candidates else 0.45
    medium_cut = min(medium_cut, high_cut - 0.01) if high_cut > medium_cut else medium_cut

    thresholds = {"HIGH": round(float(high_cut), 3), "MEDIUM": round(float(medium_cut), 3)}
    report["thresholds"] = thresholds

    return {"report": report, "model": clf, "fallback_weights": None, "thresholds": thresholds}


def score_pairs(feature_df: pd.DataFrame, fit_result: dict) -> pd.DataFrame:
    feature_df = feature_df.copy()
    clf = fit_result["model"]

    if clf is not None:
        X = feature_df[FEATURE_NAMES].values
        feature_df["trust_score"] = clf.predict_proba(X)[:, 1]
    else:
        w = fit_result["fallback_weights"]
        feature_df["trust_score"] = sum(feature_df[f] * w[f] for f in FEATURE_NAMES)

    thresholds = fit_result["thresholds"]
    high_t = thresholds["HIGH"]
    med_t = thresholds["MEDIUM"]
    ts = feature_df["trust_score"]
    feature_df["confidence_tier"] = np.select(
        [ts >= high_t, ts >= med_t],
        ["HIGH",        "MEDIUM"],
        default="LOW"
    )
    return feature_df


def _label_coverage_note(ground_truth: list, feature_df: pd.DataFrame) -> dict:
    n_labeled_positive = sum(1 for r in ground_truth if r["is_finding"] == 1)
    n_labeled_negative_fp = sum(1 for r in ground_truth if r["is_finding"] == 0)
    n_matched_positive = int((feature_df["label_source"].isin(POSITIVE_SUBTYPES)).sum())
    n_matched_hard_negative = int((feature_df["label_source"].isin(HARD_NEGATIVE_SUBTYPES)).sum())
    return {
        "findings_labels_positive_rows": n_labeled_positive,
        "findings_labels_hard_negative_rows": n_labeled_negative_fp,
        "matched_to_a_real_candidate_pair_positive": n_matched_positive,
        "matched_to_a_real_candidate_pair_hard_negative": n_matched_hard_negative,
        "note": ("A labeled finding only becomes a usable training example if both "
                 "named policies actually contain an extractable obligation on the "
                 "stated topic. If matched << labeled, check obligations_embedded.json "
                 "for topic coverage gaps before assuming the matching logic is broken."),
    }


def sensitivity_note(fit_result: dict) -> str:
    if fit_result["model"] is None:
        return ("Fallback prior weights in effect (too few labeled pairs to fit). "
                "Re-run once findings_labels.csv has more coverage, or supply "
                "additional hand-labeled pairs, to switch to a fitted model.")
    return ("Weights fitted via logistic regression against findings_labels.csv, "
            "class-balanced. Tier cutoffs derived from the precision-recall curve, "
            "not asserted.")
def run(save: bool = True) -> pd.DataFrame:
    candidate_pairs = json.loads((config.OUTPUTS_DIR / "candidate_pairs.json").read_text())
    rule_verdicts = json.loads((config.OUTPUTS_DIR / "rule_verdicts.json").read_text())
    llm_verdicts = json.loads((config.OUTPUTS_DIR / "llm_verdicts.json").read_text())

    feature_df = build_feature_table(candidate_pairs, rule_verdicts, llm_verdicts)

    ground_truth = load_ground_truth_labels()
    feature_df = attach_labels(feature_df, ground_truth)

    fit_result = fit_trust_model(feature_df)
    fit_result["report"]["label_coverage"] = _label_coverage_note(ground_truth, feature_df)
    scored_df = score_pairs(feature_df, fit_result)

    if save:
        model_dir = config.OUTPUTS_DIR / "l5_model"
        model_dir.mkdir(exist_ok=True)

        if fit_result["model"] is not None:
            joblib.dump(fit_result["model"], model_dir / "trust_score_model.joblib")

        (model_dir / "calibration_report.json").write_text(
            json.dumps(fit_result["report"], indent=2, default=str), encoding="utf-8"
        )
        (model_dir / "thresholds.json").write_text(
            json.dumps(fit_result["thresholds"], indent=2), encoding="utf-8"
        )

        out_records = scored_df[[
            "pair_id", "obligation_a_id", "obligation_b_id", "policy_a", "policy_b", "topic",
            "rule_signal", "embedding_similarity", "llm_confidence", "agreement_bonus",
            "trust_score", "confidence_tier", "rule_verdict", "llm_verdict",
            "is_finding", "label_source",
        ]].to_dict(orient="records")
        out_path = config.OUTPUTS_DIR / "trust_scores.json"
        out_path.write_text(json.dumps(out_records, indent=2, default=float), encoding="utf-8")

        print(f"[L5 TRUST RECONCILE] {len(scored_df)} pairs scored "
              f"({fit_result['report']['method']}) -> {out_path}")
        print(f"[L5] tiers: "
              f"HIGH={sum(scored_df.confidence_tier=='HIGH')}, "
              f"MEDIUM={sum(scored_df.confidence_tier=='MEDIUM')}, "
              f"LOW={sum(scored_df.confidence_tier=='LOW')}")
        print(f"[L5] {sensitivity_note(fit_result)}")

    return out_records


if __name__ == "__main__":
    run()
