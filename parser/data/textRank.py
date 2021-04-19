from functions import get_text, preprocess_text
from summa import keywords

vacancy = preprocess_text(get_text('test_vacancy.txt'))
cv = preprocess_text(get_text('test_cv.txt'))

print(keywords.keywords(vacancy, language="russian", scores=True))
print('====')
print(keywords.keywords(cv, language="russian"))