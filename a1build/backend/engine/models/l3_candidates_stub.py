import json
from itertools import combinations

from . import config
from .l2_lens import pairwise_cosine_matrix


def generate_candidate_pairs(obligations: list,
                              similarity_threshold: float = config.EMBEDDING_CANDIDATE_THRESHOLD) -> list:
    sim_matrix = pairwise_cosine_matrix(obligations)
    
    # Group by topic bucket
    from collections import defaultdict
    topic_buckets = defaultdict(list)
    for i, obl in enumerate(obligations):
        topic_buckets[obl["topic"]].append(i)
        
    pairs = []
    
    # Only evaluate pairs within the same topic bucket
    for topic, indices in topic_buckets.items():
        n_bucket = len(indices)
        for i_idx in range(n_bucket):
            for j_idx in range(i_idx + 1, n_bucket):
                i = indices[i_idx]
                j = indices[j_idx]
                
                a, b = obligations[i], obligations[j]
                if a["policy_file"] == b["policy_file"]:
                    continue  

                sim = float(sim_matrix[i, j])

                if sim >= similarity_threshold:
                    pairs.append({
                        "obligation_a_id": a["id"],
                        "obligation_b_id": b["id"],
                        "policy_a": a["policy_file"],
                        "policy_b": b["policy_file"],
                        "topic": topic,
                        "same_topic": True,
                        "embedding_similarity": round(sim, 4),
                    })

    return pairs


def run(save: bool = True) -> list:
    obl_path = config.OUTPUTS_DIR / "obligations_embedded.json"
    if not obl_path.exists():
        raise FileNotFoundError("Run l2_lens first (outputs/obligations_embedded.json missing).")
    obligations = json.loads(obl_path.read_text(encoding="utf-8"))

    pairs = generate_candidate_pairs(obligations)

    if save:
        out_path = config.OUTPUTS_DIR / "candidate_pairs.json"
        out_path.write_text(json.dumps(pairs, indent=2), encoding="utf-8")
        print(f"[L3 STUB] {len(pairs)} candidate pairs from "
              f"{len(obligations)} obligations -> {out_path}")
    return pairs


if __name__ == "__main__":
    run()
