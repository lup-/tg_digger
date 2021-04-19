from sklearn.feature_extraction.text import CountVectorizer

import nltk
from nltk import sent_tokenize, regexp_tokenize
from multi_rake import Rake
from nltk.util import ngrams
import pymorphy2
import re
import json
from collections import Counter
from itertools import chain

from nltk.corpus import stopwords
from pymystem3 import Mystem
from string import punctuation

from progress.bar import IncrementalBar

nltk.download('punkt')
nltk.download("stopwords")
#--------#

def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r' +', ' ', text)
    tokens = mystem.lemmatize(text)
    tokens = [token for token in tokens if token not in stopwords \
              and token != " " \
              and token.strip() not in punctuation]

    text = " ".join(tokens)
    return text


def get_text(url, encoding='utf-8'):
    with open(url, encoding=encoding) as f:
        return f.read().lower()


def normalize_tokens(tokens):
    morph = pymorphy2.MorphAnalyzer()
    return [morph.parse(tok)[0].normal_form for tok in tokens]


def remove_stopwords(tokens, stopwords=None, min_length=4):
    if not stopwords:
        return tokens
    stopwords = set(stopwords)
    tokens = [tok
              for tok in tokens
              if tok not in stopwords and len(tok) >= min_length]
    return tokens


def tokenize_n_lemmatize(text, stopwords=None, normalize=True, regexp=r'(?u)\b\w{4,}\b'):
    words = [w for sent in sent_tokenize(text)
             for w in regexp_tokenize(sent, regexp)]
    if normalize:
        words = normalize_tokens(words)
    if stopwords:
        words = remove_stopwords(words, stopwords)
    return words

mystem = Mystem()

custom_stopwords = get_text('stopwords.txt').split("\n")
# text = get_text('skills.txt')
ru_stopwords = stopwords.words("russian")
en_stopwords = stopwords.words("english")
stopwords = ru_stopwords + en_stopwords + custom_stopwords

rake = Rake(
    min_chars=2,
    max_words=3,
    min_freq=1,
    language_code="ru",
    stopwords=stopwords
)



# clear_text = preprocess_text(text)

# keywords = rake.apply(clear_text)
# print(keywords)

num_lines = open('skills.txt').read().count('\n')
bar = IncrementalBar('Обработка', max=num_lines)

keywords_hash = {}
line_number = 0
with open('skills.txt') as input:
    for line in input:
        bar.next()
        keywords = []
        for enum in line.split(','):
            clear_line = preprocess_text(line)
            enum_keywords = rake.apply(clear_line)
            keywords += enum_keywords
        for keywordData in keywords:
            keyword, score = keywordData
            occurence_data = {'score': score, 'text': line.strip()}
            if keyword in keywords_hash:
                keywords_hash[keyword].append(occurence_data)
            else:
                keywords_hash[keyword] = [occurence_data]
    input.close()

bar.finish()

keywords = [{"normal": keyword, "variants": variants} for keyword, variants in keywords_hash.items()]

with open("keywords.json", "w") as outfile:
    json.dump(keywords, outfile)

# words = tokenize_n_lemmatize(text, stopwords=stopwords_ru)
#
# words_counter = Counter(words)
# rare_words = [word for word, count in words_counter.items() if count == 1]
# non_rare_words = [word for word, count in words_counter.items() if count > 1]
#
# bigrams = list(ngrams(words, 2))
# non_rare_bigrams = {bigram: count for bigram, count in Counter(bigrams).items() if count > 1}
#
# trigrams = list(ngrams(words, 3))
# non_rare_trigrams = {trigram: count for trigram, count in Counter(trigrams).items() if count > 1}
# non_rare_trigrams = list(filter(lambda trigram: all(bigram not in non_rare_bigrams for bigram in ngrams(trigram, 2)), non_rare_trigrams))
#
# tetragrams = list(ngrams(words, 4))
# non_rare_tetragrams = {tetragram: count for tetragram, count in Counter(tetragrams).items() if count > 1}
# non_rare_tetragrams = list(filter(lambda tetragram: all(trigram not in non_rare_trigrams for trigram in ngrams(tetragram, 3)), non_rare_tetragrams))
#
# # unique_tetragrams = {trigram: count for trigram, count in Counter(non_rare_trigrams).items() if trigram not in trigrams_in_tetragrams}
#
# print(non_rare_trigrams)
# # unique_trigrams = {trigram: count for trigram, count in Counter(trigrams).items() if count > 1}
# print(trigrams_in_tetragrams)
