import json
import re
import time
from typing import Optional

from . import config

ARBITRATION_PROMPT_TEMPLATE = """You are adjudicating two extracted policy obligations.

Obligation A: {obligation_a_json}
Obligation B: {obligation_b_json}

Rules:
- CONFLICT only if satisfying one would violate the other AND no scope
  distinction resolves it. If in doubt, choose COMPLEMENTARY and explain
  the ambiguity instead.
- REDUNDANT if both require the same action, same scope, same threshold.
- COMPLEMENTARY if same topic but different scope, or one is a specific
  exception to the other's general rule.
- UNRELATED if they don't materially interact.

Return ONLY valid JSON:
{{
  "verdict": "CONFLICT" | "REDUNDANT" | "COMPLEMENTARY" | "UNRELATED",
  "confidence": float,
  "scope_analysis": string,
  "explanation": string,
  "recommendation": string
}}"""


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    return text
# LLM clients
class MockLLMClient:
    def complete_json(self, prompt: str) -> Optional[dict]:
        if "Obligation A:" in prompt and "Obligation B:" in prompt:
            return self._mock_arbitration(prompt)
        return self._mock_extraction(prompt)

    def _mock_arbitration(self, prompt: str) -> dict:
        m_a = re.search(r"Obligation A:\s*(\{.*?\})\s*\n\nObligation B:", prompt, re.DOTALL)
        m_b = re.search(r"Obligation B:\s*(\{.*?\})\s*\n\nRules:", prompt, re.DOTALL)
        try:
            a = json.loads(m_a.group(1)) if m_a else {}
            b = json.loads(m_b.group(1)) if m_b else {}
        except json.JSONDecodeError:
            a, b = {}, {}

        action_a, action_b = a.get("action"), b.get("action")
        scope_a = a.get("scope", {}).get("raw_scope_text", "")
        scope_b = b.get("scope", {}).get("raw_scope_text", "")
        same_scope = scope_a == scope_b

        if {action_a, action_b} == {"REQUIRE", "PROHIBIT"} and same_scope:
            return {
                "verdict": "CONFLICT", "confidence": 0.82,
                "scope_analysis": f"Both obligations apply to '{scope_a}' with no distinguishing scope.",
                "explanation": "One obligation requires the action while the other prohibits it, for the same scope.",
                "recommendation": "Escalate to policy owners for harmonization.",
            }
        if action_a == action_b and a.get("strength") == b.get("strength") and same_scope:
            return {
                "verdict": "REDUNDANT", "confidence": 0.7,
                "scope_analysis": f"Identical action/strength/scope ('{scope_a}').",
                "explanation": "Both obligations impose the same requirement over the same scope.",
                "recommendation": "Consolidate into a single authoritative clause.",
            }
        if not same_scope:
            return {
                "verdict": "COMPLEMENTARY", "confidence": 0.6,
                "scope_analysis": f"Different scopes ('{scope_a}' vs '{scope_b}') on the same topic.",
                "explanation": "Same topic, but the two obligations govern different populations.",
                "recommendation": "Cross-reference so employees know which clause applies to them.",
            }
        return {
            "verdict": "UNRELATED", "confidence": 0.55,
            "scope_analysis": "No material interaction detected.",
            "explanation": "The two obligations do not constrain the same behavior.",
            "recommendation": "No action needed.",
        }

    def _mock_extraction(self, prompt: str) -> dict:
        return {"obligation": None}


