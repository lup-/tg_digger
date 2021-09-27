const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const cvs = require('./routes/cvs');
const vacancies = require('./routes/vacancies');
const users = require('./routes/users');
const adminUsers = require('./routes/adminUsers');
const skills = require('./routes/skills');
const telegram = require('./routes/telegram');
const scan = require('./routes/scan');
const job = require('./routes/job');

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
    .post('/api/user/update', users.update.bind(users))
    .post('/api/user/check', users.check.bind(users))
    .post('/api/user/login', users.login.bind(users))
    .post('/api/user/register', users.register.bind(users));

router
    .post('/api/admin/user/list', adminUsers.list.bind(adminUsers))
    .post('/api/admin/user/add', adminUsers.add.bind(adminUsers))
    .post('/api/admin/user/update', adminUsers.update.bind(adminUsers))
    .post('/api/admin/user/delete', adminUsers.delete.bind(adminUsers))
    .post('/api/admin/user/check', adminUsers.check.bind(adminUsers))
    .post('/api/admin/user/login', adminUsers.login.bind(adminUsers));

router
    .post('/api/skills/listRaw', skills.listRaw.bind(skills))
    .post('/api/skills/listSkills', skills.listSkills.bind(skills))
    .post('/api/skills/listGroups', skills.listGroups.bind(skills))
    .post('/api/skills/update', skills.update.bind(skills))
    .post('/api/skills/delete', skills.delete.bind(skills))
    .post('/api/skills/complete', skills.complete.bind(skills));

router
    .post('/api/telegram/connect', telegram.connect.bind(telegram))
    .post('/api/telegram/disconnect', telegram.disconnect.bind(telegram))
    .post('/api/telegram/sendCode', telegram.sendCode.bind(telegram))
    .post('/api/telegram/getMe', telegram.getMe.bind(telegram))
    .post('/api/telegram/getChats', telegram.getChats.bind(telegram))
    .post('/api/telegram/getHistory', telegram.getHistory.bind(telegram))
    .post('/api/telegram/clientStatus', telegram.clientStatus.bind(telegram))
    .post('/api/telegram/sendMessage', telegram.sendMessage.bind(telegram));

router
    .post('/api/scan/list', scan.list.bind(scan))
    .post('/api/scan/details', scan.details.bind(scan))
    .post('/api/scan/add', scan.add.bind(scan))
    .post('/api/scan/update', scan.update.bind(scan))
    .post('/api/scan/delete', scan.delete.bind(scan));

router
    .post('/api/job/status', job.status.bind(job));

app
    .use(bodyParser({
        formLimit: '50mb',
        jsonLimit: '1mb',
    }))
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(PORT, HOST);