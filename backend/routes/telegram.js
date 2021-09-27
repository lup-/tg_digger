const {getDb} = require('../modules/Database');
const axios = require('axios');

const TELEGRAM_GATEWAY_URL = process.env['TELEGRAM_GATEWAY_URL']

function normalizePhone(phone) {
    if (!phone) {
        return false;
    }

    phone = phone.replace(/\D+/g, '').replace(/^\+8/, '+7');

    if (phone[0] === '8') {
        phone = '7' + phone.slice(1);
    }

    if (phone.length <= 10) {
        phone = '7'+phone;
    }

    return phone;
}

async function saveUserAuth(user, tgPhone) {
    let db = await getDb();
    let id = user && user.id;

    if (id) {
        await db.collection('users').updateOne(
            {id, deleted: {$in: [null, false]}},
            {$set: {telegram: {authPhone: tgPhone, login: true}}},
            {returnOriginal: false}
        );

        user = await db.collection('users').findOne({id, deleted: {$in: [null, false]}});
    }

    return user;
}

module.exports = {
    async connect(ctx) {
        let tgPhone = normalizePhone(ctx.request.body.phone);
        let tgPassword = ctx.request.body.password || '';

        let started = false;
        let waiting = false;
        let ready = false;
        let error = false;
        let checkReady = false;
        let user = false;

        try {
            let {data} = await axios.post(TELEGRAM_GATEWAY_URL + '/newClient', {
                phone: tgPhone,
                password: tgPassword
            });

            started = data.started;
            waiting = true;
            ready = false;
            checkReady = true;

            if (!started) {
                started = data.alreadyStarted;
                waiting = data.alreadyWaiting;
                ready = data.alreadyReady;
            }
        }
        catch (e) {
            started = false;
            error = e.toString();
        }

        if (checkReady) {
            try {
                let {data: checkData} = await axios.post(TELEGRAM_GATEWAY_URL + '/me', {phone: tgPhone});
                ready = checkData && checkData.me && checkData.me.id > 0;
                if (ready) {
                    waiting = false;
                    user = await saveUserAuth(ctx.request.body.user, tgPhone);
                }
            }
            catch (e) {
                ready = false;
                error = e.toString();
            }
        }

        ctx.body = {started, waiting, ready, error, user};
    },
    async disconnect(ctx) {
        let user = ctx.request.body.user;
        let tgPhone = user && user.telegram && user.telegram.authPhone
            ? user.telegram.authPhone
            : false;

        if (!tgPhone) {
            ctx.body = {logout: false, error: "У пользователя нет сохраненных данных входа!"}
            return;
        }

        let logout = false;
        let error = false;
        let updatedUser = false;

        try {
            let {data} = await axios.post(TELEGRAM_GATEWAY_URL + '/logout', {phone: tgPhone});
            logout = Boolean(data && data.logout);
        }
        catch (e) {
            logout = false;
            error = e.toString();
        }

        let id = user.id;
        let db = await getDb();
        await db.collection('users').updateOne(
            {id, deleted: {$in: [null, false]}},
            {$set: {telegram: {login: false}}},
            {returnOriginal: false}
        );

        updatedUser = await db.collection('users').findOne({id, deleted: {$in: [null, false]}});

        ctx.body = {logout, error, user: updatedUser};
    },
    async sendCode(ctx) {
        let tgPhone = normalizePhone(ctx.request.body.phone);
        let tgCode = ctx.request.body.code;

        let accepted = false;
        let ready = false;
        let error = false;
        let user = false;

        try {
            let {data} = await axios.post(TELEGRAM_GATEWAY_URL + '/code', {phone: tgPhone, code: tgCode});
            accepted = data && data.ok;
            if (!accepted) {
                error = data.error;
            }
        }
        catch (e) {
            accepted = false;
            ready = false;
            error = e.toString();
        }

        if (accepted) {
            try {
                let {data} = await axios.post(TELEGRAM_GATEWAY_URL + '/me', {phone: tgPhone});
                ready = data && data.me && data.me.id > 0;
            }
            catch (e) {
                ready = false;
                error = e.toString();
            }

            if (ready) {
                user = await saveUserAuth(ctx.request.body.user, tgPhone);
            }
        }

        ctx.body = {accepted, ready, error, user};
    },
    async clientStatus(ctx) {
        let tgPhone = normalizePhone(ctx.request.body.phone);
        let error = false;
        let status = false;

        if (!tgPhone) {
            ctx.body = {status: false, error: false};
            return;
        }

        try {
            let {data} = await axios.post(TELEGRAM_GATEWAY_URL + '/status', {phone: tgPhone});
            status = data.status;
        }
        catch (e) {
            status = false;
            error = e.toString();
        }

        ctx.body = {status, error};
    },
    async getMe(ctx) {
        let user = ctx.request.body.user;
        let tgPhone = user && user.telegram && user.telegram.authPhone
            ? user.telegram.authPhone
            : false;

        if (!tgPhone) {
            ctx.body = {logout: false, error: "У пользователя нет сохраненных данных входа!"}
            return;
        }

        try {
            let {data} = await axios.post(TELEGRAM_GATEWAY_URL + '/me', {phone: tgPhone});
            ctx.body = {me: data.me};

            return data;
        }
        catch (e) {
            ctx.body = {me: false};
        }
    },
    async getChats(ctx) {
        let user = ctx.request.body.user;
        let tgPhone = user && user.telegram && user.telegram.authPhone
            ? user.telegram.authPhone
            : false;

        if (!tgPhone) {
            ctx.body = {logout: false, error: "У пользователя нет сохраненных данных входа!"}
            return;
        }

        try {
            let {data} = await axios.post(TELEGRAM_GATEWAY_URL + '/listDialogs', {phone: tgPhone});
            let chats = data.dialogs.filter(dialog => dialog.is_group && dialog.is_channel && !dialog.archived);
            ctx.body = {chats};

            return data;
        }
        catch (e) {
            ctx.body = {chats: false};
        }
    },
    async getHistory(ctx) {
        let user = ctx.request.body.user;
        let historyUser = ctx.request.body.historyUser;
        let getHisoryByPhone = typeof(historyUser) === 'string' && historyUser[0] !== '@';
        if (getHisoryByPhone) {
            historyUser = normalizePhone(historyUser);
        }

        let tgPhone = user && user.telegram && user.telegram.authPhone
            ? user.telegram.authPhone
            : false;
        let history = false;
        let error = false;

        if (!tgPhone || !historyUser) {
            ctx.body = {history: false, error: "Не указаны данные пользователя для запроса переписки!"}
            return;
        }

        try {
            let {data} = await axios.post(TELEGRAM_GATEWAY_URL + '/getHistory', {
                phone: tgPhone,
                user: historyUser
            });

            history = data.history;
        }
        catch (e) {
            history = false;
            error = e.toString();
        }

        ctx.body = {history, error}
    },
    async sendMessage(ctx) {
        let user = ctx.request.body.user;
        let tgPhone = user && user.telegram && user.telegram.authPhone
            ? user.telegram.authPhone
            : false;
        let messageText = ctx.request.body.messageText;
        let messageTo = ctx.request.body.messageTo;
        let scheduleTimestamp = ctx.request.body.scheduleTimestamp || false;
        let name = ctx.request.body.messageToName;
        let firstName = null;
        let lastName = null;
        if (name) {
            if (name.indexOf(' ') !== -1) {
                [firstName, lastName] = name.split(' ');
            }
            else {
                firstName = name;
            }
        }

        if (!tgPhone) {
            ctx.body = {logout: false, error: "У пользователя нет сохраненных данных входа!"}
            return;
        }

        try {
            let {data} = await axios.post(TELEGRAM_GATEWAY_URL + '/sendMessage', {
                phone: tgPhone,
                message_text: messageText,
                message_to: messageTo,
                schedule_timestamp: scheduleTimestamp,
                contact: {first_name: firstName, last_name: lastName}
            });

            if (data.error) {
                ctx.body = {message: false, error: data.error};
            }
            else {
                ctx.body = {message: data.message};
            }
        }
        catch (e) {
            ctx.body = {message: false, error: e.toString()};
        }
    },
}