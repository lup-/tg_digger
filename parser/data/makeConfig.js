const readline = require('readline');
const fs = require('fs');
const axios = require('axios');

function readLineByLine(file, getItemCallback) {
    let results = [];

    return new Promise(resolve => {
        const readInterface = readline.createInterface({
            input: fs.createReadStream(file),
            output: false,
            console: false
        });

        readInterface.on('line', (line) => {
            let item = getItemCallback(line);
            if (item !== false && results.indexOf(item) === -1) {
                results.push(item);
            }
        });

        readInterface.on('close', () => resolve(results));
    });
}
function filterNameItemsByCount(line) {
    let item = JSON.parse(line);

    if (item.count > 10) {
        return item.text.toLocaleLowerCase();
    }

    return false;
}
function filterSkills(skill) {
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

    return wordsCount <= 5 && longWordsCount <= 4 && hasNoStopSigns && hasNoStopWords && notSmall && notOneRepeatingSymbol && noVeryLongWords
        ? cleanSkill
        : false;
}
function getCityNames() {
    let cities = JSON.parse( fs.readFileSync('russian-cities.json') );
    return cities.map( city => city.name.toLocaleLowerCase() );
}
async function getSpecialitiesFromHH() {
    let {data} = await axios.get('https://api.hh.ru/specializations');

    let specialities = [];
    for (const area of data) {
        specialities = specialities.concat( area.specializations.map(spec => spec.name) );
    }

    return specialities;
}

(async () => {
    console.log('Имена');
    let firstNames = await readLineByLine(__dirname+'/russiannames_db_jsonl/names.jsonl', filterNameItemsByCount);
    console.log('Отчества');
    let surNames = await readLineByLine(__dirname+'/russiannames_db_jsonl/midnames.jsonl', filterNameItemsByCount);
    console.log('Фамилии');
    let familyNames = await readLineByLine(__dirname+'/russiannames_db_jsonl/surnames.jsonl', filterNameItemsByCount);
    console.log('Города');
    let cities = getCityNames();
    console.log('Навыки');
    let skills = await readLineByLine(__dirname+'/skills_4899601.txt', filterSkills);
    console.log('Специализации');
    let specialities = await getSpecialitiesFromHH();

    console.log('Сохраняю...');
    let config = {firstNames, surNames, familyNames, cities, skills, specialities};
    fs.writeFileSync('config.mjs', 'export default '+JSON.stringify(config));
    console.log('Готово');
})();
