<template>
    <div>
        <v-tooltip bottom v-if="isNotConnected">
            <template v-slot:activator="{ on, attrs }">
                <v-btn icon color="error" @click="connect" v-bind="attrs" v-on="on"><v-icon>mdi-connection</v-icon></v-btn>
            </template>
            <span>Telegram не подключен</span>
        </v-tooltip>
        <v-tooltip bottom v-else-if="waitingForCode">
            <template v-slot:activator="{ on, attrs }">
                <v-btn icon color="danger" @click="connect" v-bind="attrs" v-on="on"><v-icon>mdi-progress-alert</v-icon></v-btn>
            </template>
            <span>Telegram ожидает ввода кода</span>
        </v-tooltip>
        <v-tooltip bottom v-else-if="isReady">
            <template v-slot:activator="{ on, attrs }">
                <v-btn icon color="success" v-bind="attrs" v-on="on"><v-icon>mdi-check</v-icon></v-btn>
            </template>
            <span>Telegram подключен</span>
        </v-tooltip>
        <v-btn icon color="secondary" @click="refresh" v-if="!isReady"><v-icon>mdi-refresh</v-icon></v-btn>
    </div>
</template>

<script>
export default {
    props: [],
    data() {
        return {
        }
    },
    methods: {
        connect() {
            this.$router.push({name: 'settings'});
        },
        refresh() {
            return this.$store.dispatch('telegram/refreshClient', {forceRefresh: true});
        }
    },
    computed: {
        isNotConnected() {
            return this.$store.state.telegram.started === false;
        },
        waitingForCode() {
            return this.$store.state.telegram.waiting;
        },
        isReady() {
            return this.$store.state.telegram.ready;
        }
    }
}
</script>

<style scoped>

</style>