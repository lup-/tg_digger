const axios = require("axios");

const TEXTRACTOR_URL = process.env.TEXTRACTOR_URL;

function countKeyword(str, keyword) {
    return str
        .toLocaleLowerCase()
        .split(' ')
        .filter(word => word === keyword.toLocaleLowerCase())
        .length;
}

module.exports = class Scanner {
    constructor(scan) {
        this.scan = scan;
        this.userStats = [];
    }

    getMessageStats(message) {
        let text = message.message ? message.message : '';
        let isQuestion = text.indexOf('?') !== -1;
        let isReply = message.reply_to ? 1 : 0;

        let keywordStats = null;
        if (this.scan.keywords && this.scan.keywords.length > 0) {
            keywordStats = {};
            for (let keyword of this.scan.keywords) {
                keywordStats[keyword] = countKeyword(text, keyword);
            }
        }

        let peers = [];
        if (message.reply_to) {
            peers.push(message.reply_to);
        }

        return {
            totalMessages: 1,
            totalQuestions: isQuestion ? 1 : 0,
            totalReplies: isReply ? 1 : 0,
            keywords: keywordStats,
            peers: peers
        }
    }

    findUserStats(searchUser) {
        return this.userStats.find(stat => stat.user.user_id === searchUser.user_id);
    }

    updateUserStats(searchUser, stats) {
        let statIndex = this.userStats.findIndex(stat => stat.user.user_id === searchUser.user_id);
        if (statIndex !== -1) {
            this.userStats[statIndex] = stats;
        }
        else {
            stats.user = searchUser;
            this.userStats.push(stats);
        }
    }

    addMessageStatsToUser(messageStats, user) {
        let userStats = this.findUserStats(user);
        if (!userStats) {
            userStats = {};
        }

        for (let key in messageStats) {
            if (messageStats[key] instanceof Array) {
                userStats[key] = userStats[key] || [];
                userStats[key] = userStats[key].concat(messageStats[key]);
            }
            else if (typeof(messageStats[key]) === 'object') {
                for (let subkey in messageStats[key]) {
                    userStats[key] = userStats[key] || {};
                    userStats[key][subkey] = userStats[key][subkey] || 0;
                    userStats[key][subkey] += messageStats[key][subkey];
                }
            }
            else {
                userStats[key] = userStats[key] || 0;
                userStats[key] += messageStats[key];
            }
        }

        this.updateUserStats(user, userStats);
    }

    countUniquePeers(stats) {
        return stats.map(stat => {
            let uniquePeers = stat.peers.filter((peerId, index, all) => all.indexOf(peerId) === index);
            stat.peers = uniquePeers.length;

            return stat;
        });
    }

    async findUserKeywords(stats, messages) {
        let userIds = stats.map(stat => stat.user.user_id);
        for (let userId of userIds) {
            let userMessages = messages.filter(message => message.from_id.user_id === userId);
            let messageTexts = userMessages.map(message => message.message ? message.message : '');

            let allMessagesAsText = messageTexts.join('\n\n');

            let {data} = await axios.post(TEXTRACTOR_URL + '/keywords', allMessagesAsText, {
                headers: { 'Content-Type': 'text/plain' }
            });

            let statIndex = stats.findIndex(stat => stat.user.user_id === userId);
            if (statIndex !== -1) {
                stats[statIndex].userKeywords = data.keywords;
            }
        }

        return stats;
    }

    async scanMessages(messages) {
        for (let message of messages) {
            let user = message.from_id;
            let messageStats = this.getMessageStats(message);

            if (user) {
                this.addMessageStatsToUser(messageStats, user);
            }
        }

        let stats = this.countUniquePeers(this.userStats);
        stats = await this.findUserKeywords(stats, messages);
        return stats;
    }
}