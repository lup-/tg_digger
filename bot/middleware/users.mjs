import {getDb} from '../modules/database.mjs';

export default class UsersMiddleware {
    constructor() {
        this.users = [];
    }

    updateUser(update) {
        return this.addNewOrUpdateUser(update.user);
    }

    async addNewOrUpdateUser(incomingUser) {
        let db = await getDb();
        let user = await db.collection('users').findOne({id: incomingUser.id});
        if (user) {
            await db.collection('users').replaceOne({id: incomingUser.id}, incomingUser);
        }
        else {
            await db.collection('users').insertOne(incomingUser);
        }
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