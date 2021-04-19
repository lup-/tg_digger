import { Airgram, Auth } from 'airgram'
import ChatsMiddleware from './middleware/chats.mjs'
import MessagesMiddleware from './middleware/messages.mjs'
import HttpInterface from "./httpInterface.mjs";
import UsersMiddleware from "./middleware/users.mjs";

const chats = new ChatsMiddleware();
const messages = new MessagesMiddleware();
const users = new UsersMiddleware();
const airgram = new Airgram({
    apiId: process.env.API_ID,
    apiHash: process.env.API_HASH,
    command: process.env.TDJSONLIB_PATH,
    logVerbosityLevel: 0,
});
const httpIO = new HttpInterface(airgram, {chats, messages});

airgram.use(new Auth({
    code: () => {
        return new Promise(resolve => {
            httpIO.setCodeRecieveHandler(resolve);
        });
    },
    phoneNumber: () => process.env.AUTH_PHONE
}));
airgram.use(chats);
airgram.use(messages);
airgram.use(users);

airgram.use((ctx, next) => {
    if ('update' in ctx) {
        //console.log(`[all updates][${ctx._}]`);
    }
    return next()
});

httpIO.launch();
