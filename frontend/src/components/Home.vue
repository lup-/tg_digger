<template>
    <v-container class="fill-height align-center justify-center">
        <v-card>
            <v-card-text>
                Добро пожаловать!
            </v-card-text>
            <v-card-text v-if="!isReady">
                <p>Для работы со сканером, необходимо подключить Telegram</p>
                <v-btn color="success" @click="connect">Подключить</v-btn>
            </v-card-text>

        </v-card>
    </v-container>
</template>

<script>
    export default {
        methods: {
            connect() {
                this.$router.push({name: 'settings'});
            },
        },
        computed: {
            isReady() {
                return this.$store.state.telegram.ready;
            }
        }
    }
</script>