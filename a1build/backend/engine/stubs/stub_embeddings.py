"""
STUB for A1's L2 LENS embeddings.

The real pipeline uses sentence-transformers (all-MiniLM-L6-v2) per the
architecture doc. A2 doesn't own that layer and shouldn't wait idle on it,
so this produces a schema-compatible dense vector per obligation using
TF-IDF + truncated SVD (a "poor man's embedding") purely so L3 FILTER,
L4 RULE BENCH etc. are runnable and testable end-to-end today.

SWAP THIS OUT the moment A1 ships real embeddings in obligations.json --
nothing downstream needs to change, because L3 only ever reads
`obligation["embedding"]` and doesn't care how it was produced.
"""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import normalize


def compute_stub_embeddings(texts, n_components=100, random_state=42):
    """Returns an (n_texts, n_components) L2-normalized dense array."""
    n_components = min(n_components, max(2, len(texts) - 1))
    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        stop_words="english",
        min_df=1,
    )
    tfidf = vectorizer.fit_transform(texts)
    svd = TruncatedSVD(n_components=n_components, random_state=random_state)
    dense = svd.fit_transform(tfidf)
    dense = normalize(dense)  # so cosine similarity == dot product
    return dense.astype(np.float32)


def cosine_sim_matrix(embeddings):
    """embeddings already L2-normalized -> cosine sim is just the gram matrix."""
    return embeddings @ embeddings.T
