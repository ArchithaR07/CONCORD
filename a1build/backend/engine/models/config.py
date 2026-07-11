
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
