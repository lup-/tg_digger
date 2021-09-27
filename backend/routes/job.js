const BeeQueue = require('bee-queue');
const queueSettings = {
    redis: {
        host: process.env.REDIS,
        port: process.env.REDIS_PORT || 6379,
    }
}

const scansQueue = new BeeQueue('scans', queueSettings);

module.exports = {
    async status(ctx) {
        let jobParams = ctx.request.body && ctx.request.body.job;
        let job = await scansQueue.getJob(jobParams.id);
        ctx.body = {job};
    }
}