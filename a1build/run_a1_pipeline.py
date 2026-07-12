import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from backend.engine.models import (  
    l0_ingest, l1_extract, l2_lens,
    l3_candidates_stub, rule_bench_stub, l4_llm_bench,
    l5_trust_reconcile, config,
)


def main():
    t0 = time.time()
    print("=" * 70)
    print("CONCORD — Person A1 pipeline (MODELS & SIGNALS)")
    print("=" * 70)

    print("\n--- L0 INGEST ---")
    l0_ingest.run()

    print("\n--- L1 EXTRACT ---")
    l1_extract.run()

    print("\n--- L2 LENS ---")
    l2_lens.run()

    print("\n--- L3 FILTER (stub — replace with A2's real output when ready) ---")
    l3_candidates_stub.run()

    print("\n--- RULE BENCH (stub — replace with A2's real output when ready) ---")
    import json
    obligations = json.loads((config.OUTPUTS_DIR / "obligations_embedded.json").read_text())
    obligations_by_id = {o["id"]: o for o in obligations}
    candidate_pairs = json.loads((config.OUTPUTS_DIR / "candidate_pairs.json").read_text())
    rule_bench_stub.run_rule_bench(obligations_by_id, candidate_pairs)

    print("\n--- L4 LLM BENCH ---")
    l4_llm_bench.run_on_candidate_pairs(obligations_by_id, candidate_pairs)

    print("\n--- L5 TRUST RECONCILE ---")
    l5_trust_reconcile.run()

    print("\n" + "=" * 70)
    print(f"Done in {time.time() - t0:.1f}s. Outputs in {config.OUTPUTS_DIR}/")
    print("=" * 70)


if __name__ == "__main__":
    main()
