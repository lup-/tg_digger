import {getDb} from './modules/database.mjs';
import {detectType, getNlpData} from "./modules/generalParsers.mjs";
import {extractMetadataFromResume} from "./modules/resumeParsers.mjs";
import {extractMetadataFromVacancy} from "./modules/vacancyParsers.mjs";

(async () => {
    let db = await getDb();
    let messages = await db.collection('messages').find({"content.text.text": {$nin: [null, false]}}).toArray();
    for (let message of messages) {
        let text = message.content.text.text;

        try {
            let nlpData = await getNlpData(text);
            let {isVacancy, isResume} = detectType(nlpData.normalized_text);

            if (isVacancy) {
                let meta = await extractMetadataFromVacancy(text, nlpData);
                let skillsList = meta.demands && meta.demands.length > 0
                    ? meta.demands
                    : [];
                if (meta.additionalDemands && meta.additionalDemands.length > 0) {
                    skillsList = skillsList.concat(meta.additionalDemands);
                }

                if (skillsList) {
                    let {keywords} = await getNlpData(skillsList.join('\n'));
                    meta.generatedSkills = keywords.textrank.map(keyword => keyword.keyword);
                    meta.raw.generatedSkills = keywords.textrank;
                }

                meta.date = message.date;
                meta.chatId = message.chatId;
                meta.source.message = message;
                await db.collection('vacancies').insertOne(meta);
                console.log(`${message.id}: вакансия`);
            }
            else if (isResume) {
                let meta = await extractMetadataFromResume(text, nlpData);
                meta.date = message.date;
                meta.chatId = message.chatId;
                meta.source.message = message;
                await db.collection('cvs').insertOne(meta);
                console.log(`${message.id}: резюме`);
            }
            else {
                console.log(`${message.id}: не распознано`);
            }
        }
        catch (e) {
            console.log(`${message.id}: ошибка ${e}`);
        }
    }

    process.exit();
})();