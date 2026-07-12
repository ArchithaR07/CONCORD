import json
import re
from typing import Optional

from . import config
from .l4_llm_bench import get_llm_client  




STRENGTH_TO_ACTION = {
    "must": ("mandatory", "REQUIRE"),
    "shall": ("mandatory", "REQUIRE"),
    "required": ("mandatory", "REQUIRE"),
    "prohibited": ("mandatory", "PROHIBIT"),
    "may not": ("mandatory", "PROHIBIT"),
    "recommended": ("recommended", "RECOMMEND"),
    "should": ("recommended", "RECOMMEND"),
    "expected": ("recommended", "RECOMMEND"),
    "may": ("optional", "PERMIT"),
}
DEPRECATED_TECH_PATTERNS = [
    r"TLS\s*1\.0", r"SHA-?1\b", r"Windows Server 2012", r"MD5\b",
    r"SSLv3", r"Windows XP", r"DES\b(?!.*3DES)",
]
REGULATION_PATTERNS = [
    r"GDPR[\s\d]*", r"SOX[\s\d]*", r"NIST[\s\w\.-]*", r"ISO\s?27001",
    r"HIPAA", r"PCI[\s-]?DSS", r"COBIT",
]

TOPIC_KEYWORDS = {
    "password", "encryption", "access", "network", "cloud", "backup",
    "logging", "monitoring", "patch", "physical", "privacy", "mobile",
    "endpoint", "vendor", "third-party", "asset", "provisioning",
    "change", "data retention", "hr", "api",
}

PATTERN_A = re.compile(
    r"^(?P<scope>[A-Za-z][A-Za-z\-\s]*?)\s+"
    r"(?P<strength>must|shall|should|required|recommended)\s+"
    r"(?P<topic>[A-Za-z][A-Za-z\-\s]*?)\s+as per company standards\.?"
    r"(?:\s*\(Reference:\s*(?P<reference>[^)]+)\))?\s*$",
    re.IGNORECASE,
)
PATTERN_B = re.compile(
    r"^(?P<topic>[A-Za-z][A-Za-z\-\s]*?)\s+is\s+prohibited\s+for\s+"
    r"(?P<scope>[A-Za-z][A-Za-z\-\s]*?)\.?"
    r"(?:\s*\(Reference:\s*(?P<reference>[^)]+)\))?\s*$",
    re.IGNORECASE,
)
GENERIC_FALLBACK = re.compile(
    r"\b(?P<strength>must not|may not|must|shall|should|required|"
    r"recommended|prohibited)\b",
    re.IGNORECASE,
)
FREQUENCY_RE = re.compile(
    r"every\s+(\d+)\s*(day|days|month|months|year|years)", re.IGNORECASE
)


def _classify_reference(reference: Optional[str]) -> dict:
    if not reference:
        return {"external_mandate": None, "deprecated_tech": None}
    ref = reference.strip()
    for pat in REGULATION_PATTERNS:
        if re.search(pat, ref, re.IGNORECASE):
            return {"external_mandate": ref, "deprecated_tech": None}
    for pat in DEPRECATED_TECH_PATTERNS:
        if re.search(pat, ref, re.IGNORECASE):
            return {"external_mandate": None, "deprecated_tech": ref}
    return {"external_mandate": None, "deprecated_tech": None, "raw_reference": ref}


def _structured_scope(scope_text: str) -> dict:
    scope_text = (scope_text or "").strip().lower()
    dept = ["all"] if scope_text in ("all users", "all employees", "") else [scope_text]
    return {
        "department": dept,
        "geography": ["global"],
        "system_type": ["all"],
        "raw_scope_text": scope_text or "all users",
    }


def _normalize_topic(raw_topic: str) -> str:
    t = raw_topic.strip().lower()
    return t if t else "other"


def _rule_extract_clause(clause_text: str) -> Optional[dict]:
    
    text = clause_text.strip()

    m = PATTERN_A.match(text) or PATTERN_B.match(text)
    if m:
        gd = m.groupdict()
        strength_word = gd.get("strength", "").lower() if gd.get("strength") else "must"
        strength, action = STRENGTH_TO_ACTION.get(strength_word, ("mandatory", "REQUIRE"))
        ref_info = _classify_reference(gd.get("reference"))
        freq_m = FREQUENCY_RE.search(text)
        return {
            "obligation": f"{_normalize_topic(gd['topic'])}_{action.lower()}",
            "action": action,
            "scope": _structured_scope(gd.get("scope", "all users")),
            "strength": strength,
            "frequency": f"{freq_m.group(1)}_{freq_m.group(2)}" if freq_m else None,
            "topic": _normalize_topic(gd["topic"]),
            "external_mandate": ref_info.get("external_mandate"),
            "deprecated_reference": ref_info.get("deprecated_tech") or ref_info.get("raw_reference"),
            "raw_text": text,
            "extraction_method": "rule_template",
            "extraction_confidence": 1.0,
        }

    gm = GENERIC_FALLBACK.search(text)
    if gm:
        strength_word = gm.group("strength").lower()
        strength, action = STRENGTH_TO_ACTION.get(strength_word, ("mandatory", "REQUIRE"))
        topic_guess = next((kw for kw in TOPIC_KEYWORDS if kw in text.lower()), "other")
        return {
            "obligation": f"{topic_guess}_{action.lower()}",
            "action": action,
            "scope": _structured_scope("all users"),
            "strength": strength,
            "frequency": None,
            "topic": topic_guess,
            "external_mandate": None,
            "deprecated_reference": None,
            "raw_text": text,
            "extraction_method": "rule_fallback",
            "extraction_confidence": 0.55,
        }

    return None


