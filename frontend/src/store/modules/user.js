import axios from "axios";
import moment from "moment";

const LOGIN_TTL_SECONDS = 86400;

export default {
    state: {
        list: [],
        localTried: false,
        edit: false,
        current: false,
        currentFilter: {}
    },
    getters: {
        isLoggedIn(state) {
            return state.current && state.current.id;
        },
        userHasRights(state) {
            return () => {
                return Boolean(state.current);
            }
        }
    },
    actions: {
        async loginLocalUser({commit, state, dispatch}) {
            if (state.localTried) {
                return;
            }

            await commit('setLocalTried', true);
            let savedUser = localStorage.getItem('currentUser');
            if (!savedUser) {
                return;
            }

            let user = JSON.parse(savedUser);

            let lastLogin = moment.unix(user.loggedIn);
            let secondsSinceLogin = moment().diff(lastLogin, 'seconds');
            if (secondsSinceLogin > LOGIN_TTL_SECONDS) {
                return;
            }

            let response = await axios.post(`/api/user/check`, {id: user.id});
            let isSuccess = response && response.data && response.data.success === true;
            if (isSuccess) {
                commit('setCurrentUser', response.data.user);
                dispatch('saveLoggedInUser', response.data.user);
            }
        },
        async saveLoggedInUser(_, user) {
            user.loggedIn = moment().unix();
            localStorage.setItem('currentUser', JSON.stringify(user));
        },
        async loginUser({dispatch, commit}, {login, password}) {
            try {
                let response = await axios.post(`/api/user/login`, {login, password});
                let isSuccess = response && response.data && response.data.user && response.data.user.id;
                if (isSuccess) {
                    let user = response.data.user;

                    commit('setCurrentUser', user);
                    dispatch('saveLoggedInUser', user);
                    commit('setSuccessMessage', 'Вы вошли в систему', { root: true });
                }
                else {
                    commit('setErrorMessage', 'Ошибка входа!' + (response.data.error ? ' ' + response.data.error : ''), { root: true });
                }
            }
            catch (e) {
                commit('setErrorMessage', 'Ошибка входа!', { root: true })
            }
        },
        async registerUser({dispatch, commit}, newUser) {
            try {
                let response = await axios.post(`/api/user/register`, newUser);
                let isSuccess = response && response.data && response.data.user && response.data.user.id;
                if (isSuccess) {
                    let user = response.data.user;

                    commit('setCurrentUser', user);
                    dispatch('saveLoggedInUser', user);
                    commit('setSuccessMessage', 'Вы зарегистрировались!', { root: true });
                }
                else {
                    commit('setErrorMessage', 'Ошибка регистрации!' + (response.data.error ? ' ' + response.data.error : ''), { root: true });
                }
            }
            catch (e) {
                commit('setErrorMessage', 'Ошибка регистрации!', { root: true })
            }
        },
        async logoutUser({commit}) {
            localStorage.removeItem('currentUser');
            return commit('setCurrentUser', false);
        },
    },
    mutations: {
        setCurrentUser(state, owner) {
            state.current = owner;
        },
        setFilter(state, filter) {
            state.currentFilter = filter;
        },
        setLocalTried(state, tried) {
            state.localTried = tried;
        }
    }
}