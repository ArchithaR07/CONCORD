
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import normalize


def compute_stub_embeddings(texts, n_components=100, random_state=42):
    
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
    dense = normalize(dense)  
    return dense.astype(np.float32)


def cosine_sim_matrix(embeddings):
    
    return embeddings @ embeddings.T
