
import re

DEPARTMENT_KEYWORDS = {
    "hr": ["human resource", "employee internet", "acceptable use", "ethics policy", "pandemic response"],
    "it_security": [
        "encryption", "password", "access control", "cryptography", "incident",
        "vulnerability", "malware", "endpoint", "server", "network", "firewall",
        "vpn", "remote access", "wireless", "dial in", "dmz", "lab security",
        "logging", "audit", "authentication", "identity",
    ],
    "compliance_legal": ["compliance", "legal", "digital signature", "risk assessment", "acquisition assessment"],
    "operations": ["datacenter", "disaster recovery", "business continuity", "operations security", "asset management"],
    "vendor_procurement": ["vendor", "supplier", "acquisition"],
}

SYSTEM_TYPE_KEYWORDS = {
    "cloud": ["cloud"],
    "network": ["network", "router", "switch", "firewall", "dmz", "wireless", "vpn", "remote access", "dial in", "extranet"],
    "endpoint": ["workstation", "laptop", "mobile device", "endpoint", "removable media", "usb"],
    "server": ["server"],
    "email": ["email", "e-mail"],
    "database": ["database"],
    "web": ["web application", "website"],
    "physical": ["physical", "data center", "datacenter", "facility"],
}

GEOGRAPHY_KEYWORDS = {
    "eu": ["gdpr", "european union", "eu "],
    "us": ["hipaa", "sox", "ccpa", "united states"],
}

EXTERNAL_MANDATE_PATTERNS = [
    (r"\bGDPR\b[^.]*", "GDPR"),
    (r"\bHIPAA\b[^.]*", "HIPAA"),
    (r"\bPCI[-\s]?DSS\b[^.]*", "PCI-DSS"),
    (r"\bSOX\b[^.]*", "SOX"),
    (r"\bNIST\s?(?:800-\d+|SP\s?800-\d+)?[^.]*", "NIST"),
    (r"\bISO[/\s]?27001[^.]*", "ISO 27001"),
]


def _match_any(haystack, keyword_map):
    hits = []
    low = haystack.lower()
    for label, keywords in keyword_map.items():
        if any(kw in low for kw in keywords):
            hits.append(label)
    return hits


def extract_stub_scope(policy_name, obligation_text):
    basis = f"{policy_name} {obligation_text}"
    dept = _match_any(basis, DEPARTMENT_KEYWORDS) or ["all"]
    sysT = _match_any(basis, SYSTEM_TYPE_KEYWORDS) or ["all"]
    geo = _match_any(basis, GEOGRAPHY_KEYWORDS) or ["global"]
    return {
        "department": sorted(set(dept)),
        "geography": sorted(set(geo)),
        "system_type": sorted(set(sysT)),
        "raw_scope_text": policy_name,
    }


def extract_external_mandate(obligation_text):
    for pattern, label in EXTERNAL_MANDATE_PATTERNS:
        m = re.search(pattern, obligation_text, flags=re.IGNORECASE)
        if m:
            return label
    return None


def scope_relation(scope_a, scope_b):
    
    def _norm(vals):
        return set(v for v in vals if v not in ("all", "global")) 

    dims_a = {
        "department": _norm(scope_a["department"]),
        "geography": _norm(scope_a["geography"]),
        "system_type": _norm(scope_a["system_type"]),
    }
    dims_b = {
        "department": _norm(scope_b["department"]),
        "geography": _norm(scope_b["geography"]),
        "system_type": _norm(scope_b["system_type"]),
    }

    def _dim_relation(a, b):
        
        if not a and not b:
            return "equal"
        if not a:  
            return "b_narrower"
        if not b:
            return "a_narrower"
        if a == b:
            return "equal"
        if a.issubset(b):
            return "a_narrower"
        if b.issubset(a):
            return "b_narrower"
        if a & b:
            return "overlap"
        return "disjoint"

    rels = [_dim_relation(dims_a[d], dims_b[d]) for d in ("department", "geography", "system_type")]

    if "disjoint" in rels:
        return "disjoint"
    if all(r == "equal" for r in rels):
        return "equal"
    if all(r in ("equal", "a_narrower") for r in rels) and "a_narrower" in rels:
        return "subset_1_in_2"  
    if all(r in ("equal", "b_narrower") for r in rels) and "b_narrower" in rels:
        return "subset_2_in_1"  
    return "overlap"
