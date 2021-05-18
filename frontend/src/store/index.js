import Vue from 'vue';
import Vuex from 'vuex';

import cv from "./modules/cvs";
import vacancy from "./modules/vacancies";
import user from "./modules/user";

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        appError: false,
        appMessage: false,
        loading: false,
        routes: [
            {code: 'cvsList', title: 'Резюме', icon: 'mdi-account-hard-hat'},
            {code: 'vacanciesList', title: 'Вакансии', icon: 'mdi-briefcase'},
            {code: 'skillsList', title: 'Навыки', icon: 'mdi-hammer-screwdriver'},
            //{code: 'usersList', title: 'Пользователи админки', icon: 'mdi-account'},
        ]
    },
    getters: {
        allowedRoutes(state, getters) {
            return state.routes.filter(route => getters.userHasRights(route.code));
        }
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
    },
    actions: {},
    modules: {
        cv,
        vacancy,
        user
    }
})
