import Vue from 'vue';
import VueRouter from 'vue-router';

import Home from "../components/Home";
import Login from '../components/Users/Login';
import CvsView from '../components/Cvs/View';
import CvsList from '../components/Cvs/List';
import VacanciesView from '../components/Vacancies/View';
import VacanciesList from '../components/Vacancies/List';
import SkillList from "@/components/Skills/SkillList";

import store from "../store";

Vue.use(VueRouter);

const routes = [
    { name: 'home', path: '/', component: Home, meta: {requiresAuth: true, group: 'home'} },
    { name: 'login', path: '/login', component: Login },
    { name: 'cvsList', path: '/cvs/', component: CvsList, meta: {requiresAuth: true, group: 'cvsList'} },
    { name: 'cvView', path: '/cvs/:id', component: CvsView, meta: {requiresAuth: true, group: 'cvsList'} },
    { name: 'vacanciesList', path: '/vacancies/', component: VacanciesList, meta: {requiresAuth: true, group: 'vacanciesList'} },
    { name: 'vacancyView', path: '/vacancies/:id', component: VacanciesView, meta: {requiresAuth: true, group: 'vacanciesList'} },
    { name: 'skillsList', path: '/skills/', component: SkillList, meta: {requiresAuth: true, group: 'skillsList'} },
]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
});

router.beforeEach(async (to, from, next) => {
    if (to.matched.some(record => record.meta.requiresAuth)) {
        await store.dispatch('loginLocalUser');
        let isNotLoggedIn = !store.getters.isLoggedIn;
        let loginTo = {
            path: '/login',
            query: { redirect: to.fullPath }
        };

        if (isNotLoggedIn) {
            next(loginTo);
        }
        else {
            let routeGroup = to.matched && to.matched[0] ? to.matched[0].meta.group : false;

            if (routeGroup && store.getters.userHasRights(routeGroup)) {
                next();
            }
            else {
                store.commit('setErrorMessage', 'Не достаточно прав!');
                next(loginTo);
            }
        }
    }
    else {
        next();
    }
})

export {router, store};