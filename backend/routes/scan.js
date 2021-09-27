const BeeQueue = require('bee-queue');
const {getDb} = require('../modules/Database');
const shortid = require('shortid');
const moment = require('moment');

const queueSettings = {
    redis: {
        host: process.env.REDIS,
        port: process.env.REDIS_PORT || 6379,
    }
}

const scanQueue = new BeeQueue('scans', queueSettings);

const COLLECTION_NAME = 'scans';
const ITEM_NAME = 'scan';
const ITEMS_NAME = 'scans';

module.exports = {
    async list(ctx) {
        let inputFilter = ctx.request.body && ctx.request.body.filter
            ? ctx.request.body.filter || {}
            : {};
        let sort = ctx.request.body && ctx.request.body.sort
            ? ctx.request.body.sort || {}
            : {};

        let limit = ctx.request.body.limit ? parseInt(ctx.request.body.limit) : null;
        let offset = ctx.request.body.offset ? parseInt(ctx.request.body.offset) : 0;

        let defaultFilter = {
            'deleted': {$in: [null, false]}
        };

        let filter = Object.assign(defaultFilter, {});
        for (let field in inputFilter) {
            let value = inputFilter[field];
            if (value instanceof Array) {
                filter[field] = {$in: value}
            }
            else {
                filter[field] = value;
            }
        }

        let db = await getDb();
        let cursor = db.collection(COLLECTION_NAME)
            .find(filter)
            .sort(sort)
            .skip(offset);

        if (limit !== -1) {
            cursor = cursor.limit(limit);
        }

        let items = await cursor.toArray();

        let totalCount = await db.collection(COLLECTION_NAME).countDocuments(filter);

        let response = {};
        response[ITEMS_NAME] = items;
        response['totalCount'] = totalCount;

        ctx.body = response;
    },
    async details(ctx) {
        let scanId = ctx.request.body && ctx.request.body.scanId
            ? ctx.request.body.scanId
            : null;

        if (!scanId) {
            ctx.body = {scan: null};
            return;
        }

        let inputFilter = ctx.request.body && ctx.request.body.filter
            ? ctx.request.body.filter || {}
            : {};
        let sort = ctx.request.body && ctx.request.body.sort
            ? ctx.request.body.sort || {}
            : {};

        let limit = ctx.request.body.limit ? parseInt(ctx.request.body.limit) : null;
        let offset = ctx.request.body.offset ? parseInt(ctx.request.body.offset) : 0;

        let defaultFilter = {
            scanId,
            'scanUser.deleted': {$in: [null, false]},
            'deleted': {$in: [null, false]}
        };

        let filter = Object.assign(defaultFilter, {});
        for (let field in inputFilter) {
            let value = inputFilter[field];
            if (value instanceof Array) {
                filter[field] = {$in: value}
            }
            else {
                filter[field] = value;
            }
        }

        let db = await getDb();
        let scan = await db.collection('scans').findOne({id: scanId});
        let searchPipeline = [
            { $addFields: { _fullName:
                    { $concat: [
                            { $cond: { if: Boolean("$scanUser.last_name"), then: "$scanUser.last_name", else: "" } }, " ",
                            { $cond: { if: Boolean("$scanUser.first_name"), then: "$scanUser.first_name", else: "" } }, " ",
                            { $cond: { if: Boolean("$scanUser.username"), then: "$scanUser.username", else: "" } }
                        ]
                    }
            } },
            { $match: filter },
            { $unset: ["_fullName"] },
        ];

        let pipeline = searchPipeline.concat([
            { $sort: sort },
            { $skip: offset }
        ]);

        if (limit !== -1) {
            pipeline.push({ $limit: limit });
        }

        let countPipeline = searchPipeline.concat([
            {$count: "totalCount"}
        ]);

        let cards = await db.collection('scan_results').aggregate(pipeline).toArray();
        let countResults = await db.collection('scan_results').aggregate(countPipeline).toArray();
        let totalCount = countResults && countResults[0] && countResults[0].totalCount
            ? countResults[0].totalCount
            : 0;

        ctx.body = {scan, cards, totalCount};
    },
    async add(ctx) {
        let user = ctx.request.body.user;
        let tgPhone = user && user.telegram && user.telegram.authPhone
            ? user.telegram.authPhone
            : false;

        let itemFields = ctx.request.body[ITEM_NAME];
        if (itemFields._id) {
            let response = {};
            response[ITEM_NAME] = false;

            ctx.body = response;
            return;
        }

        itemFields = Object.assign(itemFields, {
            id: shortid.generate(),
            created: moment().unix(),
            updated: moment().unix(),
            status: 'new',
            user
        });

        const db = await getDb();
        let result = await db.collection(COLLECTION_NAME).insertOne(itemFields);
        let scan = result.ops[0];

        let job = scanQueue.createJob({scan, user, tgPhone});
        await job.save();

        delete job.data;
        delete job.queue;
        await db.collection(COLLECTION_NAME).updateOne({id: scan.id}, {$set: {job}});
        scan = await db.collection(COLLECTION_NAME).findOne({id: scan.id});

        let response = {};
        response[ITEM_NAME] = scan;
        response.job = job;

        ctx.body = response;
    },
    async update(ctx) {
        const db = await getDb();

        let user = ctx.request.body.user;
        let itemFields = ctx.request.body[ITEM_NAME];
        let id = itemFields.id;

        if (itemFields._id) {
            delete itemFields._id;
        }

        itemFields = Object.assign(itemFields, {
            updated: moment().unix(),
            user
        });

        let updateResult = await db.collection(COLLECTION_NAME).findOneAndReplace({id}, itemFields, {returnOriginal: false});
        let item = updateResult.value || false;
        let response = {};
        response[ITEM_NAME] = item;

        ctx.body = response;
    },
    async delete(ctx) {
        const db = await getDb();

        let itemFields = ctx.request.body[ITEM_NAME];
        let id = itemFields.id;

        let updateResult = await db.collection(COLLECTION_NAME).findOneAndUpdate({id}, {$set: {deleted: moment().unix()}}, {returnOriginal: false});
        let item = updateResult.value || false;
        let response = {};
        response[ITEM_NAME] = item;

        ctx.body = response;
    }
}