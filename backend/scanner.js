const BeeQueue = require('bee-queue');
const {getDb} = require('./modules/Database');
const axios = require("axios");
const moment = require("moment");
const Scanner = require("./modules/Scanner");

const TELEGRAM_GATEWAY_URL = process.env.TELEGRAM_GATEWAY_URL;
const MAX_ERRORS_COUNT = 10;
const queueSettings = {
    redis: {
        host: process.env.REDIS,
        port: process.env.REDIS_PORT || 6379,
    }
}

const scansQueue = new BeeQueue('scans', queueSettings);

function messageIdInArray(id, messages) {
    return messages.findIndex(message => message.id === id) !== -1;
}

scansQueue.process(async (job) => {
    let {scan, user, tgPhone: phone} = job.data;
    let chats = scan.chats;
    let depth = scan.scanDepth;
    let scanToDate = moment().endOf('d').subtract(1, depth);

    let db = await getDb();
    await db.collection('scans').updateOne({id: scan.id}, {$set: {started: scanToDate.unix(), status: 'loading'}});

    let dbUsers = await db.collection('scan_users').find({userId: user.id}).toArray();

    for (let chat of chats) {
        let dbMessages = await db.collection('scan_messages').find({chatId: chat.id, userId: user.id}).sort({id: -1}).toArray();

        let newestSavedMessage = dbMessages[0] || null;
        let oldestSavedMessage = dbMessages[dbMessages.length-1] || null;
        let needToScanOldMessages = !oldestSavedMessage;
        if (oldestSavedMessage) {
            let oldestMessageDate = moment(oldestSavedMessage.date);
            needToScanOldMessages = oldestMessageDate.isAfter(scanToDate);
        }

        let fromMessageId = 0;

        let messagesToSave = [];
        let usersToSave = [];
        let newChatHistoryMessages = [];
        let oldChatHistoryMessages = [];
        let newChatHistoryUsers = [];
        let oldChatHistoryUsers = [];

        let errorsCount = 0;

        if (newestSavedMessage) {
            let newestSavedMessageNotFound = true;
            let hasNewMessages = true;

            while (newestSavedMessageNotFound && hasNewMessages && errorsCount < MAX_ERRORS_COUNT) {
                try {
                    let {data} = await axios.post(TELEGRAM_GATEWAY_URL + '/getHistory', {
                        phone,
                        peer: chat.id,
                        from_message_id: fromMessageId
                    });

                    let history = data.history;
                    let loadedMessagesIds = newChatHistoryMessages.map(message => message.id);
                    let newLoadedMessages = history.messages.filter(message => loadedMessagesIds.indexOf(message.id) === -1);
                    hasNewMessages = newLoadedMessages && newLoadedMessages.length > 0;

                    if (hasNewMessages) {
                        newChatHistoryMessages = newChatHistoryMessages.concat(newLoadedMessages);
                        newChatHistoryUsers = newChatHistoryUsers.concat(history.users)

                        newChatHistoryMessages.sort((a, b) => b.id - a.id);

                        newestSavedMessageNotFound = !messageIdInArray(newestSavedMessage.id, newChatHistoryMessages);
                        let lastLoadedMessage = newChatHistoryMessages[newChatHistoryMessages.length - 1];
                        fromMessageId = lastLoadedMessage.id;
                    }
                }
                catch (e) {
                    errorsCount += 1;
                }
            }

            let newestSavedMessageIndex = newChatHistoryMessages.findIndex(message => message.id === newestSavedMessage.id);
            newChatHistoryMessages = newChatHistoryMessages.slice(0, newestSavedMessageIndex);
            messagesToSave = messagesToSave.concat(newChatHistoryMessages);
        }

        if (needToScanOldMessages) {
            if (oldestSavedMessage) {
                fromMessageId = oldestSavedMessage.id;
            }

            errorsCount = 0;
            let scanDateNotReached = true;
            let hasNewMessages = true;
            while (scanDateNotReached && hasNewMessages && errorsCount < MAX_ERRORS_COUNT) {
                try {
                    let {data} = await axios.post(TELEGRAM_GATEWAY_URL + '/getHistory', {
                        phone,
                        peer: chat.id,
                        from_message_id: fromMessageId
                    });

                    if (!data.error) {
                        let history = data.history;
                        let loadedMessagesIds = oldChatHistoryMessages.map(message => message.id);
                        let newLoadedMessages = history.messages.filter(message => loadedMessagesIds.indexOf(message.id) === -1);
                        hasNewMessages = newLoadedMessages && newLoadedMessages.length > 0;

                        if (hasNewMessages) {
                            oldChatHistoryMessages = oldChatHistoryMessages.concat(history.messages);
                            oldChatHistoryUsers = oldChatHistoryUsers.concat(history.users)

                            oldChatHistoryMessages.sort((a, b) => b.id - a.id);

                            let lastLoadedMessage = oldChatHistoryMessages[oldChatHistoryMessages.length - 1];
                            let lastMessageDate = moment(lastLoadedMessage.date);
                            scanDateNotReached = lastMessageDate.isSameOrAfter(scanToDate);
                            fromMessageId = lastLoadedMessage.id;
                        }
                    }
                    else {
                        errorsCount += 1;
                    }
                }
                catch (e) {
                    errorsCount += 1;
                }
            }

            messagesToSave = messagesToSave.concat(oldChatHistoryMessages);
            usersToSave = usersToSave.concat(oldChatHistoryUsers);
        }

        if (messagesToSave.length > 0) {
            messagesToSave = messagesToSave.map(message => {
                message.chatId = chat.id;
                message.userId = user.id;
                message.scanId = scan.id;
                return message;
            });

            if (messagesToSave.length > 0) {
                await db.collection('scan_messages').insertMany(messagesToSave);
            }
        }

        if (usersToSave) {
            usersToSave = usersToSave
                .filter(candidateUser => {
                    return dbUsers.findIndex(dbUser => dbUser.id === candidateUser.id) === -1;
                })
                .map(saveUser => {
                    saveUser.chatId = chat.id;
                    saveUser.userId = user.id;
                    saveUser.scanId = scan.id;
                    return saveUser;
                });

            if (usersToSave.length > 0) {
                await db.collection('scan_users').insertMany(usersToSave);
            }
        }
    }

    await db.collection('scans').updateOne({id: scan.id}, {$set: {status: 'processing'}});

    let chatIds = chats.map(chat => chat.id);
    let messagesToScan = await db.collection('scan_messages').find({chatId: {$in: chatIds}, userId: user.id}).sort({id: -1}).toArray();
    messagesToScan = messagesToScan.filter(message => moment(message.date).isSameOrAfter(scanToDate));

    let scanner = new Scanner(scan);
    let results = await scanner.scanMessages(messagesToScan);
    let resultUserIds = results.map(stats => stats.user.user_id);
    let scanUsers = await db.collection('scan_users').find({id: {$in: resultUserIds}, userId: user.id}).toArray();

    let resultsWithFullUsers = results.map(stats => {
        let userId = stats.user.user_id;
        let scanUser = scanUsers.find(scanUser => scanUser.id === userId);
        stats.scanUser = scanUser ? scanUser : null;
        stats.scanId = scan.id;

        return stats;
    });

    await db.collection('scans').updateOne({id: scan.id}, {$set: {finished: moment().unix(), status: 'finished'}});
    await db.collection('scan_results').insertMany(resultsWithFullUsers);
});

scansQueue.on('error', async err => {
    console.log(`Error: ${err.message}`);

    let db = await getDb();
    await db.collection('scan_errors').insertOne({time: moment().unix(), error: err});
});