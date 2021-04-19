from functions import get_text, preprocess_text

text = get_text('skills100k.txt')
clear_text = preprocess_text(text, True)

with open("lemmatized_skills100k.txt", "w") as outfile:
    outfile.write(clear_text)
    outfile.close()