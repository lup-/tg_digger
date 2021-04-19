from functions import get_text, preprocess_text, load_stopwords
from sklearn.feature_extraction.text import TfidfVectorizer


def prepare_tfidf_vectorizer(corpus_file):
    corpus = get_text(corpus_file).splitlines()
    tf_idf = TfidfVectorizer(ngram_range=(1, 1), stop_words=load_stopwords())
    tf_idf.fit_transform(corpus)
    return tf_idf


def get_keywords(text, tfidf_vectorizer, score_limit=0.15):
    vector = tfidf_vectorizer.transform([text])
    words = tfidf_vectorizer.get_feature_names()
    tfidf_scores = vector.todense().tolist()[0]

    all_keywords = [(word, tfidf_scores[idx]) for idx, word in enumerate(words)]
    all_keywords = sorted(all_keywords, key=lambda x: x[1], reverse=True)
    top_keywords = list(filter(lambda x: x[1] >= score_limit, all_keywords))

    return top_keywords

hh_vectorizer = prepare_tfidf_vectorizer('lemmatized_skills100k.txt')
news_vectorizer = prepare_tfidf_vectorizer('russian_news_corpus/top100k.txt')

vacancy = get_text('test_vacancy.txt')
vacancy = preprocess_text(vacancy)

cv = get_text('test_cv.txt')
cv = preprocess_text(cv)

print(get_keywords(vacancy, hh_vectorizer, 0.15))
print(get_keywords(vacancy, news_vectorizer, 0.10))
print(get_keywords(cv, hh_vectorizer, 0.15))
print(get_keywords(cv, news_vectorizer, 0.10))
