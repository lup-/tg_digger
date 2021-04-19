from functions import preprocess_text
from summa import keywords

def get_textrank_keywords(text, stopwords=[], score_limit=0.1):
    text = preprocess_text(text, stopwords)
    all_keywords = keywords.keywords(text, language="russian", scores=True)
    all_keywords = sorted(all_keywords, key=lambda x: x[1], reverse=True)
    top_keywords = list(filter(lambda x: x[1] >= score_limit, all_keywords))

    return top_keywords