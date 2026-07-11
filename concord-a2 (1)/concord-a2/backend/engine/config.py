"""
Central config for the A2 pipeline (L3-L10).

Every threshold a judge might ask "why that number?" about lives here,
in one place, instead of buried in individual modules.
"""

from pathlib import Path

# ---------------------------------------------------------------- paths ----
ROOT_DIR = Path(__file__).resolve().parents[2]
SAMPLE_DATA_DIR = ROOT_DIR / "sample_data"
SHARED_SCHEMAS_DIR = ROOT_DIR / "shared" / "schemas"
OUTPUTS_DIR = ROOT_DIR / "outputs"

# ------------------------------------------------------- L3 FILTER --------
# Two independent ways a pair becomes a "candidate": same topic bucket,
# OR embedding cosine similarity above this threshold. Mirrors architecture
# doc L3: "same topic bucket OR embedding similarity above threshold".
EMBEDDING_SIMILARITY_THRESHOLD = 0.55

# Above this, L4 treats it as near-duplicate text without needing a topic
# match at all (catches boilerplate repeated verbatim across many docs,
# same pattern the provided redundancy_pairs_detail.csv was built from).
TEXT_SIMILARITY_REDUNDANT_THRESHOLD = 0.90

# Safety cap: if a topic bucket is enormous (e.g. "other"), don't emit
# a full O(n^2) blowup of low-value pairs from it alone.
MAX_PAIRS_PER_TOPIC_BUCKET = 20000

# ------------------------------------------------------- L4 RULE BENCH ----
# "Clear" rule verdict vs. "escalate" (ambiguous, hand to LLM Bench later).
RULE_SIGNAL_CLEAR = 1.0
RULE_SIGNAL_ESCALATE = 0.5
RULE_SIGNAL_NONE = 0.0

# Contradictory action pairs on the same topic + overlapping scope.
CONTRADICTORY_ACTION_PAIRS = {
    frozenset({"REQUIRE", "PROHIBIT"}),
}

# When two mandated periods differ by less than this fraction, treat as
# "effectively the same" rather than a conflict (avoids false positives
# from rounding, e.g. "30 days" vs "1 month").
PERIOD_TOLERANCE_FRACTION = 0.05

# A same-topic-bucket match alone is too coarse to assert CONTRADICTORY
# ACTION or DIFFERING PERIOD -- the stub topic tagger (backend/engine/
# stubs/stub_topic.py) buckets by coarse keyword, so e.g. two unrelated
# "physical_security" clauses can share a bucket without being about the
# same underlying rule. Require a minimum lexical (Jaccard token) overlap
# on top of same-topic before firing a CONFLICT rule, so the two clauses
# are actually talking about comparable subject matter, not just sharing
# a coarse label. Below this, the pair is ESCALATEd instead of asserted
# either way -- exactly the ambiguous case the (future) LLM Bench exists
# to resolve. Value chosen empirically against this dataset: it keeps the
# genuine incident-reporting-window conflicts (24h vs 48h, ~0.2-0.35
# overlap) while dropping same-bucket-different-subject false positives
# (~0.0-0.08 overlap). Revisit once real labels are available.
CONTENT_OVERLAP_THRESHOLD = 0.12

# ------------------------------------------------- L5 STUB (trust score) --
# NOTE: this is a stand-in for A1's real logistic-regression trust score
# (architecture doc \u00a74.1). It exists purely so A2's L6-L10 are runnable
# and testable before A1 ships. Swap out backend/engine/stubs/stub_trust.py
# for A1's real L5 output the moment it exists -- see README.
STUB_TRUST_WEIGHTS = {
    "rule_signal": 0.60,
    "embedding_similarity": 0.25,
    "agreement_bonus": 0.15,
}
TRUST_TIER_HIGH = 0.75
TRUST_TIER_MEDIUM = 0.40

# --------------------------------------------------- L6 PRECEDENCE --------
# Step 4 (authority) tiebreaker: higher number wins. Configurable per the
# architecture doc ("policy owner's seniority in a configurable weighting").
AUTHORITY_RANK = {
    "legal": 5,
    "compliance": 5,
    "information security incident management": 4,
    "information security policies": 4,
    "organization of information security": 4,
    "security incident response policy": 4,
    "cryptography": 3,
    "access control": 3,
    "operations security": 3,
    "default": 1,
}

# ------------------------------------------------------------- L7 DECAY ---
# A document/obligation with no findable review activity for longer than
# this is flagged STALE. Matches the "age_years_as_of_..." framing in the
# provided staleness.csv so A2's own recompute is directly comparable.
STALE_AGE_YEARS_THRESHOLD = 2.0

DEPRECATED_TERMS = [
    "ssl", "ssl 3.0", "ssl3", "tls 1.0", "tls1.0", "wep", "sha-1", "sha1",
    "md5", "des", "3des", "triple des", "windows xp", "windows 2000",
    "flash", "telnet", "ftp (unencrypted)", "rc4", "pptp",
]

SUPERSESSION_LANGUAGE = ["supersedes", "supersede", "replaces", "replaced by", "deprecated by"]

# ----------------------------------------------------- L9 CENTRALITY ------
KEYSTONE_TOP_PCT = 0.20  # top 20% of nonzero keystone_score => is_keystone

# --------------------------------------------------------- L10 SCORE ------
FINDING_PENALTY = {
    ("CONFLICT", "HIGH"): 15,
    ("CONFLICT", "MEDIUM"): 7,
    ("REDUNDANT", None): 5,
}
STALE_PENALTY = 5
DEFAULT_ALPHA = 1.0  # keystone_multiplier sensitivity, UI-exposed slider
SENSITIVITY_ALPHAS = [0.5, 1.0, 1.5, 2.0]
