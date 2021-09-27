<template>
    <v-container class="pa-0">
        <v-row>
            <v-col cols="12" md="12">
                <v-text-field
                    v-model="item.title"
                    hide-details
                    label="Название"
                ></v-text-field>
                <v-select
                    class="mb-8"
                    v-model="item.scanDepth"
                    label="Глубина сканирования"
                    :items="depths"
                ></v-select>
                <v-autocomplete
                    v-model="item.chats"
                    :items="chats"
                    label="Чаты для сканирования"
                    :loading="chatsLoading"
                    item-text="title"
                    item-value="id"
                    return-object
                    chips
                    deletable-chips
                    multiple
                    hide-details
                ></v-autocomplete>
                <v-combobox
                    v-model="item.keywords"
                    label="Ключевые слова для поиска"
                    hint="Нажмите Enter, чтобы добавить ключевое слово"
                    multiple
                    chips
                    deletable-chips
                    persistent-hint
                ></v-combobox>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
export default {
    props: ['value'],
    data() {
        return {
            item: Object.assign({}, this.value || {}),
            chats: [],
            chatsLoading: false,
            depths: [
                {text: '1 день', value: 'd'},
                {text: '1 неделя', value: 'w'},
                {text: '1 месяц', value: 'm'},
                {text: '1 год', value: 'y'},
            ]
        }
    },
    watch: {
        item: {
            deep: true,
            handler() {
                this.emitUpdates();
            }
        }
    },
    created() {
        this.loadChats();
    },
    methods: {
        emitUpdates() {
            this.$emit('input', this.item);
        },
        async loadChats() {
            this.chatsLoading = true;
            this.chats = await this.$store.getters['telegram/getChats']();
            this.chatsLoading = false;
        }
    },
    computed: {
        autocompleteChats() {
            return this.chats.map(chat => ({
                text: chat.title,
                value: chat.id,
            }));
        }
    }
}
</script>

<style scoped>

</style>