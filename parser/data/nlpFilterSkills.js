const readline = require('readline');
const fs = require('fs');
const natural = require('natural');

const inputFile = process.argv[2] || 'filteredSkills.txt';
const outputFile = process.argv[3] || 'nlpFilteredSkills.txt';

const RARE_TF_LIMIT = 5;
const RARE_TF_IDF_LIMIT = 5;

function readLineByLine(file, lineProcessCallback) {
    let results = [];

    return new Promise(resolve => {
        const readInterface = readline.createInterface({
            input: fs.createReadStream(file),
            output: false,
            console: false
        });

        readInterface.on('line', lineProcessCallback);
        readInterface.on('close', () => resolve(results));
    });
}
function increaseCounter(aggr, ngram) {
    let key = ngram.join(' ');
    if (!aggr[key]) {
        aggr[key] = 0;
    }

    aggr[key]++;
    return aggr;
}
function distanceBetweenDotAndLine(dot, K, B) {
    //уравнение перпендикулярной прямой y - y1 = -1/K*(x-x1) => y = -1/K*x + (x1/K + y1)
    let K1 = -1/K;
    let B1 = dot.x/K + dot.y;

    //точка пересечения двух прямых Kx+B = K1x+B1 => Kx-K1x = B1 - B => x*(K - K1) = B1 - B
    let intX = (B1-B)/(K-K1);

    let intDot = {x: intX, y: K*intX+B};
    let distance = Math.sqrt( (dot.x - intDot.x)**2 + (dot.y - intDot.y)**2 );
    return distance;
}
function getKneeIndex(sortedNgramms) {
    //https://raghavan.usc.edu//papers/kneedle-simplex11.pdf
    let lastIndex = sortedNgramms.length-1;
    let lastNgramm = sortedNgramms[lastIndex];

    let dotA = {x: 0, y: sortedNgramms[0].count};
    let dotB = {x: lastIndex, y: lastNgramm.count};

    //y = Kx + B -- базовая линия
    let K = (dotA.y - dotB.y)/(dotA.x -  dotB.x);
    let B = dotA.y - K*dotA.x;

    let maxIndex = false;
    let maxDistance = false;
    for (let index in sortedNgramms) {
        let ngramm = sortedNgramms[index];

        let dotC = {x: index, y: ngramm.count};
        let distance = distanceBetweenDotAndLine(dotC, K, B);
        if (maxDistance === false || maxDistance < distance) {
            maxDistance = distance;
            maxIndex = index;
        }
    }

    return maxIndex ? parseInt(maxIndex) : false;
}

function getUsefulNgramms(aggr) {
    let ngramms = Object.keys(aggr).map(ngramm => {
        let count = aggr[ngramm];
        return {ngramm, count};
    });
    ngramms.sort((a, b) => b.count - a.count);
    let sliceIndex = getKneeIndex(ngramms);
    if (sliceIndex) {
        ngramms = ngramms.splice(0, sliceIndex);
    }

    return ngramms;
}
function crossFilterNgramms(ngramms, ngrammsToSearch) {
    return ngramms.filter(ngramm => {
        let currentStems = ngramm.ngramm.split(' ');
        let hasWiderNgramm = ngrammsToSearch.reduce((result, testNgramm) => {
            let testStems = testNgramm.ngramm.split(' ');
            let foundStems = currentStems.filter(stem => testStems.indexOf(stem) !== -1);
            let allStemsFoundInWiderNgramm = foundStems.length === currentStems.length;

            return result || allStemsFoundInWiderNgramm;
        }, false);
        return !hasWiderNgramm;
    });
}

(async () => {
    const tokenizer = new natural.WordTokenizer({pattern: /[^A-Za-zА-Яа-я0-9_\-\+]+/});
    const tfidf = new natural.TfIdf();
    tfidf.setTokenizer(tokenizer);
    tfidf.addFileSync('filteredSkills.txt');

    await readLineByLine('./russian_news_corpus/top1k_orig.txt', doc => {
        tfidf.addDocument(doc);
    });
    let terms = tfidf.listTerms(0);
// let rareTerms = terms.filter(term => term.tf < 5).map(term => term.term);
})();


try {
    fs.rmSync(outputFile);
}
catch (e) {}


// (async () => {
//     let words = {};
//     let bigramms = {};
//     let trigramms = {};
//     let tetragramms = {};
//
//     await readLineByLine(inputFile, skill => {
//         let isRussian = /[а-я]+/.test(skill.toLowerCase());
//         let tokens = tokenizer.tokenize(skill);
//
//         let stems = isRussian
//             ? tokens.map(natural.PorterStemmerRu.stem)
//             : tokens.map(natural.PorterStemmer.stem);
//         stems = stems.filter(stem => stem.length > 1).sort();
//
//         stems.map(stem => increaseCounter(words, [stem]));
//         natural.NGrams.bigrams(stems).map(bigramm => increaseCounter(bigramms, bigramm))
//         natural.NGrams.trigrams(stems).map(trigramm => increaseCounter(trigramms, trigramm))
//         natural.NGrams.ngrams(stems, 4).map(tetragramm => increaseCounter(tetragramms, tetragramm))
//     });
//
//     words = getUsefulNgramms(words);
//     bigramms = getUsefulNgramms(bigramms);
//     trigramms = getUsefulNgramms(trigramms);
//     tetragramms = getUsefulNgramms(tetragramms);
//
//     trigramms = crossFilterNgramms(trigramms, tetragramms);
//     bigramms = crossFilterNgramms(bigramms, tetragramms);
//     bigramms = crossFilterNgramms(bigramms, trigramms);
//     words = crossFilterNgramms(words, tetragramms);
//     words = crossFilterNgramms(words, trigramms);
//     words = crossFilterNgramms(words, bigramms);
//
//     fs.writeFileSync('1gramms.txt', words.map(ngramm => ngramm.ngramm+': '+ngramm.count).join('\n'));
//     fs.writeFileSync('2gramms.txt', bigramms.map(ngramm => ngramm.ngramm+': '+ngramm.count).join('\n'));
//     fs.writeFileSync('3gramms.txt', trigramms.map(ngramm => ngramm.ngramm+': '+ngramm.count).join('\n'));
//     fs.writeFileSync('4gramms.txt', tetragramms.map(ngramm => ngramm.ngramm+': '+ngramm.count).join('\n'));
// })();