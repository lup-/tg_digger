<template>
    <v-container class="fill-height align-start">
        <v-row align="start" justify="start">
            <v-col cols="12">
                <v-text-field
                        v-model="search"
                        solo
                        clearable
                        label="Поиск"
                        append-outer-icon="mdi-magnify"
                        @click:append-outer="getDataFromApi"
                ></v-text-field>
            </v-col>
            <v-col cols="12">
                <v-data-table
                        dense
                        :headers="headers"
                        :items="items"
                        :loading="loading"
                        :options.sync="options"
                        :server-items-length="totalItems"
                        :items-per-page="50"
                >
                    <template v-slot:item.skills="{ item }">
                        <skill-chip v-for="skill in item.skills" :key="skill.name" :skill="skill" small class="mr-2"></skill-chip>
                    </template>
                    <template v-slot:item.actions="{ item }">
                        <v-btn icon small @click="editItem(item)"><v-icon>mdi-pencil</v-icon></v-btn>
                        <v-btn icon small class="mr-6" @click="completeItem(item)"><v-icon>mdi-flag-checkered</v-icon></v-btn>
                        <v-btn icon small color="red" @click="deleteItem(item)"><v-icon>mdi-delete</v-icon></v-btn>
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
                    <span class="headline">{{editedItem.src}}</span>
                </v-card-title>
                <v-card-text>
                    <skill-detection-dialog v-model="editedItem" @unsaved="setUnsaved"></skill-detection-dialog>
                </v-card-text>
                <v-card-actions>
                    <v-btn text @click="close">Отмена</v-btn>
                    <v-spacer></v-spacer>
                    <v-btn @click="save" :disabled="unsaved">Сохранить</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

    </v-container>
</template>

<script>
    import axios from "axios";
    import debounce from "lodash.debounce";
    import SkillChip from "@/components/Skills/SkillChip";
    import SkillDetectionDialog from "@/components/Skills/SkillDetectionDialog";

    export default {
        components: {SkillDetectionDialog, SkillChip},
        data() {
            return {
                items: [],
                totalItems: 0,
                defaultItem: {},
                editedIndex: null,
                editedItem: null,

                editDialog: false,
                deleteDialog: false,

                loading: false,
                unsaved: false,
                options: {},

                search: '',

                headers: [
                    {text: 'Исходная запись', value: 'src', width: '40%'},
                    {text: 'Навыки', value: 'skills', width: '40%'},
                    {text: 'Действия', value: 'actions', sortable: false, width: '20%'},
                ],
            }
        },
        watch: {
            options: {
                handler () {
                    this.getDataFromApi();
                },
                deep: true,
            },
            search() {
                this.getDataFromApi();
            }
        },
        mounted () {
            this.getDataFromApi();
        },
        methods: {
            setUnsaved(newUnsaved) {
                this.unsaved = newUnsaved;
            },

            getDataFromApi: debounce(async function() {
                if (this.loading) {
                    return;
                }

                this.loading = true;
                const { page, itemsPerPage } = this.options;
                //sortBy, sortDesc,

                let filter = {};
                if (this.search) {
                    filter = { $text: { $search: this.search } };
                }

                let request = {
                    filter,
                    limit: itemsPerPage,
                    offset: (page - 1) * itemsPerPage,
                }

                try {
                    let {data} = await axios.post('/api/skills/listRaw', request);
                    this.items = data.rawSkills;
                    this.totalItems = data.rawSkillsCount;
                }
                finally {
                    this.loading = false;
                }
            }, 300),

            editItem(item) {
                this.editedIndex = this.items.indexOf(item);
                this.editedItem = Object.assign({}, item);
                this.editDialog = true;
            },

            async deleteItem(skill) {
                let deletedIndex = this.items.indexOf(skill);
                try {
                    await axios.post('/api/skills/delete', {skill});
                    this.items.splice(deletedIndex, 1);
                }
                catch (e) {
                    this.$store.commit('setErrorMessage', 'Ошибка удаления навыка: ' + e.toString());
                }
            },

            async completeItem(skill) {
                let completeIndex = this.items.indexOf(skill);
                try {
                    await axios.post('/api/skills/complete', {skill});
                    this.items.splice(completeIndex, 1);
                }
                catch (e) {
                    this.$store.commit('setErrorMessage', 'Ошибка закрытия навыка: ' + e.toString());
                }
            },

            close() {
                this.editDialog = false;
                this.unsaved = false;
                this.editedItem = null;
                this.editedIndex = null;
            },

            async save() {
                if (this.editedIndex !== null) {
                    try {
                        let editedItem = Object.assign({}, this.editedItem);
                        await axios.post('/api/skills/update', {skill: editedItem});
                        this.items[this.editedIndex] = editedItem;
                    }
                    catch (e) {
                        this.$store.commit('setErrorMessage', 'Ошибка сохранения: ' + e.toString());
                    }
                }
                else {
                    this.items.push(this.editedItem);
                }
                this.close();
                return this.getDataFromApi();
            },
        },
        computed: {

        }
    }
</script>