const {getDb} = require('../modules/Database');
const ObjectId = require('mongodb').ObjectId;
const moment = require('moment');

const COLLECTION_NAME = 'skills_dataset';
const ITEM_NAME = 'skill';
const ITEMS_NAME = 'skills';

module.exports = {
    async listRaw(ctx) {
        let inputFilter = ctx.request.body && ctx.request.body.filter
            ? ctx.request.body.filter || {}
            : {};
        let limit = ctx.request.body.limit ? parseInt(ctx.request.body.limit) : 50;
        let offset = ctx.request.body.offset ? parseInt(ctx.request.body.offset) : 0;

        let defaultFilter = {
            'completed': {$in: [null, false]},
            'deleted': {$in: [null, false]}
        };

        let filter = Object.assign(defaultFilter, inputFilter);

        let db = await getDb();
        let items = await db.collection(COLLECTION_NAME).aggregate([
            { $match: filter },
            { $sort: {_id: 1} },
            { $skip: offset },
            { $limit: limit },
            { $lookup: {
                    from: 'skills',
                    localField: 'skills',
                    foreignField: '_id',
                    as: 'skills'
                } },
            { $project: {"doc": "$$ROOT", "skills": "$skills"} },
            { $unwind: {path: "$skills", preserveNullAndEmptyArrays: true} },
            { $lookup: {
                    from: 'groups',
                    localField: 'skills.groups',
                    foreignField: '_id',
                    as: 'skills.groups'
                } },
            { $group: {"_id": "$_id", doc: {$first: "$doc"}, skills: {$addToSet: "$skills"}} },
            { $project: {"doc": 1, "firstSkill": {$arrayElemAt: ["$skills", 0]}, skills: 1 }},
            { $project: {"doc": 1, "skills": { "$cond": [{$eq: [{$type: "$firstSkill._id"}, "missing"]}, "$$REMOVE", "$skills" ]} }},
            { $set: {"doc.skills": "$skills"} },
            { $replaceRoot: {newRoot: "$doc"} },
        ]).toArray();

        let rawSkillsCount = await db.collection(COLLECTION_NAME).countDocuments(filter);

        ctx.body = {
            rawSkills: items,
            rawSkillsCount
        };
    },
    async listSkills(ctx) {
        let query = ctx.request.body.query || '';
        let limit = ctx.request.body.limit || 20;

        let db = await getDb();
        let skills = await db.collection('skills').aggregate([
            { $match: {name : {$regex : `.*${query}.*`, $options: "i"}, deleted: {$in: [null, false]}} },
            { $limit: limit },
            { $lookup: {
                from: 'groups',
                localField: 'groups',
                foreignField: '_id',
                as: 'groups'
            } },
        ]).toArray();

        ctx.body = {
            skills
        }
    },
    async listGroups(ctx) {
        let query = ctx.request.body.query || '';
        let limit = ctx.request.body.limit || 20;

        let db = await getDb();
        let groups = await db.collection('groups').find({name : {$regex : `.*${query}.*`, $options: "i"}, deleted: {$in: [null, false]}}).limit(limit).toArray();
        ctx.body = {
            groups
        }
    },
    async update(ctx) {
        const db = await getDb();

        let itemFields = ctx.request.body[ITEM_NAME];
        let _id = new ObjectId(itemFields._id);
        delete itemFields._id;

        itemFields = Object.assign(itemFields, {
            updated: moment().unix(),
        });

        let skills = itemFields.skills || [];
        let groups = skills && skills.length > 0
            ? skills
                .reduce((groups, skill) => groups.concat(skill.groups || []), [])
                .filter((name, index, all) => all.indexOf(name) === index)
            : [];

        if (groups.length > 0) {
            let newGroups = groups.filter(group => !group._id);
            if (newGroups.length > 0) {
                let insertResult = await db.collection('groups').insertMany(newGroups);
                let insertedGroups = insertResult.ops;
                groups = groups.map(group => {
                    if (!group._id) {
                        let inserted = insertedGroups.find(newGroup => newGroup.name === group.name);
                        return inserted;
                    }

                    return group;
                })
            }
        }

        if (skills.length > 0) {
            let skillsWithGroupsReplacedToIds = skills.map(skill => {
                if (skill.groups && skill.groups.length > 0) {
                    skill.groups = skill.groups
                        .map(group => {
                            return typeof (group._id) === 'string'
                                ? new ObjectId(group._id)
                                : group._id;
                        })
                        .filter(group => typeof (group) !== "undefined" && group !== null);
                }

                return skill;
            });

            let oldSkills = skillsWithGroupsReplacedToIds.filter(skill => Boolean(skill._id));
            let newSKills = skillsWithGroupsReplacedToIds.filter(skill => !Boolean(skill._id));
            let newSkillIds = [];

            if (newSKills.length > 0) {
                let insertResult = await db.collection('skills').insertMany(newSKills);
                newSkillIds = insertResult.ops
                    ? insertResult.ops.map(skill => skill._id)
                    : [];
            }

            if (oldSkills.length > 0) {
                for (let oldSkill of oldSkills) {
                    let _id = new ObjectId(oldSkill._id);
                    let oldSkillFields = Object.assign({}, oldSkill);
                    delete oldSkillFields._id;

                    await db.collection('skills').updateOne({_id}, {$set: oldSkillFields});
                }
            }

            let skillIds = oldSkills.map(oldSkill => new ObjectId(oldSkill._id)).concat(newSkillIds);
            itemFields.skills = skillIds;
        }

        await db.collection(COLLECTION_NAME).updateOne({_id}, {$set: itemFields});
        let item = await db.collection(COLLECTION_NAME).findOne({_id});
        let response = {};
        response[ITEM_NAME] = item;

        ctx.body = response;
    },
    async delete(ctx) {
        const db = await getDb();

        let itemFields = ctx.request.body[ITEM_NAME];
        let _id = new ObjectId(itemFields._id);

        let updateResult = await db.collection(COLLECTION_NAME).findOneAndUpdate({_id}, {$set: {deleted: moment().unix()}}, {returnOriginal: false});
        let item = updateResult.value || false;
        let response = {};
        response[ITEM_NAME] = item;

        ctx.body = response;
    },
    async complete(ctx) {
        const db = await getDb();

        let itemFields = ctx.request.body[ITEM_NAME];
        let _id = new ObjectId(itemFields._id);

        let updateResult = await db.collection(COLLECTION_NAME).findOneAndUpdate({_id}, {$set: {completed: moment().unix()}}, {returnOriginal: false});
        let item = updateResult.value || false;
        let response = {};
        response[ITEM_NAME] = item;

        ctx.body = response;
    }
}