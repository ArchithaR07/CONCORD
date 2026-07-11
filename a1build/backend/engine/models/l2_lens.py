
import json

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity

from . import config

EMBEDDING_DIM = 64  


def _try_load_sentence_transformer():
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        return model
    except Exception as e:
        print(f"[L2 LENS] sentence-transformers unavailable ({type(e).__name__}: {e}); "
              f"falling back to TF-IDF/SVD embeddings.")
        return None


def _embed_with_sentence_transformer(model, texts: list) -> np.ndarray:
    return np.array(model.encode(texts, show_progress_bar=False))


def _embed_with_tfidf_svd(texts: list) -> np.ndarray:
    vectorizer = TfidfVectorizer(stop_words="english", max_features=2000)
    tfidf = vectorizer.fit_transform(texts)
    n_components = min(EMBEDDING_DIM, tfidf.shape[1] - 1, tfidf.shape[0] - 1)
    n_components = max(n_components, 2)
    svd = TruncatedSVD(n_components=n_components, random_state=config.RANDOM_STATE)
    dense = svd.fit_transform(tfidf)
    norms = np.linalg.norm(dense, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return dense / norms


def _tfidf_topic_keywords(texts: list, top_k: int = 3) -> list:
    vectorizer = TfidfVectorizer(stop_words="english", max_features=500)
    tfidf = vectorizer.fit_transform(texts)
    terms = np.array(vectorizer.get_feature_names_out())
    keywords_per_doc = []
    for row in tfidf:
        row = row.toarray().flatten()
        top_idx = row.argsort()[::-1][:top_k]
        top_idx = [i for i in top_idx if row[i] > 0]
        keywords_per_doc.append(terms[top_idx].tolist())
    return keywords_per_doc


def add_lens(obligations: list) -> list:
    if not obligations:
        return obligations

    texts = [o["raw_text"] for o in obligations]

    st_model = _try_load_sentence_transformer()
    if st_model is not None:
        embeddings = _embed_with_sentence_transformer(st_model, texts)
        backend = "sentence-transformers/all-MiniLM-L6-v2"
    else:
        embeddings = _embed_with_tfidf_svd(texts)
        backend = "tfidf+svd"

    keywords = _tfidf_topic_keywords(texts)

    for o, emb, kw in zip(obligations, embeddings, keywords):
        o["embedding"] = emb.tolist()
        o["embedding_backend"] = backend
        o["tfidf_keywords"] = kw

    return obligations


def pairwise_cosine_matrix(obligations: list) -> np.ndarray:
    embs = np.array([o["embedding"] for o in obligations])
    return cosine_similarity(embs)


def run(save: bool = True) -> list:
    obl_path = config.OUTPUTS_DIR / "obligations.json"
    if not obl_path.exists():
        raise FileNotFoundError("Run l1_extract first (outputs/obligations.json missing).")
    obligations = json.loads(obl_path.read_text(encoding="utf-8"))

    obligations = add_lens(obligations)

    if save:
        out_path = config.OUTPUTS_DIR / "obligations_embedded.json"
        out_path.write_text(json.dumps(obligations, indent=2), encoding="utf-8")
        backend = obligations[0]["embedding_backend"] if obligations else "n/a"
        print(f"[L2 LENS] {len(obligations)} obligations embedded "
              f"(backend={backend}, dim={len(obligations[0]['embedding']) if obligations else 0}) "
              f"-> {out_path}")
    return obligations


if __name__ == "__main__":
    run()
