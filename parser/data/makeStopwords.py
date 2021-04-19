from sklearn.feature_extraction.text import CountVectorizer
from pymystem3 import Mystem

def get_text(url, encoding='utf-8'):
    with open(url, encoding=encoding) as f:
        return f.read().lower()

mystem = Mystem()
vectorizer = CountVectorizer(min_df=2, max_df=0.2)
corpus = get_text('skills.txt').split('\n')
lemmatized_corpus = [" ".join(mystem.lemmatize(text)) for text in corpus]
x = vectorizer.fit_transform(lemmatized_corpus)
custom_stopwords = list(vectorizer.stop_words_)
with open("stopwords.txt", "w") as outfile:
    outfile.write("\n".join(custom_stopwords))