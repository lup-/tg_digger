import re
import nltk
from nltk import sent_tokenize, regexp_tokenize
from string import punctuation
from collections import Counter
from nltk.corpus import stopwords
import pymorphy2

nltk.download('stopwords')
nltk.download('punkt')


def get_text(url, encoding='utf-8'):
    with open(url, encoding=encoding, errors='ignore') as f:
        return f.read().lower()


def load_stopwords():
    custom_stopwords = get_text('data/stopwords.txt').splitlines()
    custom_stopwords_2 = get_text('data/stopwords-ru.txt').splitlines()
    custom_stopwords_3 = get_text('data/handmade-stopwords.txt').splitlines()
    ru_stopwords = stopwords.words("russian")
    en_stopwords = stopwords.words("english")
    all_stopwords = ru_stopwords + en_stopwords + custom_stopwords + custom_stopwords_2 + custom_stopwords_3
    return all_stopwords


def lc_and_clean_symbols(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r' +', ' ', text)

    return text


def preprocess_text(text, stopwords=[], sent_by_newline=False):
    regexp=r'(?u)\b\w{4,}\b'
    morph = pymorphy2.MorphAnalyzer()

    text = lc_and_clean_symbols(text)

    dst_sents = []
    src_sents = text.splitlines() if sent_by_newline else sent_tokenize(text)

    stopwords_dict = Counter(stopwords)
    punctuation_dict = Counter(punctuation)

    for sent in src_sents:
        tokens = regexp_tokenize(sent, regexp)
        tokens = [token for token in tokens if token != " "]
        tokens = [token for token in tokens if token not in stopwords_dict]
        tokens = [token for token in tokens if token not in punctuation_dict]
        tokens = [morph.parse(tok)[0].normal_form for tok in tokens]

        if (len(tokens) > 0):
            sent = " ".join(tokens)
            dst_sents.append(sent)

    text = "\n".join(dst_sents)
    return text


