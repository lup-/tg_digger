import Vue from 'vue';
import Vuex from 'vuex';

import scan from "./modules/scan";
import user from "./modules/user";
import telegram from "@/store/modules/telegram";

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        appError: false,
        appMessage: false,
        loading: false,
        routes: [
            {code: 'scansList', title: 'Сканирования', icon: 'mdi-magnify-scan'},
        ]
    },
    getters: {
        allowedRoutes(state, getters) {
            return state.routes.filter(route => getters.userHasRights(route));
        },
    },
    mutations: {
        setLoading(state, newLoadingState) {
            state.loading = newLoadingState;
        },
        setAppError(state, error) {
            state.appError = error;
        },
        setErrorMessage(state, text) {
            state.appMessage = {text, color: 'error'};
        },
        setSuccessMessage(state, text) {
            state.appMessage = {text, color: 'success'};
        },
        setInfoMessage(state, text) {
            state.appMessage = {text, color: 'info'};
        },
        setWarnMessage(state, text) {
            state.appMessage = {text, color: 'orange darken-2'};
        },
    },
    actions: {},
    modules: {
        scan,
        user,
        telegram,
    }
})