class GeminiLLMClient:
    """Real Gemini calls. Default model: gemini-1.5-flash (1,500 req/day free).
    Rate-limited to 0.5s between calls to stay under the 60 RPM cap.
    Once the daily quota is hit, fails instantly for all remaining calls
    so the cascade falls through to Groq/mock without waiting."""

    _quota_exhausted = False

    def __init__(self):
        import google.generativeai as genai
        genai.configure(api_key=config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(config.GEMINI_MODEL)
        self._last_call = 0.0

    def complete_json(self, prompt: str) -> Optional[dict]:
        if GeminiLLMClient._quota_exhausted:
            raise RuntimeError("Gemini quota exhausted — skipping.")
        elapsed = time.time() - self._last_call
        if elapsed < 0.5:
            time.sleep(0.5 - elapsed)
        self._last_call = time.time()
        try:
            resp = self.model.generate_content(prompt)
            return json.loads(_strip_code_fences(resp.text))
        except Exception as exc:
            exc_str = str(exc)
            if "429" in exc_str or "ResourceExhausted" in exc_str or "quota" in exc_str.lower():
                GeminiLLMClient._quota_exhausted = True
                print("[GEMINI] Daily quota exhausted — will skip Gemini for remaining pairs.")
            raise


class GroqLLMClient:
    _quota_exhausted = False

    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(api_key=config.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

    def complete_json(self, prompt: str) -> Optional[dict]:
        if GroqLLMClient._quota_exhausted:
            raise RuntimeError("Groq quota exhausted or invalid key — skipping.")
        try:
            resp = self.client.chat.completions.create(
                model=config.GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )
            return json.loads(_strip_code_fences(resp.choices[0].message.content))
        except Exception as exc:
            if "rate limit" in str(exc).lower() or "authentication" in str(exc).lower():
                GroqLLMClient._quota_exhausted = True
                print(f"[GROQ] Error: {exc} — skipping Groq for remaining pairs.")
            raise


class HuggingFaceLLMClient:
    _quota_exhausted = False

    def __init__(self):
        from huggingface_hub import InferenceClient
        token = config.HF_API_TOKEN.strip() if config.HF_API_TOKEN else None
        self.client = InferenceClient(model=config.HF_MODEL, token=token or None)

    def complete_json(self, prompt: str) -> Optional[dict]:
        if HuggingFaceLLMClient._quota_exhausted:
            raise RuntimeError("HuggingFace quota exhausted or invalid token — skipping.")
        try:
            resp = self.client.text_generation(
                prompt,
                max_new_tokens=500,
                temperature=0.01,
                return_full_text=False,
            )
            return json.loads(_strip_code_fences(resp))
        except Exception as exc:  # noqa: BLE001
            exc_str = str(exc).lower()
            if isinstance(exc, ValueError) or "rate" in exc_str or "unauthorized" in exc_str or "token" in exc_str or "support" in exc_str:
                HuggingFaceLLMClient._quota_exhausted = True
                print(f"[HF] Permanent error: {exc} — skipping HF for remaining pairs.")
            raise


class CascadeLLMClient:
    def __init__(self):
        self._chain: list = []
        if config.HF_API_TOKEN:
            try:
                self._chain.append(("huggingface", HuggingFaceLLMClient()))
            except Exception as exc: 
                print(f"[CASCADE] HuggingFace init failed ({exc}) — skipping.")
        if config.GROQ_API_KEY:
            try:
                self._chain.append(("groq", GroqLLMClient()))
            except Exception as exc:
                print(f"[CASCADE] Groq init failed ({exc}) — skipping.")
        if config.GEMINI_API_KEY:
            try:
                self._chain.append(("gemini", GeminiLLMClient()))
            except Exception as exc:
                print(f"[CASCADE] Gemini init failed ({exc}) — skipping.")
        self._chain.append(("mock", MockLLMClient()))
        names = " -> ".join(name for name, _ in self._chain)
        print(f"[CASCADE] Provider chain: {names}")

    def complete_json(self, prompt: str) -> Optional[dict]:
        for name, client in self._chain:
            try:
                result = client.complete_json(prompt)
                if result is not None:
                    return result
                print(f"[CASCADE] {name} returned None — trying next provider.")
            except Exception as exc:
                if not getattr(client.__class__, '_quota_exhausted', False):
                    print(f"[CASCADE] {name} failed ({type(exc).__name__}: {exc}) — trying next.")
        return None


def get_llm_client():
    provider = config.LLM_PROVIDER
    if provider == "cascade":
        return CascadeLLMClient()
    if provider == "gemini" and config.GEMINI_API_KEY:
        return GeminiLLMClient()
    if provider == "groq" and config.GROQ_API_KEY:
        return GroqLLMClient()
    if provider == "huggingface" and config.HF_API_TOKEN:
        return HuggingFaceLLMClient()
    if provider not in ("mock",):
        print(f"[LLM] LLM_PROVIDER={provider} but no API key set — falling back to mock.")
    return MockLLMClient()
#L4 pair classification
def classify_pair(obligation_a: dict, obligation_b: dict, llm_client=None) -> dict:
    llm_client = llm_client or get_llm_client()
    prompt = ARBITRATION_PROMPT_TEMPLATE.format(
        obligation_a_json=json.dumps(_slim(obligation_a)),
        obligation_b_json=json.dumps(_slim(obligation_b)),
    )
    result = llm_client.complete_json(prompt)
    if result is None:
        result = {
            "verdict": "UNRELATED", "confidence": 0.0,
            "scope_analysis": "LLM call failed or returned unparseable output.",
            "explanation": "No verdict available.", "recommendation": "Manual review.",
        }
    result["obligation_a_id"] = obligation_a["id"]
    result["obligation_b_id"] = obligation_b["id"]
    return result


def _slim(obligation: dict) -> dict:
    return {
        "obligation": obligation.get("obligation"),
        "action": obligation.get("action"),
        "scope": obligation.get("scope"),
        "strength": obligation.get("strength"),
        "topic": obligation.get("topic"),
        "policy_file": obligation.get("policy_file"),
        "raw_text": obligation.get("raw_text"),
    }


def run_on_candidate_pairs(obligations_by_id: dict, candidate_pairs: list, save: bool = True) -> list:
    llm_client = get_llm_client()
    verdicts = []
    for pair in candidate_pairs:
        a = obligations_by_id[pair["obligation_a_id"]]
        b = obligations_by_id[pair["obligation_b_id"]]
        verdicts.append(classify_pair(a, b, llm_client))

    if save:
        out_path = config.OUTPUTS_DIR / "llm_verdicts.json"
        out_path.write_text(json.dumps(verdicts, indent=2), encoding="utf-8")
        print(f"[L4 LLM BENCH] {len(verdicts)} pairs classified "
              f"(provider={config.LLM_PROVIDER}) -> {out_path}")
    return verdicts


if __name__ == "__main__":
    import json as _json
    obl_path = config.OUTPUTS_DIR / "obligations_embedded.json"
    pairs_path = config.OUTPUTS_DIR / "candidate_pairs.json"
    if not obl_path.exists() or not pairs_path.exists():
        raise FileNotFoundError("Run l2_lens and the candidate-pair generator first.")
    obligations = _json.loads(obl_path.read_text(encoding="utf-8"))
    obligations_by_id = {o["id"]: o for o in obligations}
    candidate_pairs = _json.loads(pairs_path.read_text(encoding="utf-8"))
    run_on_candidate_pairs(obligations_by_id, candidate_pairs)
