const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const cvs = require('./routes/cvs');
const vacancies = require('./routes/vacancies');
const users = require('./routes/users');

const PORT = 3000;
const HOST = '0.0.0.0';

const app = new Koa();
const router = new Router();

router
    .post('/api/cvs/list', cvs.list.bind(cvs))
    .post('/api/cvs/add', cvs.add.bind(cvs))
    .post('/api/cvs/update', cvs.update.bind(cvs))
    .post('/api/cvs/delete', cvs.delete.bind(cvs))
    .post('/api/cvs/keywords', cvs.keywords.bind(cvs))
    .post('/api/cvs/cities', cvs.cities.bind(cvs));

router
    .post('/api/vacancies/list', vacancies.list.bind(vacancies))
    .post('/api/vacancies/add', vacancies.add.bind(vacancies))
    .post('/api/vacancies/update', vacancies.update.bind(vacancies))
    .post('/api/vacancies/delete', vacancies.delete.bind(vacancies))
    .post('/api/vacancies/keywords', vacancies.keywords.bind(vacancies))
    .post('/api/vacancies/cities', vacancies.cities.bind(vacancies));

router
    .post('/api/user/list', users.list.bind(users))
    .post('/api/user/add', users.add.bind(users))
    .post('/api/user/update', users.update.bind(users))
    .post('/api/user/delete', users.delete.bind(users))
    .post('/api/user/check', users.check.bind(users))
    .post('/api/user/login', users.login.bind(users));

app
    .use(bodyParser({
        formLimit: '50mb',
        jsonLimit: '1mb',
    }))
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(PORT, HOST);