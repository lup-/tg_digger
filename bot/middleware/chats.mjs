import {getDb} from '../modules/database.mjs';

const MAX_CHAT_POSITION = "9223372036854775807";

export default class ChatsMiddleware {
    constructor() {
        this.chats = [];
        this.waitChats = [];
        this.collectedProps = ['chat', 'notificationSettings', 'lastMessage', 'chatReadInbox', 'position'];
    }

    triggerChatWait(targetChatId, propName) {
        let waitResolvers = this.waitChats.find(chat => chat.id === targetChatId);
        let hasNeededPromise = waitResolvers && typeof (waitResolvers[propName]) === "function";
        if (hasNeededPromise) {
            return waitResolvers[propName]();
        }
    }

    async addOrUpdateChat(targetChatId, propName, value) {
        let db = await getDb();
        let chat = await db.collection('chats').findOne({id: targetChatId});
        if (chat) {
            let setFields = {};
            setFields[propName] = value;
            await db.collection('chats').updateOne({id: targetChatId}, {$set: setFields});
        }
        else {
            let newChat = {id: targetChatId};
            newChat[propName] = value;
            await db.collection('chats').insertOne(newChat);
        }
        this.triggerChatWait(targetChatId, propName);
    }

    async updateNewChat(update) {
        return this.addOrUpdateChat(update.chat.id, 'chat', update.chat);
    }

    async updateChatNotificationSettings(update) {
        return this.addOrUpdateChat(update.chatId, 'notificationSettings', update.notificationSettings);
    }

    async updateChatLastMessage(update) {
        return this.addOrUpdateChat(update.chatId, 'lastMessage', update.lastMessage);
    }

    async updateChatReadInbox(update) {
        return this.addOrUpdateChat(update.chatId, 'chatReadInbox', update);
    }

    async updateChatPosition(update) {
        return this.addOrUpdateChat(update.chatId, 'position', update.position);
    }

    async whenChatReady(targetChatId) {
        let waitForProps = this.collectedProps;
        let chat = await this.getChat(targetChatId);
        if (chat) {
            waitForProps = waitForProps.filter(propName => typeof(chat[propName]) === 'undefined');
        }

        let propPromises = [];
        let namedPropResolvers = {id: targetChatId};

        for (const propName of waitForProps) {
            let propPromise = new Promise(resolve => {
                namedPropResolvers[propName] = resolve;
            });
            propPromises.push(propPromise);
        }

        return propPromises.length > 0 ? Promise.all(propPromises) : null;
    }

    whenManyChatsReady(chatIds) {
        return Promise.all(chatIds.map(chatId => this.whenChatReady(chatId)));
    }

    async getChats(filter = {}) {
        let db = await getDb();
        return db.collection('chats').find(filter).toArray();
    }

    getSubscribedChats() {
        return this.getChats({chat: {$nin: [false, null]}});
    }

    async getChat(searchId) {
        let db = await getDb();
        return db.collection('chats').findOne({id: searchId});
    }

    async loadChats(airgram) {
        let allChatsLoaded = false;
        let offsetChatId = 0;
        let offsetOrder = MAX_CHAT_POSITION;
        do {
            const {response: chats} = await airgram.api.getChats({
                limit: 10,
                offsetChatId,
                offsetOrder
            });

            let newChatIds = chats.chatIds;
            allChatsLoaded = newChatIds.length === 0;
            if (!allChatsLoaded) {
                await this.whenManyChatsReady(newChatIds);
                let lastChatId = chats.chatIds[chats.chatIds.length - 1];
                let lastChat = await this.getChat(lastChatId);
                offsetChatId = lastChatId;
                offsetOrder = lastChat.position.order;
            }
        } while (!allChatsLoaded);

        return this.getChats();
    }

    middleware() {
        return async (ctx, next) => {
            if ('update' in ctx) {
                let updateType = ctx._;
                if (typeof(this[updateType]) === "function") {
                    await this[updateType](ctx.update);
                }
            }
            
            return next();
        }
    }
}