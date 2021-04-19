import re
from nltk import sent_tokenize, regexp_tokenize
from string import punctuation
from collections import Counter
from progress.bar import IncrementalBar
from nltk.corpus import stopwords
import pymorphy2

def get_text(url, encoding='utf-8'):
    with open(url, encoding=encoding, errors='ignore') as f:
        return f.read().lower()


def load_stopwords():
    custom_stopwords = get_text('stopwords.txt').splitlines()
    custom_stopwords_2 = get_text('stopwords-ru.txt').splitlines()
    ru_stopwords = stopwords.words("russian")
    en_stopwords = stopwords.words("english")
    all_stopwords = ru_stopwords + en_stopwords + custom_stopwords + custom_stopwords_2
    return all_stopwords


def preprocess_text(text, sent_by_newline = False):
    regexp=r'(?u)\b\w{4,}\b'
    morph = pymorphy2.MorphAnalyzer()

    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r' +', ' ', text)
    text = text.strip()

    dst_sents = []
    src_sents = text.splitlines() if sent_by_newline else sent_tokenize(text)

    stopwords_dict = Counter(load_stopwords())
    punctuation_dict = Counter(punctuation)

    bar = IncrementalBar('Обработка', max=len(src_sents))

    for sent in src_sents:
        bar.next()
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


