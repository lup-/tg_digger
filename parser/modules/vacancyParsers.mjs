import {
    clearWhitespacesAndSpacySymbols,
    getLongestCity,
    filterMeaningfulKeywords,
    extractCities,
    extractFields,
    extractHashtags,
    extractNames,
    extractSections,
    extractContacts,
    getSectionOrFieldValue,
    findSimilarSection,
    capitalize,
    extractUrls,
    extractSkills,
    extractSpecialities
} from "./generalParsers.mjs";

function transformValueToList(value) {
    if (value.content) {
        value = value.content;
    }

    return typeof (value) === 'string'
        ? value.split('\n').map(line => {
            return line.replace(/^[^a-zа-яё]+/ig, '').replace(/;$/, '').trim();
          })
        : false;
}

function extractResponsibilities(text, sections, fields) {
    return transformValueToList( findSimilarSection(['задачи', 'обязанности', 'предстоит'], sections) );
}
function extractDemands(text, sections, fields) {
    return transformValueToList( findSimilarSection(['требования', 'ждем от вас'], sections) );
}
function extractAdditionalDemands(text, sections, fields) {
    return transformValueToList( findSimilarSection(['будет плюсом'], sections) );
}
function extractSchedule(text, sections, fields) {
    return getSectionOrFieldValue(['график'], sections, fields);
}
function extractCompany(text, sections, fields) {
    return getSectionOrFieldValue(['компания'], sections, fields);
}
function extractTerms(text, sections, fields) {
    return transformValueToList( findSimilarSection(['условия'], sections) );
}
function extractAbout(text, sections, fields) {
    let section = findSimilarSection(['о компании', 'о прокте'], sections)
    return section ? section.content : false;
}
function extractPosition(text, sections, fields) {
    let position = getSectionOrFieldValue(['позиция', 'должность'], sections, fields);
    if (position) {
        return capitalize(position);
    }

    let lines = text.split('\n');
    let firstLineWithTags = lines[0].indexOf('#') !== -1;
    position = firstLineWithTags ? lines[1] : lines[0];
    position = position.toLowerCase();

    if (position.indexOf(',') !== -1) {
        position = position.slice(0, position.indexOf(','));
    }

    if (position.indexOf(' в ') !== -1) {
        position = position.slice(0, position.indexOf(' в '));
    }

    position = position
        .replace(/\(.*?\)/g, '')
        .replace('ё', 'е')
        .replace(/[^а-яa-z \-]+/g, ' ').trim();

    return capitalize(position);
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
function extractRemote(text) {
    let remoteVariants = ['удаленный', 'удаленная', 'удаленка'];
    let preparedText = text.toLocaleLowerCase().replace(/ё/gi, 'е');
    return remoteVariants.reduce( (isRemote, textPattern) => {
        return isRemote || preparedText.indexOf(` ${textPattern} `) !== -1;
    }, false);
}

function extractMetadataFromVacancy(text, nlpData) {
    let {keywords, normalized_text: normalizedText} = nlpData;
    let names = extractNames(text);
    let hrCandidateName = names && names[0] ? names[0] : false;
    let hrCandidateNameIsInEnd = hrCandidateName && text.indexOf(hrCandidateName) > text.length * 0.75;
    let hrName = hrCandidateNameIsInEnd ? hrCandidateName : false;
    let cities = extractCities(text, normalizedText);
    let location = getLongestCity(cities);

    let fields = extractFields(text);
    let sections = extractSections(text);

    return {
        position: extractPosition(text, sections, fields),
        speciality: extractSpecialities(text),
        schedule: extractSchedule(text, sections, fields),
        company: extractCompany(text, sections, fields),
        location,
        remote: extractRemote(normalizedText),
        salary: extractSalary(text),
        about: extractAbout(text, sections),
        responsibilities: extractResponsibilities(text, sections),
        demands: extractDemands(text, sections),
        additionalDemands: extractAdditionalDemands(text, sections),
        terms: extractTerms(text, sections),
        hrName,
        contacts: extractContacts(text),
        skills: extractSkills(text),
        keywords: filterMeaningfulKeywords(keywords),
        raw: {
            names,
            cities,
            fields,
            sections,
            keywords,
            urls: extractUrls(text),
            tags: extractHashtags(text),
        },
        source: {
            text,
            normalizedText
        }
    }
}

export {
    extractMetadataFromVacancy
}