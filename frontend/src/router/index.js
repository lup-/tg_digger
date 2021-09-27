import Vue from 'vue';
import VueRouter from 'vue-router';

import Login from '../components/Users/Login';
import Register from '../components/Users/Register';

import Home from "@/components/Home";
import ScansList from "@/components/Scans/ScansList";
import ScanDetails from "@/components/Scans/ScanDetails";
import Settings from "@/components/Settings";

import store from "../store";

Vue.use(VueRouter);

const routes = [
    { name: 'home', path: '/', component: Home, meta: {requiresAuth: true} },
    { name: 'login', path: '/login', component: Login },
    { name: 'register', path: '/register', component: Register },
    { name: 'scansList', path: '/scans', component: ScansList, meta: {requiresAuth: true}},
    { name: 'scanDetails', path: '/scans/:id', component: ScanDetails, meta: {requiresAuth: true} },
    { name: 'settings', path: '/settings', component: Settings, meta: {requiresAuth: true}},
];

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
            let mainMatchedRoute = to.matched[0].meta;

            if (mainMatchedRoute && store.getters.userHasRights(mainMatchedRoute)) {
                await store.dispatch('telegram/refreshClient');
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
