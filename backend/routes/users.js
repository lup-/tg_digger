const shortid = require('shortid');
const crypto = require('crypto');
const moment = require('moment');
const {getDb} = require('../modules/Database');

function md5(string) {
    return crypto.createHash('md5').update(string).digest("hex");
}

module.exports = {
    async list(ctx) {
        let filter = ctx.request.body && ctx.request.body.filter
            ? ctx.request.body.filter || {}
            : {};

        let defaultFilter = {
            'deleted': {$in: [null, false]}
        };

        filter = Object.assign(defaultFilter, filter);

        let db = await getDb();
        let users = await db.collection('users').find(filter).toArray();
        ctx.body = {users};
    },
    async add(ctx) {
        let db = await getDb();
        let userData = ctx.request.body.user;

        userData.id = shortid.generate();
        userData.registered = moment().unix();
        userData.passwordHash = md5(userData.password);
        delete userData.password;

        let result = await db.collection('users').insertOne(userData);
        let user = result.ops[0];
        if (user.passwordHash) {
            delete user.passwordHash;
        }

        ctx.body = { user };
    },
    async update(ctx) {
        let db = await getDb();
        let userData = ctx.request.body.user;
        let id = userData.id;

        if (!id) {
            ctx.body = { user: false };
            return;
        }

        if (userData._id) {
            delete userData._id;
        }

        if (userData.password) {
            userData.passwordHash = md5(userData.password);
            delete userData.password;
        }

        let updateResult = await db.collection('users').findOneAndReplace({id, deleted: {$in: [null, false]}}, userData, {returnOriginal: false});
        let user = updateResult.value || false;
        if (user.passwordHash) {
            delete user.passwordHash;
        }

        ctx.body = { user };
    },
    async login(ctx) {
        let login = ctx.request.body.login;
        let passwordHash = md5(ctx.request.body.password);

        let db = await getDb();
        let user = await db.collection('users').findOne({login, passwordHash, deleted: {$in: [null, false]}});
        let isLoaded = Boolean(user);

        if (isLoaded) {
            delete user.passwordHash;
        }

        ctx.body = {
            user,
            error: isLoaded ? false : 'Логин или пароль не подходят',
        };
    },
    async check(ctx) {
        let id = ctx.request.body.id;

        let db = await getDb();
        let user = await db.collection('users').findOne({ id, deleted: {$in: [null, false]} });
        if (user && user.passwordHash) {
            delete user.passwordHash;
        }
        ctx.body = {success: Boolean(user), user};
    },
    async delete(ctx) {
        let userData = ctx.request.body.user;
        let id = userData.id;

        let db = await getDb();
        let deleted = moment().unix();
        let updateResult = await db.collection('users').findOneAndUpdate({id}, {$set: {deleted}}, {returnOriginal: false});
        let user = updateResult.value || false;
        if (user.passwordHash) {
            delete user.passwordHash;
        }

        ctx.body = { user };
    },
    async register(ctx) {
        let login = ctx.request.body.login;
        let passwordHash = md5(ctx.request.body.password);
        let fullName = ctx.request.body.name;
        let [firstName, familyName] = fullName.split(' ');

        let emailHash = md5( login.toLowerCase() );
        let gravatarUrl = "https://www.gravatar.com/avatar/"+emailHash+".jpg?d=identicon";

        let userData = {
            id : shortid(),
            registered: moment().unix(),
            fullName,
            firstName,
            familyName,
            imageUrl: gravatarUrl,
            login,
            passwordHash,
        };

        let db = await getDb();
        let existingUser = await db.collection('users').findOne({ login });
        if (existingUser) {
            ctx.body = {
                user: false,
                error: 'Пользователь с такой электропочтой уже зарегистрирован'
            };
        }
        else {
            let insertResult = await db.collection('users').insertOne(userData);
            let userRecord = insertResult.ops[0] || false;
            delete userRecord.passwordHash;

            ctx.body = {
                user: userRecord,
                error: false
            };
        }
    }
}