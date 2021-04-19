import {getDb} from '../modules/database.mjs';

export default class MessagesMiddleware {
    async updateNewMessage(update) {
        let db = await getDb();
        return db.collection('messages').insertOne(update.message);
    }

    async updateMessageEdited(update) {
        let incomingMessage = update.message;
        if (!incomingMessage) {
            return;
        }

        let db = await getDb();
        let message = await db.collection('messages').findOne({id: incomingMessage.id});
        if (message) {
            return db.collection('messages').replaceOne({id: incomingMessage.id}, incomingMessage);
        }
    }

    async getMessages(filter = {}) {
        let db = await getDb();
        return db.collection('messages').find(filter).toArray();
    }

    getChatMessages(searchChatId, filter = {}) {
        let finalFilter = Object.assign(filter, {chatId: searchChatId});
        return this.getMessages(finalFilter);
    }

    async addNewOrUpdateMessages(incomingMessages) {
        let db = await getDb();
        for (let incomingMessage of incomingMessages) {
            let message = await db.collection('messages').findOne({id: incomingMessage.id});
            if (message) {
                await db.collection('messages').replaceOne({id: incomingMessage.id}, incomingMessage);
            }
            else {
                await db.collection('messages').insertOne(incomingMessage);
            }
        }
    }

    async loadOneChatMessages(airgram, chat, onlyNew = true) {
        let lastMessageId = chat.lastMessage ? chat.lastMessage.id : false;
        let fromMessageId = 0;
        let messagesLoaded = false;

        do {
            const {response: messages} = await airgram.api.getChatHistory({
                chatId: chat.id,
                fromMessageId,
                offset: 0,
                limit: 10,
            });

            let chatMessages = messages.messages;
            if (chatMessages && chatMessages.length > 0) {
                await this.addNewOrUpdateMessages(chatMessages);
                let lastMessage = chatMessages[chatMessages.length-1];
                fromMessageId = lastMessage.id;

                if (onlyNew) {
                    let loadedMessageIds = chatMessages.map(message => message.id);
                    messagesLoaded = loadedMessageIds.indexOf(lastMessageId) !== -1;
                }
                else {
                    messagesLoaded = false;
                }
            }
            else {
                messagesLoaded = true;
            }
        } while (!messagesLoaded);

        return this.getChatMessages(chat.id);
    }

    async loadAllChatsMessages(airgram, chats, onlyNew = true) {
        let messages = [];
        for (const chat of chats) {
            let chatMessages = await this.loadOneChatMessages(airgram, chat, onlyNew);
            messages = messages.concat(chatMessages);
        }

        return messages;
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