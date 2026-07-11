"""
L3 FILTER (Person A2)

Input : obligations.json (A1's L0-L2 output; obligation.schema.json)
Output: candidate_pairs.json

Rule: two obligations become a candidate pair if they share a topic bucket
OR their embedding cosine similarity clears a threshold. This is what turns
an O(n^2) obligation set into a handful of pairs worth sending to L4 --
per the architecture doc, "O(n^2) becomes a handful of pairs."
"""
from collections import defaultdict
from itertools import combinations

import numpy as np

from backend.engine import config


def _pair_id(id1, id2):
    a, b = sorted([id1, id2])
    return f"PAIR-{a}-{b}"


def generate_candidate_pairs(obligations, similarity_threshold=None, max_per_bucket=None):
    """
    obligations: list of dicts matching obligation.schema.json (must include
                 'id', 'topic', 'embedding', 'doc_id').
    Returns: list of candidate pair dicts.
    """
    similarity_threshold = similarity_threshold or config.EMBEDDING_SIMILARITY_THRESHOLD
    max_per_bucket = max_per_bucket or config.MAX_PAIRS_PER_TOPIC_BUCKET

    ids = [o["id"] for o in obligations]
    id_to_idx = {oid: i for i, oid in enumerate(ids)}
    embeddings = np.array([o["embedding"] for o in obligations], dtype=np.float32)
    # embeddings are already L2-normalized by the embedding step -> cosine == dot
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    embeddings = embeddings / norms

    pairs = {}  # pair_id -> record, dedup across the two generation strategies

    # ---- strategy 1: same topic bucket -------------------------------
    by_topic = defaultdict(list)
    for o in obligations:
        by_topic[o["topic"]].append(o["id"])

    for topic, member_ids in by_topic.items():
        if topic == "other":
            continue  # "other" is a catch-all bucket, not a meaningful topic match
        if len(member_ids) < 2:
            continue
        combo_iter = combinations(member_ids, 2)
        count = 0
        for id1, id2 in combo_iter:
            if count >= max_per_bucket:
                break
            # skip trivial same-document pairs (a clause can't conflict with itself
            # in the same doc the way cross-policy conflicts matter for this system)
            if obligations[id_to_idx[id1]]["doc_id"] == obligations[id_to_idx[id2]]["doc_id"]:
                continue
            i1, i2 = id_to_idx[id1], id_to_idx[id2]
            sim = float(np.dot(embeddings[i1], embeddings[i2]))
            pid = _pair_id(id1, id2)
            pairs[pid] = {
                "pair_id": pid,
                "obligation_id_1": id1,
                "obligation_id_2": id2,
                "same_topic_bucket": True,
                "topic": topic,
                "embedding_similarity": round(sim, 4),
                "reason": "same_topic",
            }
            count += 1

    # ---- strategy 2: embedding similarity above threshold -------------
    # Vectorized cosine similarity matrix -- fine at this obligation count
    # (n ~= 1.5k -> n^2 ~= 2.5M float ops, well under a second).
    sims = embeddings @ embeddings.T
    n = len(obligations)
    doc_ids = [o["doc_id"] for o in obligations]
    iu = np.triu_indices(n, k=1)
    for i, j in zip(*iu):
        if doc_ids[i] == doc_ids[j]:
            continue
        sim = float(sims[i, j])
        if sim < similarity_threshold:
            continue
        id1, id2 = ids[i], ids[j]
        pid = _pair_id(id1, id2)
        if pid in pairs:
            pairs[pid]["reason"] = "both"
            pairs[pid]["embedding_similarity"] = round(sim, 4)
        else:
            pairs[pid] = {
                "pair_id": pid,
                "obligation_id_1": id1,
                "obligation_id_2": id2,
                "same_topic_bucket": False,
                "topic": None,
                "embedding_similarity": round(sim, 4),
                "reason": "embedding_similarity",
            }

    return list(pairs.values())
