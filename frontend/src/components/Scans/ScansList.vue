<template>
    <v-container class="fill-height align-start">
        <v-row align="start" justify="start">
            <v-btn fab bottom right fixed large color="primary" @click="newItem">
                <v-icon>mdi-plus</v-icon>
            </v-btn>

            <v-col cols="12">
                <v-card v-if="items.length === 0 && !loading"
                    class="mt-8"
                >
                    <v-card-title><v-icon class="mr-2" color="black">mdi-magnify-scan</v-icon> Создайте первое сканирование</v-card-title>
                    <v-card-text>
                        <p>Чтобы понять кто есть кто в чате, нужно создать сканирование.</p>
                        <p>Сканирование загрузит все сообщения выбранных чатов и соберет по ним интересные данные.</p>
                    </v-card-text>
                    <v-card-actions>
                        <v-btn large color="primary" @click="newItem">Создать сканирование</v-btn>
                    </v-card-actions>
                </v-card>
                <v-data-table v-else
                    dense
                    :headers="headers"
                    :items="items"
                    :loading="loading"
                    :options.sync="options"
                    :server-items-length="totalItems"
                    :items-per-page="15"
                    multi-sort
                    item-key="_id"
                    locale="ru"
                >
                    <template v-slot:item.created="{item}">
                        {{getDate(item.created)}}
                    </template>
                    <template v-slot:item.chats="{item}">
                        {{item.chats ? item.chats.map(chat => chat.title).join(', ') : ''}}
                    </template>
                    <template v-slot:item.actions="{ item }">
                        <v-btn icon small @click="editItem(item)"><v-icon>mdi-pencil</v-icon></v-btn>
                        <v-btn icon small color="red" @click="deleteItem(item)"><v-icon>mdi-delete</v-icon></v-btn>
                        <v-btn icon small @click="gotoDetails(item)" v-if="isFinished(item)"><v-icon>mdi-eye</v-icon></v-btn>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>

        <v-dialog
            v-model="editDialog"
            max-width="600px"
        >
            <v-card v-if="editedItem">
                <v-card-title>
                    <span class="headline">{{editedItem.title || 'Новое сканирование'}}</span>
                </v-card-title>
                <v-card-text>
                    <scan-edit-form v-model="editedItem" @unsaved="setUnsaved"></scan-edit-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn text small @click="close">Отмена</v-btn>
                    <v-btn color="primary" @click="saveItem" :disabled="unsaved">Сохранить</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<script>
    import ScanEditForm from "@/components/Scans/ScanEditForm";
    import moment from "moment";

    export default {
        components: {ScanEditForm},
        data() {
            return {
                defaultItem: {},
                editedIndex: null,
                editedItem: null,

                editDialog: false,
                deleteDialog: false,

                loading: false,
                unsaved: false,
                options: {
                    sortBy: ['created'],
                    sortDesc: [true],
                    itemsPerPage: 15,
                },
                filter: {},

                headers: [
                    {text: 'Дата', value: 'created'},
                    {text: 'Название', value: 'title'},
                    {text: 'Ключевые слова', value: 'keywords'},
                    {text: 'Чаты', value: 'chats'},
                    {text: 'Статус', value: 'status'},
                    {text: 'Действия', value: 'actions', sortable: false, width: '20%'},
                ],
            }
        },
        watch: {
            filter: {
                deep: true,
                handler() {
                    this.loadItems();
                }
            },
            options: {
                deep: true,
                handler() {
                    this.loadItems();
                }
            }
        },
        mounted () {
            this.loadItems();
        },
        methods: {
            async loadItems() {
                this.loading = true;
                let sort = this.options.sortBy && this.options.sortBy.length > 0
                    ? this.options.sortBy.reduce((sortFields, fieldId, index) => {
                        let isDesc = this.options.sortDesc[index];
                        sortFields[fieldId] = isDesc ? -1 : 1;
                        return sortFields;
                    }, {})
                    : {};
                let limit = this.options.itemsPerPage || 15;
                let page = this.options.page || 1;
                let offset = (page-1)*limit;

                await this.$store.dispatch('scan/loadItems', {filter: {}, sort, limit, offset});
                this.loading = false;
            },
            deleteItem(item) {
                this.$store.dispatch('scan/deleteItem', item);
            },
            editItem(item) {
                this.editedItem = Object.assign({}, item);
                this.editDialog = true;
            },
            newItem() {
                this.editedItem = Object.assign({}, this.defaultItem);
                this.editDialog = true;
            },
            getDate(value) {
                return moment.unix(value).format('DD.MM.YYYY');
            },

            close() {
                this.editDialog = false;
                this.editedItem = null;
            },

            async saveItem() {
                this.editDialog = false;

                if (this.editedItem !== null) {
                    let saveAction = this.isNewEditing ? 'scan/newItem' : 'scan/saveItem';
                    await this.$store.dispatch(saveAction, this.editedItem);
                    this.editedItem = null;
                }

                return this.loadItems();
            },

            setUnsaved(newUnsaved) {
                this.unsaved = newUnsaved;
            },

            gotoDetails(scan) {
                this.$router.push({name: 'scanDetails', params: {id: scan.id}});
            },

            isFinished(scan) {
                return scan.status === 'finished' && scan.finished > 0;
            },
        },
        computed: {
            isNewEditing() {
                return this.editedItem && !this.editedItem._id;
            },
            items() {
                return this.loading
                    ? []
                    : this.$store.state.scan.list;
            },
            totalItems() {
                return this.$store.state.scan.totalCount;
            }
        }
    }
</script>