const readline = require('readline');
const fs = require('fs');

const inputFile = process.argv[2] || 'skills.txt';
const outputFile = process.argv[3] || 'filteredSkills.txt';

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

(async () => {
    await readLineByLine(inputFile, skill => {
        let stopWords = [
            'опыт', 'знания', 'знаю', 'владею', 'работа', 'умею', 'знание', 'умение', 'владение', 'навык', 'способный', 'способность',
            'успех', 'успеш', 'эффект', 'уверен', 'соблюдаю', 'соблюдение', 'люблю', 'учу ', 'учусь', 'готов ', 'готовность',
            'хороший', 'хорошо', 'хорошие', 'отличный', 'отлично', '( +лет$| +лет +| +года*$| +года* +)', 'основы', 'высокая', 'быстро', 'могу ', 'ооо',
            'хорошая', 'занаком', 'боюсь', '( +все +| +все$)', 'имею', 'изучаю'
        ];
        let cleanSkill = skill
            .replace(/^[^a-zа-яё0-9]+/i, '')
            .replace(/[.; ]+$/, '')
            .replace(/ +/, ' ')
            .replace(/ё/g, 'е').replace(/Ё/g, 'Е');
        let lcCleanSkill = cleanSkill.toLocaleLowerCase();

        let words = lcCleanSkill.split(/\s+/);
        let wordsCount = words.length;
        let longWordsCount = words.filter(word => word.length > 2).length;
        let hasNoStopSigns = !(/[,\.\?\!]/.test(lcCleanSkill));
        let hasNoStopWords = stopWords.reduce((result, word) => result && (new RegExp(word, 'i')).test(lcCleanSkill) === false, true);
        let notSmall = lcCleanSkill.length > 2;
        let oneRepeatingSymbol = lcCleanSkill[0] && lcCleanSkill[0].repeat(lcCleanSkill.length) === lcCleanSkill;
        let notOneRepeatingSymbol = !oneRepeatingSymbol;
        let noVeryLongWords = words.filter(word => word.length > 25).length === 0;

        let isGoodSkill = wordsCount <= 5 && longWordsCount <= 4 && hasNoStopSigns && hasNoStopWords && notSmall && notOneRepeatingSymbol && noVeryLongWords;
        if (isGoodSkill) {
            fs.appendFileSync(outputFile, cleanSkill+'\n');
        }
    })
})();