def _spacy_topic_crosscheck(clause_text: str) -> Optional[str]:
    
    try:
        
        import spacy
        if not hasattr(_spacy_topic_crosscheck, "_nlp"):
            _spacy_topic_crosscheck._nlp = spacy.load("en_core_web_sm")
        nlp = _spacy_topic_crosscheck._nlp
        doc = nlp(clause_text)
        chunks = [c.text.lower() for c in doc.noun_chunks]
        for kw in TOPIC_KEYWORDS:
            if any(kw in c for c in chunks):
                return kw
        return None
    except Exception:
        return None


def _llm_extract_clause(clause_text: str, section_id: str, policy_name: str,
                         last_reviewed: str, llm_client) -> Optional[dict]:
    
    prompt = f"""You are extracting formal obligations from an enterprise security/compliance policy clause.

Clause: "{clause_text}"
Section: {section_id}
Policy: {policy_name} (last reviewed: {last_reviewed})

If the clause contains no enforceable obligation (preamble, definition, etc.),
return {{"obligation": null}} .

Return ONLY valid JSON, no markdown fences, no preamble:
{{ 
  "obligation": string | null,
  "action": "REQUIRE" | "PROHIBIT" | "RECOMMEND" | "PERMIT",
  "scope": {{ 
    "department": [string],
    "geography": [string],
    "system_type": [string],
    "raw_scope_text": string
  }} ,
  "strength": "mandatory" | "recommended" | "optional",
  "frequency": string | null,
  "topic": string,
  "external_mandate": string | null,
  "confidence": float
}} """
    raw = llm_client.complete_json(prompt)
    if not raw or raw.get("obligation") is None:
        return None
    raw["raw_text"] = clause_text
    raw["extraction_method"] = "llm_structured"
    raw["extraction_confidence"] = float(raw.get("confidence", 0.7))
    raw["deprecated_reference"] = None
    return raw


def extract_all(clauses_by_policy: list, use_llm_gap_fill: bool = True) -> list:
    llm_client = get_llm_client() if use_llm_gap_fill else None
    obligations = []
    obl_counter = 0

    for policy in clauses_by_policy:
        for clause in policy["clauses"]:
            rule_result = _rule_extract_clause(clause["clause_text"])

            if rule_result is None and llm_client is not None:
                rule_result = _llm_extract_clause(
                    clause["clause_text"], clause["section_id"],
                    policy["policy_name"], policy["last_reviewed"], llm_client
                )

            if rule_result is None:
                continue  

            spacy_topic = _spacy_topic_crosscheck(clause["clause_text"])
            if spacy_topic and spacy_topic != rule_result["topic"]:
                rule_result["topic_crosscheck_mismatch"] = spacy_topic

            obl_counter += 1
            obligation = {
                "id": f"obl_{obl_counter:04d}",
                "policy_file": policy["policy_file"],
                "policy_name": policy["policy_name"],
                "department": policy["department"],
                "section": clause["section_id"],
                "last_reviewed": policy["last_reviewed"],
                "status": policy["status"],
                **rule_result,
            }
            obligations.append(obligation)

    return obligations


def run(save: bool = True) -> list:
    clauses_path = config.OUTPUTS_DIR / "clauses.json"
    if not clauses_path.exists():
        raise FileNotFoundError("Run l0_ingest first (outputs/clauses.json missing).")
    clauses_by_policy = json.loads(clauses_path.read_text(encoding="utf-8"))

    obligations = extract_all(clauses_by_policy)

    if save:
        out_path = config.OUTPUTS_DIR / "obligations.json"
        out_path.write_text(json.dumps(obligations, indent=2), encoding="utf-8")
        rule_n = sum(1 for o in obligations if o["extraction_method"] == "rule_template")
        fb_n = sum(1 for o in obligations if o["extraction_method"] == "rule_fallback")
        llm_n = sum(1 for o in obligations if o["extraction_method"] == "llm_structured")
        print(f"[L1 EXTRACT] {len(obligations)} obligations "
              f"(template={rule_n}, fallback={fb_n}, llm_gap_fill={llm_n}) -> {out_path}")
    return obligations


if __name__ == "__main__":
    run()
