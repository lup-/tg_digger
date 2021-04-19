const fs = require('fs');
const axios = require('axios');
const startId = process.argv[2] ? parseInt(process.argv[2]) : 1;

async function fetchSkills(startId) {
    try {
        let url = `https://api.hh.ru/skills`;
        let query = Array(50)
            .fill(0)
            .map((item, index) => index + startId)
            .map(id => `id=${id}`)
            .join('&');

        let {data} = await axios.get(`${url}?${query}`);
        return data;
    }
    catch (e) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        return fetchSkills(startId);
    }
}
async function getSkillsFromHH(startId = 1) {
    let skills = [];
    let hasNewSkills = false;

    do {
        console.log(startId);
        let data = await fetchSkills(startId);
        let newSkills = data.items;
        hasNewSkills = newSkills && newSkills.length > 0;
        if (hasNewSkills) {
            let skillNames = newSkills.map(skill => skill.text);
            fs.appendFileSync('skills.txt', skillNames.join('\n')+'\n');
            skills = skills.concat( skillNames );
            startId += 50;
        }
    } while (hasNewSkills);
}

(async () => {
    await getSkillsFromHH(startId);
})();