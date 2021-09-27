import axios from "axios";

export default {
    namespaced: true,
    state: {
        started: false,
        waiting: false,
        ready: false,
        me: false,
    },
    getters: {
        isReady(state) {
            return state.status && state.status.ready;
        },
        getHistory(state, getters, rootState) {
            return async (historyUser) => {
                let user = rootState.user.current;
                let {data} = await axios.post('/api/telegram/getHistory', {user, historyUser});
                return data.history;
            }
        },
        getChats(state, getters, rootState) {
            return async () => {
                let user = rootState.user.current;
                let {data} = await axios.post('/api/telegram/getChats', {user});
                return data.chats;
            }
        },
        normalizePhone() {
            return (phone) => {
                if (!phone) {
                    return phone;
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
        }
    },
    actions: {
        async refreshClient({commit, rootState}, params = {}) {
            let {forceRefresh = false} = params;
            let user = rootState.user.current;
            let hasSavedTgData = user && user.telegram && user.telegram.authPhone;
            let tryToLogin = hasSavedTgData && user.telegram.login;
            let ok = true;

            if (tryToLogin || forceRefresh) {
                try {
                    let {data} = await axios.post('/api/telegram/clientStatus', {
                        phone: user.telegram.authPhone
                    });

                    if (data.status === 'offline') {
                        let {data} = await axios.post('/api/telegram/connect', {
                            phone: user.telegram.authPhone,
                            password: ''
                        });

                        return commit('setStatus', data);
                    }

                    if (data.status === 'waiting') {
                        return commit('setStatus', {
                            started: true,
                            waiting: true,
                        });
                    }

                    if (data.status === 'online') {
                        return commit('setStatus', {
                            started: true,
                            waiting: false,
                            ready: true
                        });
                    }
                }
                catch (e) {
                    ok = false;
                }
            }

            return ok;
        },
        async newClient({commit, rootState}, {phone, password}) {
            let error = false;
            let user = rootState.user.current;

            try {
                let {data} = await axios.post('/api/telegram/connect', {user, phone, password});
                await commit('setStatus', data);
                if (data.error) {
                    error = data.error;
                }
                else if (data.user) {
                    commit('setCurrentUser', data.user, { root: true });
                }

                if (data.ready) {
                    commit('setSuccessMessage', 'Telegram успешно подключен!', { root: true });
                }
            }
            catch (e) {
                error = e.toString();
            }

            if (error) {
                commit('setErrorMessage', 'Ошибка подключения! ' + error, { root: true });
            }
        },
        async sendCode({commit, rootState}, {phone, code}) {
            let error = false;
            let user = rootState.user.current;

            try {
                let {data} = await axios.post('/api/telegram/sendCode', {user, phone, code});
                await commit('setStatus', data);
                if (data.error) {
                    error = data.error;
                }
                else if (data.user) {
                    commit('setCurrentUser', data.user, { root: true });
                }

                await commit('setStatus', {
                    waiting: !data.accepted,
                    ready: data.ready
                });

                if (data.ready) {
                    commit('setSuccessMessage', 'Telegram успешно подключен!', { root: true });
                }
            }
            catch (e) {
                error = e.toString();
            }

            if (error) {
                if (error !== 'Неверно указан код') {
                    await commit('setStatus', {started: false, waiting: false});
                }
                commit('setErrorMessage', 'Ошибка отправки кода! ' + error, { root: true });
            }
        },
        async loadMe({state, commit, rootState}) {
            if (state && state.me) {
                return;
            }

            let user = rootState.user.current;
            let {data} = await axios.post('/api/telegram/getMe', {user});
            if (data && data.me) {
                commit('setMe', data.me);
            }
        },

        async logout({commit, rootState}) {
            let user = rootState.user.current;
            let error = false;
            try {
                let {data} = await axios.post('/api/telegram/disconnect', {user});
                if (data.logout) {
                    await commit('setStatus', {
                        started: false,
                        waiting: false,
                        ready: false,
                    });

                    commit('setSuccessMessage', 'Telegram успешно отключен!', { root: true });
                }

                if (data.error) {
                    error = data.error;
                }
                else if (data.user) {
                    commit('setCurrentUser', data.user, { root: true });
                }
            }
            catch (e) {
                error = e.toString();
            }

            if (error) {
                commit('setErrorMessage', 'Ошибка выхода! ' + error, { root: true });
            }
        },
        async sendMessage({commit, rootState}, {messageTo, messageText, scheduleTimestamp = false, messageToName = false}) {
            let user = rootState.user.current;
            let error = false;

            try {
                let {data} = await axios.post('/api/telegram/sendMessage', {user, messageTo, messageText, scheduleTimestamp, messageToName});
                if (data.message) {
                    commit('setSuccessMessage', 'Сообщение отправлено!', { root: true });
                }

                if (data.error) {
                    error = data.error;
                }
            }
            catch (e) {
                error = e.toString();
            }

            if (error) {
                commit('setErrorMessage', 'Ошибка отправки сообщения! ' + error, { root: true });
            }
        }
    },
    mutations: {
        setStatus(state, newStatus) {
            if (newStatus) {
                if (typeof (newStatus['started']) !== 'undefined') {
                    state.started = newStatus.started;
                }

                if (typeof (newStatus['waiting']) !== 'undefined') {
                    state.waiting = newStatus.waiting;
                }

                if (typeof (newStatus['ready']) !== 'undefined') {
                    state.ready = newStatus.ready;
                }
            }
        },
        setMe(state, newMe) {
            state.me = newMe;
        }
    }
}