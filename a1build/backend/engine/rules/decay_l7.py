
from collections import Counter, defaultdict
from datetime import date, datetime

from backend.engine.models import config


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

    
    
    if deprecated and not stale:
        stale = True
        if staleness_status in ("CURRENT",):
            staleness_status = "STALE"

    return {
        "obligation_id": obligation["id"],
        "policy_file": obligation["policy_file"],
        "policy": obligation["policy_name"],
        "stale": stale,
        "staleness_status": staleness_status,
        "age_years": age_years,
        "deprecated_terms_found": deprecated,
        "supersession_language_detected": bool(supersession),
        "supersession_phrases": supersession,
        "needs_manual_review": bool(supersession),  
    }


def run_decay(obligations, today=None):
    return [compute_obligation_staleness(o, today=today) for o in obligations]


def rollup_by_document(obligation_staleness, obligations_by_id):
    
    by_doc = defaultdict(list)
    for s in obligation_staleness:
        by_doc[s["policy_file"]].append(s)

    rows = []
    for doc_id, entries in by_doc.items():
        statuses = Counter(e["staleness_status"] for e in entries)
        
        
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
            "policy_file": doc_id,
            "policy_name": entries[0].get("policy_name", entries[0].get("policy")),
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
