from multi_rake import Rake
from functions import preprocess_text


def get_rake(stopwords):
    return Rake(
        min_chars=2,
        max_words=3,
        min_freq=1,
        language_code="ru",
        stopwords=stopwords
    )


def get_rake_keywords(text, raker, score_limit=1):
    keywords = raker.apply(text)
    top_keywords = list(filter(lambda x: x[1] > score_limit, keywords))
    return top_keywords