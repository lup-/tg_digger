import Crud from "./baseCrud";

const API_LIST_URL = `/api/scan/list`;
const API_ADD_URL = `/api/scan/add`;
const API_UPDATE_URL = `/api/scan/update`;
const API_DELETE_URL = `/api/scan/delete`;

const NAME_ITEMS = 'scans';
const NAME_ITEM = 'scan';

import axios from "axios";

const POLL_INTERVAL_MS = 5000;

async function waitForJobEnd(job, commit) {
    return new Promise(resolve => {
        let intervalId;
        intervalId = setInterval(async () => {
            let {data} = await axios.post('/api/job/status', {job});
            if (data && data.job) {
                if (data.job.status === 'succeeded') {
                    clearInterval(intervalId);
                    commit('setSuccessMessage', 'Задача выполнена!', { root: true });
                    commit('removeJob', job);
                    resolve(job);
                }
                else if (data.job.status === 'failed') {
                    clearInterval(intervalId);
                    commit('setErrorMessage', 'Ошибка выполнения задачи!', { root: true });
                    commit('removeJob', job);
                    resolve(job);
                }
            }
        }, POLL_INTERVAL_MS);

    });
}

export default new Crud({
    API_LIST_URL,
    API_ADD_URL,
    API_UPDATE_URL,
    API_DELETE_URL,

    NAME_ITEMS,
    NAME_ITEM
}, {
    state: {
        activeScan: null,
        cards: [],
        totalCards: 0,
    },
    actions: {
        async newItem({dispatch, state, commit, rootState}, item) {
            if (!API_ADD_URL) {
                return;
            }

            let user = rootState.user.current;
            let query = {};
            query[NAME_ITEM] = item;
            query['user'] = user;

            let response = await axios.post(API_ADD_URL, query);
            let isSuccess = response && response.data && response.data[NAME_ITEM] && response.data[NAME_ITEM].id;
            if (isSuccess) {
                commit('setSuccessMessage', 'Данные сохранены!', { root: true });
            }
            else {
                commit('setErrorMessage', 'Ошибка сохранения данных!', { root: true });
            }

            await dispatch('loadItems', state.currentParams);

            let createdJob = response && response.data && response.data.job;
            return createdJob ? waitForJobEnd(createdJob, commit) : false;
        },
        async loadDetails({commit, rootState}, inputParams) {
            let {scanId = null, filter = {}, limit = 15, offset = 0, sort = {}} = {...inputParams};

            if (!API_LIST_URL) {
                return;
            }

            let user = rootState.user.current;
            let response = await axios.post('/api/scan/details', {scanId, filter, limit, offset, sort, user});
            await commit('setActiveScan', response.data.scan);
            await commit('setTotalCount', response.data.totalCount);
            return commit('setCards', response.data.cards);
        },
    },
    mutations: {
        setActiveScan(state, activeScan) {
            state.activeScan = activeScan;
        },
        setCards(state, cards) {
            state.cards = cards;
        },
        setTotalCount(state, totalCount) {
            state.totalCount = totalCount;
        }
    }
});