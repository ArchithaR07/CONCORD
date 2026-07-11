"""
L7 -- DECAY (Person A2). Architecture doc \u00a73/\u00a713.

Input : obligations.json (must carry last_reviewed / revision_status, set
        during L0 INGEST's metadata parsing)
Output: staleness.json           -- per-obligation staleness
        staleness_by_document.json -- per-document rollup, same shape as
                                       the challenge's own staleness.csv,
                                       so it's directly diffable (see
                                       scripts/validate_against_ground_truth.py)

Three independent signals, exactly as scoped to A2 in the architecture doc:
  1. date math            -- age_years vs. STALE_AGE_YEARS_THRESHOLD
  2. deprecated-tech dict -- flags obsolete tech regardless of date
  3. supersession language -- flagged, not auto-resolved (that LLM fallback
     is A1's territory once LLM Bench exists; here it's surfaced for
     manual review, never silently resolved)
"""
from collections import Counter, defaultdict
from datetime import date, datetime

from backend.engine import config


def _parse_iso(d):
    return datetime.strptime(d, "%Y-%m-%d").date() if d else None


def _deprecated_terms_found(text):
    low = text.lower()
    return [term for term in config.DEPRECATED_TERMS if term in low]


def _supersession_language_found(text):
    low = text.lower()
    return [phrase for phrase in config.SUPERSESSION_LANGUAGE if phrase in low]


def compute_obligation_staleness(obligation, today=None):
    today = today or date.today()
    status = obligation.get("revision_status", "unknown")
    last_reviewed = obligation.get("last_reviewed")
    deprecated = _deprecated_terms_found(obligation["raw_text"])
    supersession = _supersession_language_found(obligation["raw_text"])

    if status == "retired":
        staleness_status, stale, age_years = "RETIRED", True, None
    elif status == "dated":
        d = _parse_iso(last_reviewed)
        age_years = round((today - d).days / 365.25, 2) if d else None
        stale = age_years is not None and age_years > config.STALE_AGE_YEARS_THRESHOLD
        staleness_status = "STALE" if stale else "CURRENT"
    elif status == "updated_undated":
        staleness_status, stale, age_years = "UPDATED_UNDATED", None, None
    else:
        staleness_status, stale, age_years = "UNKNOWN_NO_REVISION_DATE", None, None

    # Deprecated terminology overrides to stale=True regardless of date math --
    # obsolete tech references are stale on their face.
    if deprecated and not stale:
        stale = True
        if staleness_status in ("CURRENT",):
            staleness_status = "STALE"

    return {
        "obligation_id": obligation["id"],
        "doc_id": obligation["doc_id"],
        "policy": obligation["policy"],
        "stale": stale,
        "staleness_status": staleness_status,
        "age_years": age_years,
        "deprecated_terms_found": deprecated,
        "supersession_language_detected": bool(supersession),
        "supersession_phrases": supersession,
        "needs_manual_review": bool(supersession),  # LLM fallback not wired in -- surfaced, not auto-resolved
    }


def run_decay(obligations, today=None):
    return [compute_obligation_staleness(o, today=today) for o in obligations]


def rollup_by_document(obligation_staleness, obligations_by_id):
    """Per-document view, same shape family as the provided staleness.csv."""
    by_doc = defaultdict(list)
    for s in obligation_staleness:
        by_doc[s["doc_id"]].append(s)

    rows = []
    for doc_id, entries in by_doc.items():
        statuses = Counter(e["staleness_status"] for e in entries)
        # a document is RETIRED if any obligation says so; else STALE if the
        # majority of dated obligations are stale; else take the modal status
        if statuses["RETIRED"] > 0:
            doc_status = "RETIRED"
        elif statuses["STALE"] > 0:
            doc_status = "STALE"
        elif statuses["CURRENT"] > 0:
            doc_status = "CURRENT"
        else:
            doc_status = "UNKNOWN_NO_REVISION_DATE"

        ages = [e["age_years"] for e in entries if e["age_years"] is not None]
        sample_obl = obligations_by_id.get(entries[0]["obligation_id"], {})
        rows.append({
            "doc_id": doc_id,
            "policy_name": entries[0]["policy"],
            "source_file": sample_obl.get("source_file"),
            "source_type": sample_obl.get("source_type"),
            "n_obligations": len(entries),
            "n_stale": sum(1 for e in entries if e["stale"]),
            "age_years": round(sum(ages) / len(ages), 2) if ages else None,
            "staleness_status": doc_status,
        })
    return rows


def merge_staleness_into_findings(resolved_findings, stale_by_obligation_id):
    for f in resolved_findings:
        a_stale = stale_by_obligation_id.get(f["obligation_id_a"], {}).get("stale") or False
        b_stale = stale_by_obligation_id.get(f["obligation_id_b"], {}).get("stale") or False
        f["stale_flag"] = bool(a_stale or b_stale)
    return resolved_findings
