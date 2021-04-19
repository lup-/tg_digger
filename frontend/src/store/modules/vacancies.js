import Crud from "./baseCrud";

const API_LIST_URL = `/api/vacancies/list`;
const API_ADD_URL = `/api/vacancies/add`;
const API_UPDATE_URL = `/api/vacancies/update`;
const API_DELETE_URL = `/api/vacancies/delete`;

const NAME_ITEMS = 'vacancies';
const NAME_ITEM = 'vacancy';

export default new Crud({
    API_LIST_URL,
    API_ADD_URL,
    API_UPDATE_URL,
    API_DELETE_URL,

    NAME_ITEMS,
    NAME_ITEM
});