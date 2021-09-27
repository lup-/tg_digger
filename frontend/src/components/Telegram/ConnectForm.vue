

<template>
    <form width="500">
        <v-card>
            <v-card-title>Подключение к Telegram</v-card-title>

            <v-card-text v-if="isNotConnected">
                <form :autocomplete="getRandomId()" class="mb-2">
                    <v-text-field
                        v-model="phone"
                        label="Телефон для входа в Telegram"
                        hint="В формате +7 999 123-45-67"
                        :id="getRandomId()"
                        autocomplete="telegram-id"
                        persistent-hint
                        outlined
                    ></v-text-field>
                </form>
                <form :autocomplete="getRandomId()">
                    <v-text-field
                        v-model="password"
                        :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                        :type="showPassword ? 'text' : 'password'"
                        label="Пароль"
                        hint="Укажите пароль, если он есть. Если пароля нет, оставьте поле пустым."
                        persistent-hint
                        :id="getRandomId()"
                        autocomplete="telegram-hash"
                        outlined
                        @click:append="showPassword = !showPassword"
                    ></v-text-field>
                </form>
            </v-card-text>
            <v-card-text v-else-if="waitingForCode">
                <v-text-field v-if="!phone"
                    v-model="phone"
                    label="Телефон для входа в Telegram"
                    hint="В формате +7 999 123-45-67"
                    autocomplete="off"
                    persistent-hint
                    outlined
                ></v-text-field>
                <v-text-field
                    v-model="code"
                    label="Код"
                    outlined
                ></v-text-field>
            </v-card-text>
            <v-card-text v-else-if="isReady">
                <p>Telegram успешно подключен!</p>
            </v-card-text>
            <v-card-text v-else>
                Подождите...
            </v-card-text>
            <v-divider></v-divider>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" large @click="sendLogin" v-if="isNotConnected">Войти</v-btn>
                <v-btn color="primary" large @click="sendCode" v-else-if="waitingForCode">Отправить код</v-btn>
                <v-btn color="primary" large @click="logout" v-else-if="isReady">Отключить</v-btn>
            </v-card-actions>
        </v-card>
    </form>
</template>

<script>
export default {
    props: [],
    data() {
        return {
            showDialog: this.value,
            showPassword: false,
            phone: '',
            password: '',
            code: ''
        }
    },
    watch: {
        value() {
            if (this.showDialog !== this.value) {
                this.showDialog = this.value;
            }
        },
        showDialog() {
            if (this.showDialog !== this.value) {
                this.$emit('input', this.showDialog);
            }
        }
    },
    created() {
        if (this.user && this.user.telegram && this.user.telegram.authPhone) {
            this.phone = this.user.telegram.authPhone;
        }
    },
    methods: {
        getRandomId() {
            let id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
            return `random_${id}`;
        },
        async close() {
            this.$emit('close');
            this.showDialog = false;
        },
        async sendLogin() {
            return this.$store.dispatch('telegram/newClient', {
                phone: this.phone,
                password: this.password,
            });
        },
        async sendCode() {
            return this.$store.dispatch('telegram/sendCode', {
                phone: this.phone,
                code: this.code,
            });
        },
        async logout() {
            return this.$store.dispatch('telegram/logout');
        }
    },
    computed: {
        user() {
            return this.$store.state.user.current;
        },
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