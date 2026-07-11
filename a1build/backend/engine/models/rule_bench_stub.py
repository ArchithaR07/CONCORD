import json

from . import config


def _rule_verdict(a: dict, b: dict) -> dict:
    same_topic = a["topic"] == b["topic"]
    same_scope = a["scope"]["raw_scope_text"] == b["scope"]["raw_scope_text"]
    action_a, action_b = a["action"], b["action"]

    if not same_topic:
        return {"verdict": "UNRELATED", "rule_signal": 0.0, "basis": "different_topic"}

    if same_scope and {action_a, action_b} == {"REQUIRE", "PROHIBIT"}:
        return {"verdict": "CONFLICT", "rule_signal": 1.0, "basis": "opposite_action_same_scope"}

    if same_scope and action_a == action_b and a["strength"] == b["strength"]:
        return {"verdict": "REDUNDANT", "rule_signal": 1.0, "basis": "identical_action_strength_scope"}

    if not same_scope:
        return {"verdict": "ESCALATE", "rule_signal": 0.5, "basis": "same_topic_different_scope"}

    return {"verdict": "ESCALATE", "rule_signal": 0.5, "basis": "same_topic_ambiguous_params"}


def run_rule_bench(obligations_by_id: dict, candidate_pairs: list, save: bool = True) -> list:
    verdicts = []
    for pair in candidate_pairs:
        a = obligations_by_id[pair["obligation_a_id"]]
        b = obligations_by_id[pair["obligation_b_id"]]
        v = _rule_verdict(a, b)
        v["obligation_a_id"] = a["id"]
        v["obligation_b_id"] = b["id"]
        verdicts.append(v)

    if save:
        out_path = config.OUTPUTS_DIR / "rule_verdicts.json"
        out_path.write_text(json.dumps(verdicts, indent=2), encoding="utf-8")
        print(f"[RULE BENCH STUB] {len(verdicts)} verdicts -> {out_path}")
    return verdicts


if __name__ == "__main__":
    obl_path = config.OUTPUTS_DIR / "obligations_embedded.json"
    pairs_path = config.OUTPUTS_DIR / "candidate_pairs.json"
    obligations = json.loads(obl_path.read_text(encoding="utf-8"))
    obligations_by_id = {o["id"]: o for o in obligations}
    candidate_pairs = json.loads(pairs_path.read_text(encoding="utf-8"))
    run_rule_bench(obligations_by_id, candidate_pairs)
