from functions import get_text, preprocess_text
from sklearn.feature_extraction.text import TfidfVectorizer

def prepare_tfidf_vectorizer(corpus_file, stopwords=[]):
    corpus = get_text(corpus_file).splitlines()
    tf_idf = TfidfVectorizer(ngram_range=(1, 1), stop_words=stopwords)
    tf_idf.fit_transform(corpus)
    return tf_idf


def get_tfidf_keywords(text, tfidf_vectorizer, stopwords=[], score_limit=0.15):
    text = preprocess_text(text, stopwords)
    vector = tfidf_vectorizer.transform([text])
    words = tfidf_vectorizer.get_feature_names()
    tfidf_scores = vector.todense().tolist()[0]

    all_keywords = [(word, tfidf_scores[idx]) for idx, word in enumerate(words)]
    all_keywords = sorted(all_keywords, key=lambda x: x[1], reverse=True)
    top_keywords = list(filter(lambda x: x[1] >= score_limit, all_keywords))

    return top_keywords