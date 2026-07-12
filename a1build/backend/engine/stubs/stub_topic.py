"""
STUB for A1's L2 LENS topic tagging.

The dataset's own `topic_tags` column is only populated for ~6% of rows
(98/1585) -- everywhere else this keyword fallback assigns a bucket so
L3 FILTER's "same topic bucket" rule has something to group on. Replace
with A1's real TF-IDF/embedding-cluster topic tagging when it ships.
"""
TOPIC_KEYWORDS = {
    "password": ["password"],
    "encryption": ["encrypt", "cryptograph", "key rotation", "cipher"],
    "access_control": ["access control", "authoriz", "least privilege", "authentication", "credential"],
    "mfa": ["multi-factor", "multi factor", "mfa", "two-factor", "2fa"],
    "data_retention": ["retention", "archiv", "dispos", "destroy"],
    "logging": ["log ", "logging", "audit trail", "log review"],
    "network": ["network", "firewall", "router", "switch", "dmz", "vpn", "wireless", "remote access", "dial in", "extranet"],
    "incident_response": ["incident", "breach", "notify", "reporting window"],
    "disaster_recovery": ["disaster recovery", "business continuity", "backup"],
    "physical_security": ["physical", "data center", "datacenter", "facility", "badge"],
    "vendor_management": ["vendor", "supplier", "third part", "acquisition assessment"],
    "training": ["training", "awareness", "onboarding"],
    "endpoint": ["workstation", "laptop", "mobile device", "removable media", "endpoint"],
    "email": ["email", "e-mail"],
    "disciplinary": ["disciplinary", "termination of employment", "violat"],
}


def assign_topic(obligation_text, topic_tags_field=None):
    if topic_tags_field and isinstance(topic_tags_field, str) and topic_tags_field.strip():
        # dataset sometimes has multiple tags separated by ';' -- take the first
        return topic_tags_field.split(";")[0].strip()
    low = obligation_text.lower()
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(kw in low for kw in keywords):
            return topic
    return "other"
