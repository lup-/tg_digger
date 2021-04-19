import moment from 'moment'
import {
    findRawField,
    getLongestCity,
    unique,
    normalizeLink,
    clearWhitespacesAndSpacySymbols,
    getSectionOrFieldValue,
    splitFio,
    filterMeaningfulKeywords,
    extractPhones,
    extractNames,
    extractCities,
    extractContacts,
    extractUrls,
    extractFields,
    extractHashtags,
    extractSections,
    extractSkills,
    extractSpecialities,
} from './generalParsers.mjs'

function checkPhone(date, phones) {
    let dateNumbers = date.replace(/\D+/g, '');
    return phones ? phones.reduce( (matchingPhoneFound, phone) => {
        let currentPhoneMatches = phone.indexOf(dateNumbers) !== -1;
        return matchingPhoneFound || currentPhoneMatches;
    }, false) : false;
}
function parseDate(text, formats) {
    for (const format of formats) {
        try {
            let date = moment.utc(text, format);
            if (date.isValid()) {
                return date;
            }
        }
        catch (e) {
        }
    }

    return false;
}

function findLinkFields(text, aliases, urlBase) {
    let rawLinks = findRawField(text, aliases);
    let links = rawLinks ? unique(rawLinks.map( rawLink => normalizeLink(rawLink, urlBase) )): false;

    if (!links && urlBase) {
        let parsedUrl = new URL(urlBase);
        let host = parsedUrl.hostname;

        let urlRegex = new RegExp('\\S+'+host+'^\\S+', 'gi');
        rawLinks = text.match(urlRegex);
        links = rawLinks ? unique(rawLinks.map( rawLink => normalizeLink(rawLink, urlBase) )): false;
    }

    return links ? links[0] : false;
}
function findDates(text) {
    let dateRegex = /(\d{2}\.\d{2}\.(\d{2}|\d{4})|(\d{2}|\d{4})-\d{2}-\d{2}|\d{1,2}\s[а-яa-z]+\s\d{4})/g;
    let rawDates = text.match(dateRegex);
    let dates = [];
    let phones = extractPhones(text);

    if (rawDates) {
        dates = rawDates
            .filter( (item, index) => rawDates.indexOf(item) === index )
            .filter( item => !checkPhone(item, phones) )
            .map((date) => parseDate(date, ['DD.MM.YYYY', 'DD.MM.YY', 'YYYY-MM-DD', 'YY-MM-DD', 'D MMMM YYYY']))
            .filter(item => item !== false)
            .filter(item => item.isValid());
    }

    return dates;
}

function extractSocialNets(text) {
    let facebook = findLinkFields(text, ['Facebook', 'FB'], 'https://www.facebook.com/');
    let vk = findLinkFields(text, ['ВКонтакте', 'VKontakte', 'VK', 'ВК'], 'https://vk.com/');
    let linkedin = findLinkFields(text, ['LinkedIn'], 'https://www.linkedin.com/in/');
    let github = findLinkFields(text, ['GitHub'], 'https://www.github.com/');
    let instagram = findLinkFields(text, ['Instagram'], 'https://instagram.com/');

    return {
        facebook,
        vk,
        linkedin,
        github,
        instagram
    }
}
function extractAgeAndBirthday(text) {
    let birthday = false;
    let age = false;

    let hhAgeBirthdayRegex = /(\d+)\s[a-zа-я]+,\s(born\son|родился|родилась)\s(\d+\s[a-zа-я]+\s\d{4})/i;
    let hhDates = text.match(hhAgeBirthdayRegex);

    if (hhDates) {
        let isRu = hhDates[0].indexOf('родил') !== -1;
        let [__, rawAge, _, rawBirthday] = hhDates;
        moment.locale(isRu ? 'ru' : 'en');
        let date = moment.utc(rawBirthday, 'D MMMM YYYY');
        age = parseInt(rawAge);
        birthday = date.toISOString();
    }

    if (!birthday) {
        let dates = findDates(text);
        if (dates.length > 0) {
            let minAge = 18;
            let maxAge = 120;

            let deltas = dates
                .map(date => moment.utc().diff(date, 'years'))
                .map(delta => delta < 0 ? delta + 100 : delta);

            let ages = deltas.filter(delta => delta >= minAge && delta <= maxAge );

            if (ages.length > 0) {
                age = ages[0];
                birthday = dates[deltas.indexOf(age)].toISOString();
            }
        }
    }

    return {
        age,
        birthday
    }
}
function extractPosition(text, sections, fields) {
    return getSectionOrFieldValue(['позиция', 'должность'], sections, fields);
}
function extractExperience(text, sections, fields) {
    return getSectionOrFieldValue(['опыт'], sections, fields);
}
function extractWorkFormat(text, sections, fields) {
    return getSectionOrFieldValue(['формат работы'], sections, fields);
}

function extractSalary(text) {
    let salaryRegex = /[\d\s]{4,}\s*(руб|USD|\$|EUR)/gmi;
    let salary = text.match(salaryRegex) ? text.match(salaryRegex).map(clearWhitespacesAndSpacySymbols): [];
    if (!salary || (salary && salary.length === 0)) {
        return false;
    }
    let salaryText = salary[0];
    let currency = salaryText.replace(/^[\d\s]+/g, '').toLocaleLowerCase() || false;

    return {
        value: parseInt(salaryText.replace(/\D+/, '')),
        currency
    };
}

function extractMetadataFromResume(text, nlpData) {
    let {keywords, normalized_text: normalizedText} = nlpData;
    let {age, birthday} = extractAgeAndBirthday(text);
    let names = extractNames(text);
    let name = names && names[0] ? names[0] : false;
    let cities = extractCities(text, normalizedText);
    let city = getLongestCity(cities);

    let fields = extractFields(text);
    let sections = extractSections(text);

    let extractedData = {
        name,
        nameParts: splitFio(name),
        position: extractPosition(text, sections, fields),
        speciality: extractSpecialities(text),
        experience: extractExperience(text, sections, fields),
        workFormat: extractWorkFormat(text, sections, fields),
        salary: extractSalary(text),
        city,
        age,
        birthday,
        skills: extractSkills(text),
        contacts: extractContacts(text),
        social: extractSocialNets(text),
        keywords: filterMeaningfulKeywords(keywords),
        raw: {
            names,
            cities,
            urls: extractUrls(text),
            fields,
            sections,
            keywords,
            tags: extractHashtags(text),
        },
        source: {
            text,
            normalizedText
        }
    }

    return extractedData;
}

export {
    extractMetadataFromResume
}