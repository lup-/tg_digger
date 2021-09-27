import Crud from "./baseCrud";

const API_LIST_URL = `/api/cvs/list`;
const API_ADD_URL = `/api/cvs/add`;
const API_UPDATE_URL = `/api/cvs/update`;
const API_DELETE_URL = `/api/cvs/delete`;

const NAME_ITEMS = 'cvs';
const NAME_ITEM = 'cv';

export default new Crud({
    API_LIST_URL,
    API_ADD_URL,
    API_UPDATE_URL,
    API_DELETE_URL,

    NAME_ITEMS,
    NAME_ITEM
});