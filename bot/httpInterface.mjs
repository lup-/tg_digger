import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import {toObject} from "airgram";

function catchErrors(thisArg, route) {
    return (ctx) => {
        try {
            return route.call(thisArg, ctx);
        }
        catch (e) {
            ctx.body = {error: e}
        }
    };
}

export default class HttpInterface {
    constructor(airgram, middlewares) {
        this.airgram = airgram;
        this.middlewares = middlewares;
        this.onCodeRecieve = false;

        const router = new Router();
        router.post('/code', catchErrors(this, this.code.bind) );
        router.get( '/me', catchErrors(this, this.me) );
        router.get( '/chats/load', catchErrors(this, this.loadChats) );
        router.get( '/chats/get', catchErrors(this, this.getChats) );
        router.get( '/messages/load/allChats', catchErrors(this, this.loadAllMessages));
        router.get( '/messages/load/oneChat/:chatId', catchErrors(this, this.loadChatMessages) );
        router.get( '/messages/get/:chatId', catchErrors(this, this.getMessages));
        router.post( '/messages/get/:chatId', catchErrors(this, this.getMessages));

        this.httpIO = new Koa();
        this.httpIO.use(bodyParser()).use(router.routes()).use(router.allowedMethods());
    }

    setCodeRecieveHandler(callback) {
        this.onCodeRecieve = callback;
    }

    async code(ctx) {
        if (this.onCodeRecieve) {
            ctx.body = {ok: true};
            let code = ctx.request.rawBody;
            return this.onCodeRecieve(code);
        }

        ctx.body = {ok: false};
    }

    async me(ctx) {
        const me = toObject(await this.airgram.api.getMe());
        ctx.body = {me};
    }

    async loadChats(ctx) {
        let chats = await this.middlewares.chats.loadChats(this.airgram);
        ctx.body = {chats};
    }

    async getChats(ctx) {
        let chats = await this.middlewares.chats.getSubscribedChats();
        ctx.body = {chats};
    }

    async loadChatMessages(ctx) {
        let chatId = parseInt(ctx.params.chatId);
        let onlyNew = ctx.request.query && ctx.request.query.onlyNew
            ? ctx.request.query.onlyNew === "1"
            : true;
        let chat = await this.middlewares.chats.getChat(chatId);
        let messages = await this.middlewares.messages.loadOneChatMessages(this.airgram, chat, onlyNew);
        ctx.body = {messages: messages.length}
    }

    async loadAllMessages(ctx) {
        let onlyNew = ctx.request.query && ctx.request.query.onlyNew
            ? ctx.request.query.onlyNew === "1"
            : true;
        let chats = await this.middlewares.chats.getChats();
        let messages = await this.middlewares.messages.loadAllChatsMessages(this.airgram, chats, onlyNew);
        ctx.body = {chats: chats.length, messages: messages.length}
    }

    async getMessages(ctx) {
        let chatId = ctx.params.chatId ? parseInt(ctx.params.chatId) : false;
        let filter = ctx.request.body || {};
        let chats = chatId
            ? await this.middlewares.messages.getChatMessages(chatId, filter)
            : await this.middlewares.messages.getMessages(filter);

        ctx.body = {chats};
    }

    launch() {
        return this.httpIO.listen(3000, '0.0.0.0');
    }
}
