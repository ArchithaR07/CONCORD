
import re
from datetime import date, datetime
from difflib import SequenceMatcher


UNIT_TO_HOURS = {
    "hour": 1, "hours": 1, "hr": 1, "hrs": 1,
    "day": 24, "days": 24,
    "week": 24 * 7, "weeks": 24 * 7,
    "month": 24 * 30.44, "months": 24 * 30.44,
    "year": 24 * 365.25, "years": 24 * 365.25,
}
CATEGORICAL_PERIOD_TOKENS = {"periodic_mandatory", "event_driven_only", "continuous", "ad_hoc"}

_PERIOD_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(hours?|hrs?|days?|weeks?|months?|years?)", re.IGNORECASE)


def parse_period(text, extracted_period_field=None):
    
    candidates = []
    if extracted_period_field and isinstance(extracted_period_field, str):
        candidates.append(extracted_period_field)
    if text:
        candidates.append(text)

    for cand in candidates:
        low = cand.strip().lower().replace("_", " ")
        if low in CATEGORICAL_PERIOD_TOKENS:
            return None, cand.strip().upper().replace(" ", "_"), True
        m = _PERIOD_RE.search(cand)
        if m:
            qty = float(m.group(1))
            unit = m.group(2).lower()
            hours = qty * UNIT_TO_HOURS[unit if unit in UNIT_TO_HOURS else unit.rstrip("s")]
            return round(hours, 2), f"{m.group(1)}_{unit}", False
    return None, None, False


def periods_conflict(hours_1, hours_2, tolerance_fraction=0.05):
    
    if hours_1 is None or hours_2 is None:
        return False
    if hours_1 == 0 and hours_2 == 0:
        return False
    denom = max(hours_1, hours_2, 1e-9)
    return abs(hours_1 - hours_2) / denom > tolerance_fraction



_MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}
_MONTH_DAY_YEAR = re.compile(r"([A-Za-z]{3,9})\.?\s+(\d{1,2})\s*,?\s+(\d{4})")
_MONTH_YEAR = re.compile(r"([A-Za-z]{3,9})\.?,?\s+(\d{4})")


def parse_revision(raw_revision_field, today=None):
    
    today = today or date.today()
    if raw_revision_field is None or (isinstance(raw_revision_field, float)) or not str(raw_revision_field).strip():
        return {"last_reviewed": None, "revision_status": "unknown", "age_years": None}

    raw = str(raw_revision_field).strip()
    low = raw.lower()

    if "retired" in low:
        return {"last_reviewed": None, "revision_status": "retired", "age_years": None}

    m = _MONTH_DAY_YEAR.search(raw)
    day = None
    if m and m.group(1).lower() in _MONTHS:
        month = _MONTHS[m.group(1).lower()]
        day = int(m.group(2))
        year = int(m.group(3))
    else:
        m2 = _MONTH_YEAR.search(raw)
        if m2 and m2.group(1).lower() in _MONTHS:
            month = _MONTHS[m2.group(1).lower()]
            year = int(m2.group(2))
            day = 1
        else:
            month = year = None

    if month is None:
        
        return {"last_reviewed": None, "revision_status": "updated_undated", "age_years": None}

    try:
        d = date(year, month, day or 1)
    except ValueError:
        return {"last_reviewed": None, "revision_status": "updated_undated", "age_years": None}

    age_years = round((today - d).days / 365.25, 2)
    return {"last_reviewed": d.isoformat(), "revision_status": "dated", "age_years": age_years}



_WORD_RE = re.compile(r"[a-z0-9]+")


def normalize_text(text):
    return " ".join(_WORD_RE.findall(text.lower()))


def text_similarity_ratio(a, b):
    
    return SequenceMatcher(None, normalize_text(a), normalize_text(b)).ratio()


def text_similarity_jaccard(a, b):
    ta, tb = set(normalize_text(a).split()), set(normalize_text(b).split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)
