
import os
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[3]          

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT_DIR / ".env")
except ImportError:
    pass 
DATA_DIR = ROOT_DIR / "data"
POLICIES_DIR = DATA_DIR / "policies"
OUTPUTS_DIR = ROOT_DIR / "outputs"
SCHEMAS_DIR = ROOT_DIR / "shared" / "schemas"
SHARED_SCHEMAS_DIR = SCHEMAS_DIR   # alias for A2 compatibility
SAMPLE_DATA_DIR = DATA_DIR          # alias: A2 called it sample_data/, A1 calls it data/

POLICY_METADATA_CSV = DATA_DIR / "policy_metadata.csv"
OBLIGATION_LABELS_CSV = DATA_DIR / "obligation_extracts_labels.csv"
FINDINGS_LABELS_CSV = DATA_DIR / "findings_labels.csv"

OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

#L2 / L3 thresholds
EMBEDDING_CANDIDATE_THRESHOLD = 0.35

#L4 LLM Bench

LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "mock").lower()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
HF_API_TOKEN = os.environ.get("HF_API_TOKEN", "")
HF_MODEL = os.environ.get("HF_MODEL", "Qwen/Qwen2.5-72B-Instruct")

#L5 Trust Reconcile
RANDOM_STATE = 42

# --- A2 Constants ---
TEXT_SIMILARITY_REDUNDANT_THRESHOLD = 0.90
MAX_PAIRS_PER_TOPIC_BUCKET = 20000
RULE_SIGNAL_CLEAR = 1.0
RULE_SIGNAL_ESCALATE = 0.5
RULE_SIGNAL_NONE = 0.0
CONTRADICTORY_ACTION_PAIRS = {
    frozenset({"REQUIRE", "PROHIBIT"}),
}
PERIOD_TOLERANCE_FRACTION = 0.05
CONTENT_OVERLAP_THRESHOLD = 0.12

STUB_TRUST_WEIGHTS = {
    "rule_signal": 0.60,
    "embedding_similarity": 0.25,
    "agreement_bonus": 0.15,
}
TRUST_TIER_HIGH = 0.75
TRUST_TIER_MEDIUM = 0.40

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

STALE_AGE_YEARS_THRESHOLD = 2.0
DEPRECATED_TERMS = [
    "ssl", "ssl 3.0", "ssl3", "tls 1.0", "tls1.0", "wep", "sha-1", "sha1",
    "md5", "des", "3des", "triple des", "windows xp", "windows 2000",
    "flash", "telnet", "ftp (unencrypted)", "rc4", "pptp",
]
SUPERSESSION_LANGUAGE = ["supersedes", "supersede", "replaces", "replaced by", "deprecated by"]

KEYSTONE_TOP_PCT = 0.20
FINDING_PENALTY = {
    ("CONFLICT", "HIGH"): 15,
    ("CONFLICT", "MEDIUM"): 7,
    ("REDUNDANT", None): 5,
}
STALE_PENALTY = 5
DEFAULT_ALPHA = 1.0
SENSITIVITY_ALPHAS = [0.5, 1.0, 1.5, 2.0]

