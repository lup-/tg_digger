import os
import flask
import re
from flask import request, jsonify

import rakekw
import tfidfkw
import textrankkw
from functions import load_stopwords, preprocess_text, lc_and_clean_symbols

app = flask.Flask(__name__)
app.config["DEBUG"] = False

stopwords = load_stopwords()
rake = rakekw.get_rake(stopwords)
tfidf = tfidfkw.prepare_tfidf_vectorizer('data/lemmatized_skills100k.txt', stopwords)


def jsonify_keywords(keywords):
    return [{'keyword': keyword, 'score': score} for keyword, score in keywords]


@app.route('/keywords', methods=['POST'])
def extract_keywords():
    text = request.data.decode('utf-8')
    text_no_newlines = re.sub(r'(\. )+', '. ', ". ".join(text.split("\n")))

    clean_text = lc_and_clean_symbols(text_no_newlines)
    normalized_text = preprocess_text(text_no_newlines, stopwords)
    rake_keywords = rakekw.get_rake_keywords(clean_text, rake)
    tfidf_keywords = tfidfkw.get_tfidf_keywords(normalized_text, tfidf, stopwords)
    textrank_keywords = textrankkw.get_textrank_keywords(clean_text, stopwords)

    result = {'text': text, 'normalized_text': normalized_text, 'keywords': {
        'rake': jsonify_keywords(rake_keywords),
        'tfidf': jsonify_keywords(tfidf_keywords),
        'textrank': jsonify_keywords(textrank_keywords)
    }}

    return jsonify(result)


app.run(host='0.0.0.0', port=os.getenv('PORT'))
