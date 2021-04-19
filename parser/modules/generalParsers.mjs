import dataConfig from '../data/config.mjs';
import Fuse from "fuse.js";
import axios from "axios";

const TEXTRACTOR_URL = process.env.TEXTRACTOR_URL;
const citiesStopwords = ["свободный", "белый"];

function unique(array) {
    return array.filter( (item, index) => array.indexOf(item) === index );
}

function clearWhitespaces(text) {
    return text.replace(/\s+/g, '');
}
function clearWhitespacesAndSpacySymbols(text, skipDash) {
    return skipDash
        ? text.replace(/^[\s\.,_]+/, '').replace(/[\s\.,_]+$/, '').replace(/[\s\.,_]+/g, ' ')
        : text.replace(/^[\s\.,\-_]+/, '').replace(/[\s\.,\-_]+$/, '').replace(/[\s\.,\-_]+/g, ' ');
}
function clearStopwords(text, skipDash) {
    let stopWords = ['резюме', 'мужчина', 'женщина', 'resume', 'cv', 'male', 'female'].join('|');
    return clearWhitespacesAndSpacySymbols( text.replace(new RegExp(stopWords, 'gi'), ''), skipDash );
}
function splitWords(text) {
    return text.split(/[^а-яёa-z0-9\-]+/i);
}
function capitalize(string) {
    string = string.toLowerCase();
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function normalizePhone(phone) {
    phone = phone.replace(/\D+/g, '').replace(/^\+8/, '+7');

    if (phone[0] === '8') {
        phone = '7' + phone.slice(1);
    }

    if (phone.length <= 10) {
        phone = '7'+phone;
    }

    return '+'+phone;
}
function normalizeLink(link, urlBase) {
    try {
        let parsedLink = new URL(link);
        return parsedLink.toString();
    }
    catch (e) {
        link = link.replace(/^.*\//, '');
        return urlBase ? normalizeLink(urlBase+link) : false;
    }
}

function filterCapitalized(items) {
    return items.filter(item => /[А-ЯЁA-Z][а-яёa-z]+/.test(item));
}
function filterNames(items) {
    let cities = dataConfig.cities.map(city => city.replace('ё', 'е'));
    return items.filter( item => {
        let itemParts = item.toLocaleLowerCase().replace('ё', 'е').split(/\s/);

        let hasName = false;
        let countFoundNames = 0;
        for (const part of itemParts) {
            //Иногда города называют по фамилиям людей. А иногда и фамилии по названиям городов. Москва, например. И город, и фамилия.
            let isNotCity = cities.indexOf(part) === -1;
            let isName = false;

            if (isNotCity) {
                isName = part.length >= 3 &&
                    (dataConfig.firstNames.indexOf(part) !== -1 || dataConfig.surNames.indexOf(part) !== -1 || dataConfig.familyNames.indexOf(part) !== -1);
                hasName = hasName || isName;
            }

            if (isName) {
                countFoundNames++;
            }
        }

        return hasName && (countFoundNames/itemParts.length > 0.5);
    });
}
function filterCities(items) {
    let cities = dataConfig.cities.map(city => city.replace('ё', 'е').replace('-', ' '));
    return items
        .filter( item => cities.indexOf(item.toLocaleLowerCase()) !== -1 )
        .filter( item => citiesStopwords.indexOf(item.toLowerCase()) === -1);
}
function findCities(text) {
    let cities = dataConfig.cities;
    return cities
        .filter( city => {
            let normCity = city.replace('ё', 'е').replace('-', ' ');
            return (new RegExp('^'+city+'\\s')).test(text) ||
                (new RegExp('\\s'+city+'$')).test(text) ||
                (new RegExp('\\s'+city+'\\s')).test(text) ||
                (new RegExp('^'+normCity+'\\s')).test(text) ||
                (new RegExp('\\s'+normCity+'$')).test(text) ||
                (new RegExp('\\s'+normCity+'\\s')).test(text);
        })
        .filter( city => citiesStopwords.indexOf(city) === -1)
        .map( city => {
            return city
                .split(' ').map(part => {
                    return part.length > 2 ? capitalize(part) : part;
                }).join(' ')
                .split('-').map(capitalize).join('-');
        });
}
function getLongestCity(cities) {
    return cities && cities.length > 0
        ? cities.reduce( (longestCity, city) => {
            if (!longestCity) {
                return city;
            }

            return city.length > longestCity.length ? city : longestCity;
        }, false)
        : false;
}
function filterSkills(tokens) {
    let skills = dataConfig.skills;
    return tokens.filter( token => skills.indexOf(token) !== -1 );
}
function filterMeaningfulKeywords(keywords) {
    return keywords.tfidf.filter(keyword => !/\d+/.test(keyword)).map(keyword => keyword.keyword);
}
function splitFio(fio) {
    if (!fio) {
        return {f: false, i: false, o: false}
    }

    let lcParts = fio.toLocaleLowerCase().split(' ');
    let parts = fio.split(' ');

    if (parts.length === 3) {
        //есть фамилии которые как отчества. Викторович, например - и фамилия, и отчество.
        let isFamilyNameLast = dataConfig.familyNames.indexOf(lcParts[2]) !== -1 && dataConfig.surNames.indexOf(lcParts[2]) === -1;
        let isIOFpattern = isFamilyNameLast || dataConfig.firstNames.indexOf(lcParts[0]) !== -1;
        ;
        let [f, i, o] = parts;
        if (isIOFpattern) {
            [i, o, f] = parts;
        }

        return {f, i, o}
    }

    if (parts.length === 2) {
        let isIFpattern = dataConfig.familyNames.indexOf(lcParts[1]) !== -1 || dataConfig.firstNames.indexOf(lcParts[0]) !== -1;
        let [f, i] = parts;
        if (isIFpattern) {
            [i, f] = parts;
        }

        return {f, i, o: false}
    }

    if (parts.length === 1) {
        let isFirstName = dataConfig.firstNames.indexOf(lcParts[0]) !== -1
        return isFirstName
            ? {f: false, i: parts[0], o: false}
            : {f: parts[0], i: false, o: false}
    }
}

function findRawField(text, aliases) {
    let fieldRegex = new RegExp( '(?<=(' +aliases.join('|') + '):\\s+)(.*)', 'gi' );
    let altFieldRegex = new RegExp( '(?<=(' +aliases.join('|') + ')\\s+)(@\S*)', 'gi' );
    let result = text.match(fieldRegex);

    if (!result) {
        result = text.match(altFieldRegex);
    }

    return result;
}
function findContact(text, aliases) {
    let rawContacts = findRawField(text, aliases);
    let contacts = rawContacts ? unique(rawContacts.map( clearWhitespaces )): false;
    return contacts[0] || false;
}
function findSimilarSection(aliases, sections) {
    const fuse = new Fuse(sections, {
        keys: ['title', 'rawTitle'],
        includeScore: true,
        minMatchCharLength: 3,
        distance: 3,
        threshold: 0.2
    });

    for (const pattern of aliases) {
        let results = fuse.search(pattern);
        if (results && results.length > 0) {
            return results[0].item;
        }
    }

    return false;
}
function findSimilarField(aliases, fields) {
    const fuse = new Fuse(fields, {
        keys: ['title'],
        includeScore: true,
        minMatchCharLength: 3,
        distance: 3,
        threshold: 0.2
    });

    for (const pattern of aliases) {
        let results = fuse.search(pattern);
        if (results && results.length > 0) {
            return results[0].item;
        }
    }

    return false;
}
function getSectionOrFieldValue(aliases, sections, fields) {
    let foundField = findSimilarField(aliases, fields);
    if (foundField) {
        return foundField.value;
    }

    let foundSection = findSimilarSection(aliases, sections);
    if (foundSection) {
        return foundSection.content;
    }

    return false;
}

function extractEmails(text) {
    let emailRegex = /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/g;
    let rawEmails = text.match(emailRegex);
    let emails = false;

    if (rawEmails) {
        emails = unique( rawEmails );
    }

    return emails;
}
function extractPhones(text) {
    let phoneRegex = /(?<!\d)\+*\s*\d\s*\(*\d{3}\)*\s*\d{3}[\s-]*\d{2}[\s-]*\d{2}(?!\d)/g;
    let rawPhones = text.match(phoneRegex);
    let phones = false;

    if (rawPhones) {
        phones = unique( rawPhones.map(normalizePhone) );
    }

    return phones;
}
function extractContacts(text, basePlatform = 'telegram') {
    let telegram = findContact(text, ['Telegram', 'Telegramm', 'Телеграм', 'Телеграмм']);
    let instagram = findContact(text, ['Instagram+', 'Insta', 'Инстаграм+', 'Инста']);
    let ats = extractAts(text);
    let at = ats && ats[0] ? ats[0] : false;

    if (!telegram && basePlatform === 'telegram') {
        telegram = at;
    }

    if (!instagram && basePlatform === 'instagram') {
        instagram = at;
    }

    let urls = extractUrls(text, false);
    let url = urls && urls.length > 0 ? urls[0] : false;

    return {
        email: extractEmails(text),
        phone: extractPhones(text),
        skype: findContact(text, ['Skype', 'Скайп']),
        telegram,
        whatsapp: findContact(text, ['wh*atsapp*', 'WhatsApp', 'Вотсап', 'Вацап', 'WA']),
        instagram,
        url
    }
}
function extractSkills(text) {
    let lcText = text.toLocaleLowerCase();
    let textSkills = dataConfig.skills && dataConfig.skills.length > 0
        ? dataConfig.skills.filter(skill => lcText.indexOf(skill.toLocaleLowerCase()) !== -1)
        : [];
    return textSkills.length > 0 ? textSkills : false;
}
function extractSpecialities(text) {
    let lcText = text.toLocaleLowerCase();
    let textSpecs = dataConfig.specialities && dataConfig.specialities.length > 0
        ? dataConfig.specialities.filter(spec => lcText.indexOf(spec.toLocaleLowerCase()) !== -1)
        : [];
    return textSpecs.length > 0 ? textSpecs : false;
}
function extractNames(text) {
    let nameRegex = /([А-ЯЁ][а-яё]+[\s\-_\.,]{1,2}){2,4}|([A-Z][a-z\-]+[\s\-_\.,]{1,2}){2}/gm;
    let fullNames = text.match(nameRegex) ? text.match(nameRegex).map(name => clearStopwords(name, true)): [];
    let filteredFullNames = filterNames(fullNames);
    if (filteredFullNames.length > 0) {
        return filteredFullNames;
    }

    let anyNames = filterCapitalized( filterNames(splitWords(text)) );

    return anyNames.length > 0 ? anyNames : false;
}
function extractCities(text, normalizedText) {
    let fieldCityRegex = /(?<=(Проживает|Город|Resid.*|City): )([A-ZА-ЯЁ][a-zа-яё]+[ \-]*){1,2}/g;
    let rawCities = text.match(fieldCityRegex);
    let cities = rawCities ? unique(rawCities.map(clearWhitespacesAndSpacySymbols)): false;

    if (cities.length > 0) {
        cities = filterCities(cities);
        return cities.length > 0 ? cities : false;
    }

    let anyCities = filterCapitalized( filterCities(splitWords(text)) );
    if (anyCities.length) {
        return anyCities;
    }

    anyCities = false;
    if (normalizedText) {
        anyCities = findCities(normalizedText);
    }

    return anyCities && anyCities.length > 0 ? anyCities : false;
}
function extractUrls(text, groupUrls = true, urlBase = false) {
    let linkRegex = /https*:\/\/[^\s]+/g;
    let rawLinks = text.match(linkRegex);

    let links = rawLinks ? unique(rawLinks.map( rawLink => normalizeLink(rawLink, urlBase) )): false;
    if (!groupUrls) {
        return links;
    }

    let linksByDomains = links ? links.reduce( (groups, link) => {
        let parsedUrl = new URL(link);
        let host = parsedUrl.hostname.replace(/\./g, '_');
        if (!groups[host]) {
            groups[host] = [];
        }

        groups[host].push(link);
        return groups;
    }, {}) : false;

    return linksByDomains ? linksByDomains : false;
}
function extractFields(text) {
    let fieldsRegex = /^[^а-яa-zё]{0,3}([а-яa-zё]+\s*){1,3}: (.+)$/gim;
    let fieldRegex = /^[^а-яa-zё]{0,3}(([а-яa-zё]+\s*){1,3}): (.+)$/i;
    
    let foundFields = text.match(fieldsRegex);
    if (!foundFields) {
        return false;
    }
    
    let fields = [];
    for (let fieldLine of foundFields) {
        let parts = fieldLine.match(fieldRegex);
        let title = parts[1];
        let value = parts[parts.length-1];
        if (value.indexOf('.') !== -1) {
            value = value.split('.')[0];
        }
        
        fields.push({title, value});
    }

    return fields;
}
function extractSections(text) {
    let textLines = text.split('\n');
    let extractedSections = [];
    let currentSectionLines = [];
    let currentSection = false;
    let rawSectionTitle = false;

    for (let line of textLines) {
        line = line.trim();

        let sectionTitleRegexp = /^([а-яА-Яa-zA-ZёЁ]+\s*){1,4}[:\?]*$/gi;
        let isTitle = sectionTitleRegexp.test(line) || line.trim() === '';

        if (isTitle) {
            extractedSections.push({
                title: rawSectionTitle ? rawSectionTitle.replace(/[:\?]+/g, '').trim()  : false,
                rawTitle: rawSectionTitle ? rawSectionTitle : false,
                content: currentSectionLines.join('\n'),
            });

            currentSection = line.trim() === '' ? false : line.match(sectionTitleRegexp)[0].replace(':', '').trim();
            rawSectionTitle = line.trim() === '' ? false : line;
            currentSectionLines = [];
        }
        else {
            currentSectionLines.push(line);
        }
    }

    extractedSections.push({
        title: rawSectionTitle ? rawSectionTitle.replace(/[:\?]+/g, '').trim()  : false,
        rawTitle: rawSectionTitle,
        content: currentSectionLines.join('\n'),
    });

    return extractedSections;
}
function extractHashtags(text) {
    let hashtagRegex = /#[^\s#]+/gi;
    let tags = text.match(hashtagRegex);
    return tags && tags.length > 0
        ? tags.map(tag => tag.replace('#', '').trim())
        : false;
}
function extractAts(text) {
    let atRegex = /@[a-z0-9\._]+/gi;
    let ats = text.match(atRegex);
    return ats && ats.length > 0
        ? ats.map(at => at.trim())
        : false;
}

async function getNlpData(text) {
    let url = TEXTRACTOR_URL + '/keywords';
    let {data: parsed} = await axios.post(url, text, {
        headers: { 'Content-Type': 'text/plain' }
    });
    return parsed;
}

function wordsCount(text, words) {
    let lcText = text.toLowerCase();
    let matchedCount = words.map( word => lcText.indexOf( word.toLowerCase() ) !== -1 ? 1 : 0).reduce((sum, val) => sum += val, 0);
    return matchedCount;
}
function wordsRate(text, words) {
    let matchedCount = wordsCount(text, words);
    return matchedCount / words.length;
}
function detectType(text) {
    let resumePatterns = ['резюме', 'мочь', 'опыт', 'знание'];
    let vacancyPatterns = ['вакансия', 'требование', 'обязанность', 'условие', 'график', 'опыт', 'знание', 'команда', 'присылать', 'отклик', 'компания', 'занятость'];

    let resumeWords = wordsCount(text, resumePatterns);
    let vacancyWords = wordsCount(text, vacancyPatterns);

    let isVacancy = vacancyWords >= 2;
    let isResume = resumeWords >= 2;
    if (isVacancy && isResume) {
        isVacancy = vacancyWords >= resumeWords;
        isResume = resumeWords > vacancyWords;
    }

    return {
        isVacancy,
        isResume
    }
}

export {
    extractEmails,
    extractPhones,
    extractContacts,
    extractNames,
    extractCities,
    extractUrls,
    extractFields,
    extractSections,
    extractHashtags,
    extractSkills,
    extractSpecialities,

    findSimilarSection,
    findSimilarField,
    getSectionOrFieldValue,
    findRawField,
    unique,
    normalizeLink,
    splitFio,
    capitalize,
    clearWhitespacesAndSpacySymbols,
    getLongestCity,
    filterMeaningfulKeywords,

    detectType,
    getNlpData
}

