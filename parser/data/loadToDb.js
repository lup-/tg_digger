const {getDb} = require('../../backend/modules/Database');
const readline = require('readline');
const fs = require('fs');

const inputFile = 'skills.txt';

(async () => {
    let db = await getDb('digger');

    const rl = readline.createInterface({
        input: fs.createReadStream(inputFile),
        output: false,
        console: false
    });

    for await (const skill of rl) {
        await db.collection('skills_dataset').insertOne({src: skill});
    }
})();